"""Redis operations manager for caching, rate limiting, and state management."""
import json
from typing import Optional, Dict, Any
from datetime import datetime
from backend.config import settings

# Import Redis (real or fake based on config)
if settings.USE_FAKE_REDIS:
    import fakeredis.aioredis as redis
else:
    import redis.asyncio as redis


BALANCE_TTL_SECONDS = 2 * 86400

# Admin kill-switch: models in this set are refused by the proxy. A "disabled" set (rather
# than an "enabled" one) means an empty or missing set is safe: everything is on by default.
DISABLED_MODELS_KEY = "gateway:disabled_models"


class RedisManager:
    """Centralized Redis operations manager."""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    # ==================== Virtual Key TTL Management ====================
    
    async def set_virtual_key_ttl(self, virtual_key: str, expires_at: datetime, rental_data: Dict[str, Any]):
        """Set virtual key with TTL and associated rental data."""
        ttl_seconds = int((expires_at - datetime.utcnow()).total_seconds())
        if ttl_seconds > 0:
            key = f"vkey:{virtual_key}"
            await self.redis.setex(key, ttl_seconds, json.dumps(rental_data))
    
    async def get_virtual_key_data(self, virtual_key: str) -> Optional[Dict[str, Any]]:
        """Get rental data for virtual key."""
        key = f"vkey:{virtual_key}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def get_virtual_key_ttl(self, virtual_key: str) -> int:
        """Get remaining TTL for virtual key in seconds."""
        key = f"vkey:{virtual_key}"
        return await self.redis.ttl(key)
    
    async def delete_virtual_key(self, virtual_key: str):
        """Delete virtual key (e.g., on suspension)."""
        key = f"vkey:{virtual_key}"
        await self.redis.delete(key)
    
    # ==================== Token Balance Management ====================
    
    async def get_token_balance(self, rental_id: int) -> int:
        """Get remaining token balance for rental."""
        key = f"balance:{rental_id}"
        balance = await self.redis.get(key)
        return int(balance) if balance else 0
    
    async def get_live_balance(self, rental_id: int, fallback: int) -> int:
        """Current balance, or `fallback` when Redis no longer has one for this rental."""
        value = await self.redis.get(f"balance:{rental_id}")
        return int(value) if value is not None else fallback

    async def set_token_balance(self, rental_id: int, balance: int):
        """Set token balance for rental. Expires after 2 days (rentals last at most 24h)
        so balances of finished rentals don't pile up in Redis."""
        key = f"balance:{rental_id}"
        await self.redis.set(key, balance, ex=BALANCE_TTL_SECONDS)
    
    async def deduct_tokens(self, rental_id: int, tokens: int) -> int:
        """Atomically deduct tokens and return new balance."""
        key = f"balance:{rental_id}"
        return await self.redis.decrby(key, tokens)
    
    # ==================== Disabled Models ====================

    async def get_disabled_models(self) -> set:
        """Model IDs the admin has switched off."""
        return set(await self.redis.smembers(DISABLED_MODELS_KEY))

    async def set_model_disabled(self, model_id: str, disabled: bool):
        if disabled:
            await self.redis.sadd(DISABLED_MODELS_KEY, model_id)
        else:
            await self.redis.srem(DISABLED_MODELS_KEY, model_id)

    # ==================== Suspended Users ====================

    async def block_user(self, user_id: int):
        """Mark a user suspended. The proxy refuses all of their keys (rental and internal)
        immediately, without having to find and delete each key."""
        await self.redis.set(f"blocked_user:{user_id}", "1")

    async def unblock_user(self, user_id: int):
        await self.redis.delete(f"blocked_user:{user_id}")

    async def is_user_blocked(self, user_id: int) -> bool:
        return bool(await self.redis.exists(f"blocked_user:{user_id}"))

    # ==================== Single-Device Session Management ====================

    async def set_user_session(self, user_id: int, session_id: str, ttl_seconds: int = 86400):
        """Store the active session ID for a user. Overwrites any previous session (forces logout on old device)."""
        key = f"session:{user_id}"
        await self.redis.setex(key, ttl_seconds, session_id)

    async def get_user_session(self, user_id: int) -> Optional[str]:
        """Get the current active session ID for a user."""
        key = f"session:{user_id}"
        data = await self.redis.get(key)
        return data.decode() if isinstance(data, bytes) else data

    async def delete_user_session(self, user_id: int):
        """Delete the active session (logout)."""
        key = f"session:{user_id}"
        await self.redis.delete(key)

    # ==================== Rate Limiting (RPM) ====================
    
    async def check_rate_limit(self, rental_id: int, rpm_limit: int) -> bool:
        """Check if request is within RPM limit. Returns True if allowed.

        Fixed 60s window: the expiry is set only when the window opens, so a
        client that keeps sending cannot keep the counter alive forever.
        """
        return await self.hit_limit(f"rpm:{rental_id}", rpm_limit, 60)

    async def hit_limit(self, key: str, limit: int, window_seconds: int) -> bool:
        """Count one hit in a fixed window. Returns True while the count is within `limit`."""
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        current_count, ttl = await pipe.execute()
        if current_count == 1 or ttl < 0:
            # New window, or a key that lost its expiry (crash between INCR and EXPIRE).
            await self.redis.expire(key, window_seconds)
        return current_count <= limit

    async def hits_in_window(self, key: str) -> int:
        """Current count of a fixed-window counter without adding a hit."""
        value = await self.redis.get(key)
        return int(value) if value else 0
    
    # ==================== IP Pinning ====================
    
    async def pin_ip(self, rental_id: int, ip_address: str) -> str:
        """Atomically pin the IP on first use. Returns the IP the key is pinned to, which
        is `ip_address` for the first caller, so two parallel first requests can't both win."""
        key = f"ip:{rental_id}"
        await self.redis.set(key, ip_address, nx=True, ex=BALANCE_TTL_SECONDS)
        return await self.redis.get(key)
    
    # ==================== Circuit Breaker State ====================
    
    async def get_circuit_breaker_state(self, provider: str) -> str:
        """Get circuit breaker state (open/closed/half_open)."""
        key = f"circuit:{provider}"
        state = await self.redis.get(key)
        return state if state else "closed"
    
    async def trip_circuit_breaker(self, provider: str, timeout_seconds: int = 60):
        """Trip circuit breaker for provider."""
        key = f"circuit:{provider}"
        await self.redis.setex(key, timeout_seconds, "open")
    
    async def close_circuit_breaker(self, provider: str):
        """Close circuit breaker (recovery)."""
        key = f"circuit:{provider}"
        await self.redis.delete(key)
    
    async def increment_failure_count(self, provider: str) -> int:
        """Increment failure count for provider. Returns new count."""
        key = f"failures:{provider}"
        count = await self.redis.incr(key)
        if count == 1 or await self.redis.ttl(key) < 0:
            await self.redis.expire(key, 300)  # Window of 5 minutes from the first failure
        return count
    
    async def reset_failure_count(self, provider: str):
        """Reset failure count for provider."""
        key = f"failures:{provider}"
        await self.redis.delete(key)
    
    # ==================== Response Cache ====================
    
# Global Redis manager instance (initialized in main.py)
redis_manager: Optional[RedisManager] = None
redis_client = None


async def init_redis():
    """Initialize Redis client and manager with connection pooling."""
    global redis_manager, redis_client
    
    if settings.USE_FAKE_REDIS:
        # Use FakeRedis for development
        redis_client = redis.FakeRedis(decode_responses=True)
    else:
        # Use real Redis with connection pooling
        pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
        redis_client = redis.Redis(connection_pool=pool)
    
    redis_manager = RedisManager(redis_client)


async def close_redis():
    """Close Redis connection."""
    if redis_client:
        await redis_client.close()


def get_redis_manager() -> RedisManager:
    """Dependency for getting Redis manager."""
    if redis_manager is None:
        raise RuntimeError("Redis manager not initialized")
    return redis_manager
