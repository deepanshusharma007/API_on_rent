"""Provider health monitoring and status dashboard."""
from typing import Dict, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.models import CircuitBreakerEvent, UsageLog
from backend.database.redis_manager import RedisManager
from backend.services.circuit_breaker import CircuitBreakerService


class ProviderHealthMonitor:
    """Monitor and report on provider health metrics."""
    
    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager
        self.circuit_breaker = CircuitBreakerService(redis_manager)
    
    async def get_provider_health(self, db: Session) -> Dict[str, Dict]:
        """
        Get comprehensive health status for all providers.
        
        Returns:
            Dictionary of provider -> health metrics
        """
        providers = ["openai", "anthropic", "google"]
        health_status = {}
        
        for provider in providers:
            health_status[provider] = await self._get_provider_metrics(db, provider)
        
        return health_status
    
    async def _get_provider_metrics(self, db: Session, provider: str) -> Dict:
        """Get health metrics for a specific provider."""
        # Get circuit breaker status
        is_open = await self.circuit_breaker.is_circuit_open(provider)
        
        # Get recent events (last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_events = db.query(CircuitBreakerEvent).filter(
            CircuitBreakerEvent.provider == provider,
            CircuitBreakerEvent.created_at >= one_hour_ago
        ).all()
        
        # Calculate success/failure rates
        total_requests = len(recent_events)
        failures = sum(1 for e in recent_events if e.event_type == "failure")
        successes = sum(1 for e in recent_events if e.event_type == "success")
        
        success_rate = (successes / total_requests * 100) if total_requests > 0 else 100.0
        
        # Get average latency from usage logs
        recent_usage = db.query(UsageLog).filter(
            UsageLog.model.like(f"%{provider}%"),
            UsageLog.created_at >= one_hour_ago
        ).all()
        
        avg_latency = 0
        if recent_usage:
            # Estimate latency (this is a placeholder - real implementation would track actual latency)
            avg_latency = 150  # ms
        
        # Determine overall status
        if is_open:
            status = "circuit_open"
            status_text = "Circuit Open"
            color = "red"
        elif success_rate < 50:
            status = "degraded"
            status_text = "Degraded"
            color = "yellow"
        elif success_rate < 90:
            status = "partial"
            status_text = "Partial Outage"
            color = "orange"
        else:
            status = "operational"
            status_text = "Operational"
            color = "green"
        
        return {
            "status": status,
            "status_text": status_text,
            "color": color,
            "circuit_open": is_open,
            "success_rate": round(success_rate, 2),
            "total_requests_1h": total_requests,
            "failures_1h": failures,
            "successes_1h": successes,
            "avg_latency_ms": avg_latency,
            "last_failure": recent_events[-1].created_at.isoformat() if recent_events and failures > 0 else None
        }
    
    async def get_system_health(self, db: Session) -> Dict:
        """
        Get overall system health summary.
        
        Returns:
            System-wide health metrics
        """
        provider_health = await self.get_provider_health(db)
        
        # Count operational providers
        operational_count = sum(
            1 for p in provider_health.values()
            if p["status"] == "operational"
        )
        
        total_providers = len(provider_health)
        
        # Determine overall system status
        if operational_count == 0:
            system_status = "major_outage"
            system_color = "red"
        elif operational_count < total_providers / 2:
            system_status = "partial_outage"
            system_color = "orange"
        elif operational_count < total_providers:
            system_status = "degraded"
            system_color = "yellow"
        else:
            system_status = "operational"
            system_color = "green"
        
        return {
            "status": system_status,
            "color": system_color,
            "operational_providers": operational_count,
            "total_providers": total_providers,
            "providers": provider_health,
            "timestamp": datetime.utcnow().isoformat()
        }


async def get_provider_health_summary(db: Session, redis_manager: RedisManager) -> Dict:
    """
    Convenience function to get provider health summary.
    
    Args:
        db: Database session
        redis_manager: Redis manager instance
    
    Returns:
        Provider health summary
    """
    monitor = ProviderHealthMonitor(redis_manager)
    return await monitor.get_system_health(db)
