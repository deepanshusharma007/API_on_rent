"""Redis operations manager for caching, rate limiting, and state management."""
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from backend.config import settings

# Import Redis (real or fake based on config)
if settings.USE_FAKE_REDIS:
    import fakeredis.aioredis as redis
else:
    import redis.asyncio as redis


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
    
    async def set_token_balance(self, rental_id: int, balance: int):
        """Set token balance for rental."""
        key = f"balance:{rental_id}"
        await self.redis.set(key, balance)
    
    async def deduct_tokens(self, rental_id: int, tokens: int) -> int:
        """Atomically deduct tokens and return new balance."""
        key = f"balance:{rental_id}"
        return await self.redis.decrby(key, tokens)
    
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
        """Check if request is within RPM limit. Returns True if allowed."""
        key = f"rpm:{rental_id}"
        current = await self.redis.get(key)
        
        if current is None:
            # First request in this minute
            await self.redis.setex(key, 60, 1)
            return True
        
        current_count = int(current)
        if current_count >= rpm_limit:
            return False
        
        await self.redis.incr(key)
        return True
    
    # ==================== IP Pinning ====================
    
    async def get_pinned_ip(self, rental_id: int) -> Optional[str]:
        """Get pinned IP address for rental."""
        key = f"ip:{rental_id}"
        return await self.redis.get(key)
    
    async def set_pinned_ip(self, rental_id: int, ip_address: str):
        """Pin IP address to rental."""
        key = f"ip:{rental_id}"
        await self.redis.set(key, ip_address)
    
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
        await self.redis.expire(key, 300)  # Reset after 5 minutes
        return count
    
    async def reset_failure_count(self, provider: str):
        """Reset failure count for provider."""
        key = f"failures:{provider}"
        await self.redis.delete(key)
    
    # ==================== Semantic Cache ====================
    
    async def get_cached_response(self, prompt_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached AI response by prompt hash."""
        key = f"cache:{prompt_hash}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def set_cached_response(self, prompt_hash: str, response_data: Dict[str, Any], ttl_seconds: int = 300):
        """Cache AI response with TTL."""
        key = f"cache:{prompt_hash}"
        await self.redis.setex(key, ttl_seconds, json.dumps(response_data))
    
    async def store_prompt_embedding(self, prompt_hash: str, embedding: List[float]):
        """Store prompt embedding for similarity search."""
        key = f"embedding:{prompt_hash}"
        await self.redis.set(key, json.dumps(embedding))
    
    async def get_all_prompt_embeddings(self) -> Dict[str, List[float]]:
        """Get all stored prompt embeddings for similarity comparison."""
        pattern = "embedding:*"
        embeddings = {}
        
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
            for key in keys:
                data = await self.redis.get(key)
                if data:
                    prompt_hash = key.decode('utf-8').replace('embedding:', '')
                    embeddings[prompt_hash] = json.loads(data)
            
            if cursor == 0:
                break
        
        return embeddings
    
    # ==================== Spending Tracking ====================
    
    async def add_spending(self, user_id: int, amount_usd: float):
        """Add spending to user's rolling window."""
        key = f"spending:{user_id}"
        timestamp = datetime.utcnow().timestamp()
        await self.redis.zadd(key, {str(timestamp): amount_usd})
        await self.redis.expire(key, 600)  # 10 minutes
    
    async def get_spending_in_window(self, user_id: int, window_minutes: int = 10) -> float:
        """Get total spending in the last N minutes."""
        key = f"spending:{user_id}"
        cutoff = (datetime.utcnow() - timedelta(minutes=window_minutes)).timestamp()
        
        # Remove old entries
        await self.redis.zremrangebyscore(key, 0, cutoff)
        
        # Sum remaining entries
        entries = await self.redis.zrange(key, 0, -1, withscores=True)
        total = sum(score for _, score in entries)
        return total
    
    # ==================== Session Management ====================
    
    async def set_session(self, session_id: str, user_data: Dict[str, Any], ttl_seconds: int = 86400):
        """Set user session data."""
        key = f"session:{session_id}"
        await self.redis.setex(key, ttl_seconds, json.dumps(user_data))
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get user session data."""
        key = f"session:{session_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def delete_session(self, session_id: str):
        """Delete user session."""
        key = f"session:{session_id}"
        await self.redis.delete(key)


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
    global redis_client
    if redis_client:
        await redis_client.close()


def get_redis_manager() -> RedisManager:
    """Dependency for getting Redis manager."""
    if redis_manager is None:
        raise RuntimeError("Redis manager not initialized")
    return redis_manager
