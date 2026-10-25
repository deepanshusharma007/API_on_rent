"""Circuit breaker service for provider health monitoring."""
from typing import Optional
from backend.config import settings
from backend.database.redis_manager import RedisManager


class CircuitBreakerService:
    """Circuit breaker pattern implementation for API providers."""
    
    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager
        self.failure_threshold = settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD
        self.timeout_seconds = settings.CIRCUIT_BREAKER_TIMEOUT_SECONDS
    
    async def is_available(self, provider: str) -> bool:
        """Check if provider is available (circuit not open)."""
        state = await self.redis.get_circuit_breaker_state(provider)
        return state != "open"
    
    async def is_provider_available(self, provider: str) -> bool:
        """Check if provider is available (alias for is_available)."""
        return await self.is_available(provider)
    
    async def record_success(self, provider: str, error_msg: Optional[str] = None):
        """Record successful request."""
        await self.redis.reset_failure_count(provider)
        await self.redis.close_circuit_breaker(provider)
    
    async def record_failure(self, provider: str, error_msg: Optional[str] = None):
        """Record failed request and trip circuit if threshold reached."""
        count = await self.redis.increment_failure_count(provider)
        
        if count >= self.failure_threshold:
            await self.redis.trip_circuit_breaker(provider, self.timeout_seconds)
    
