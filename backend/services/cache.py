"""Semantic cache service — shared, Redis-backed, SHA256-keyed."""
import hashlib
import json
import logging
from typing import Optional
from backend.database.redis_manager import RedisManager

logger = logging.getLogger(__name__)

# TTL per provider family (seconds)
CACHE_TTL = {
    "openai":    3600,   # 1 hour
    "anthropic": 7200,   # 2 hours
    "gemini":    1800,   # 30 minutes
    "default":   3600,
}


# Request parameters that change the model output, so they must be part of the cache key.
CACHE_PARAMS = ("max_tokens", "temperature", "top_p", "stop", "presence_penalty", "frequency_penalty",
                "seed", "response_format", "tools", "tool_choice", "parallel_tool_calls",
                "logit_bias", "logprobs", "top_logprobs")


def _cache_key(model: str, messages: list, body: dict, user_id) -> Optional[str]:
    """
    Deterministic key scoped to one user and the full request: model, every message
    (system prompt and history included) and the parameters that change the output.
    Returns None if the last message is absent or ambiguous.
    """
    user_messages = [m for m in messages if m.get("role") == "user"]
    if not user_messages:
        return None
    last_content = user_messages[-1].get("content", "")
    if not isinstance(last_content, str) or not last_content.strip():
        return None
    params = {k: body[k] for k in CACHE_PARAMS if body.get(k) is not None}
    raw = json.dumps({"u": user_id, "m": model.lower(), "msgs": messages, "p": params},
                     sort_keys=True, default=str)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return f"cache:v2:{digest}"


def _should_cache(body: dict) -> bool:
    """Only cache deterministic requests: temperature explicitly 0. An unset temperature
    means the provider default (1.0 for OpenAI), i.e. a different answer each time, and
    replaying one of them for an hour would be wrong."""
    if body.get("stream"):
        return False
    return body.get("temperature") == 0


class GatewayCache:
    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager

    async def get(self, model: str, messages: list, body: dict, user_id=None) -> Optional[dict]:
        if not _should_cache(body):
            return None
        key = _cache_key(model, messages, body, user_id)
        if not key:
            return None
        try:
            raw = await self.redis.redis.get(key)
            if raw:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
        return None

    async def set(self, model: str, messages: list, body: dict, response: dict, user_id=None) -> bool:
        if not _should_cache(body):
            return False
        key = _cache_key(model, messages, body, user_id)
        if not key:
            return False
        from backend.services.router import infer_provider
        provider = infer_provider(model)
        ttl = CACHE_TTL.get(provider, CACHE_TTL["default"])
        try:
            await self.redis.redis.setex(key, ttl, json.dumps(response))
            logger.debug(f"Cache SET: {key} TTL={ttl}s")
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False

    async def get_stats(self) -> dict:
        """Return basic cache stats (key count by prefix)."""
        try:
            keys = await self.redis.redis.keys("cache:v2:*")
            return {"cached_entries": len(keys)}
        except Exception:
            return {"cached_entries": 0}

    async def flush(self) -> int:
        """Flush all cache entries. Returns number deleted."""
        try:
            keys = await self.redis.redis.keys("cache:v2:*")
            if keys:
                return await self.redis.redis.delete(*keys)
            return 0
        except Exception:
            return 0
