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


def _cache_key(model: str, messages: list) -> Optional[str]:
    """
    Build a deterministic cache key from model + last user message.
    Returns None if the last message is absent or ambiguous.
    """
    user_messages = [m for m in messages if m.get("role") == "user"]
    if not user_messages:
        return None
    last_content = user_messages[-1].get("content", "")
    if not isinstance(last_content, str) or not last_content.strip():
        return None
    raw = f"{model.lower()}::{last_content.strip()}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return f"cache:v1:{digest}"


def _should_cache(body: dict) -> bool:
    """Only cache deterministic requests (temperature=0 or not set)."""
    temp = body.get("temperature")
    return temp is None or temp == 0


class GatewayCache:
    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager

    async def get(self, model: str, messages: list, body: dict) -> Optional[dict]:
        if not _should_cache(body):
            return None
        key = _cache_key(model, messages)
        if not key:
            return None
        try:
            raw = await self.redis.redis_client.get(key)
            if raw:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
        return None

    async def set(self, model: str, messages: list, body: dict, response: dict) -> bool:
        if not _should_cache(body):
            return False
        key = _cache_key(model, messages)
        if not key:
            return False
        from backend.services.router import infer_provider
        provider = infer_provider(model)
        ttl = CACHE_TTL.get(provider, CACHE_TTL["default"])
        try:
            await self.redis.redis_client.setex(key, ttl, json.dumps(response))
            logger.debug(f"Cache SET: {key} TTL={ttl}s")
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False

    async def get_stats(self) -> dict:
        """Return basic cache stats (key count by prefix)."""
        try:
            keys = await self.redis.redis_client.keys("cache:v1:*")
            return {"cached_entries": len(keys)}
        except Exception:
            return {"cached_entries": 0}

    async def flush(self) -> int:
        """Flush all cache entries. Returns number deleted."""
        try:
            keys = await self.redis.redis_client.keys("cache:v1:*")
            if keys:
                return await self.redis.redis_client.delete(*keys)
            return 0
        except Exception:
            return 0
