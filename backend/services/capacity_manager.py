"""Capacity management service — Hybrid reservation system (Option C).

Hard-reserves RPM (can't be shared). Soft-reserves tokens with overbooking.
Real-time monitoring prevents overselling.
"""
import json
import logging
from typing import Dict, Optional
from backend.database.redis_manager import RedisManager
from backend.config import settings

logger = logging.getLogger(__name__)

# Overbooking ratio: 1.5 means we can sell 50% more tokens than we actually have
OVERBOOKING_RATIO = float(getattr(settings, 'OVERBOOKING_RATIO', 1.5))


class CapacityManager:
    """Manages platform capacity — tokens, RPM, and budget reservations."""

    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager

    # ==================== Capacity Configuration ====================

    async def set_capacity(
        self,
        provider: str,
        monthly_budget_usd: float,
        max_rpm: int,
        max_tokens: int
    ):
        """Admin sets total capacity for a provider."""
        data = {
            "monthly_budget_usd": monthly_budget_usd,
            "max_rpm": max_rpm,
            "max_tokens": max_tokens,
        }
        key = f"capacity:config:{provider}"
        await self.redis.redis.set(key, json.dumps(data))
        logger.info(f"✅ Capacity set for {provider}: budget=${monthly_budget_usd}, RPM={max_rpm}, tokens={max_tokens}")

    async def get_capacity_config(self, provider: str = "global") -> Optional[Dict]:
        """Get configured capacity for a provider."""
        key = f"capacity:config:{provider}"
        data = await self.redis.redis.get(key)
        if data:
            return json.loads(data)
        # Default capacity if not configured
        return {
            "monthly_budget_usd": 100.0,
            "max_rpm": 500,
            "max_tokens": 2_000_000,
        }

    # ==================== Reservation Tracking ====================

    async def get_reserved_tokens(self) -> int:
        """Get total tokens reserved by all active rentals."""
        val = await self.redis.redis.get("capacity:tokens:reserved")
        return int(val) if val else 0

    async def get_reserved_rpm(self) -> int:
        """Get total RPM reserved by all active rentals."""
        val = await self.redis.redis.get("capacity:rpm:reserved")
        return int(val) if val else 0

    async def get_total_spent(self) -> float:
        """Get total money spent on provider APIs so far."""
        val = await self.redis.redis.get("capacity:budget:spent")
        return float(val) if val else 0.0

    # ==================== Pre-Purchase Check ====================

    async def can_sell_plan(self, token_cap: int, rpm_limit: int, estimated_cost: float) -> Dict:
        """
        Check if we have capacity to sell a plan.

        Returns:
            {"allowed": True/False, "reason": str, "available": {...}}
        """
        config = await self.get_capacity_config("global")

        # Get current reservations
        reserved_tokens = await self.get_reserved_tokens()
        reserved_rpm = await self.get_reserved_rpm()
        total_spent = await self.get_total_spent()

        max_tokens = config["max_tokens"]
        max_rpm = config["max_rpm"]
        max_budget = config["monthly_budget_usd"]

        # Apply overbooking to tokens (soft reserve)
        effective_token_capacity = int(max_tokens * OVERBOOKING_RATIO)
        available_tokens = effective_token_capacity - reserved_tokens

        # Hard reserve for RPM (no overbooking)
        available_rpm = max_rpm - reserved_rpm

        # Budget check
        available_budget = max_budget - total_spent

        result = {
            "available_tokens": available_tokens,
            "available_rpm": available_rpm,
            "available_budget_usd": available_budget,
            "overbooking_ratio": OVERBOOKING_RATIO,
        }

        # Check token capacity
        if token_cap > available_tokens:
            return {
                "allowed": False,
                "reason": f"Insufficient token capacity. Available: {available_tokens}, Required: {token_cap}",
                "available": result
            }

        # Check RPM capacity (hard limit)
        if rpm_limit > available_rpm:
            return {
                "allowed": False,
                "reason": f"Insufficient RPM capacity. Available: {available_rpm}, Required: {rpm_limit}",
                "available": result
            }

        # Check budget
        if estimated_cost > available_budget:
            return {
                "allowed": False,
                "reason": f"Insufficient budget. Available: ${available_budget:.2f}, Estimated: ${estimated_cost:.2f}",
                "available": result
            }

        return {
            "allowed": True,
            "reason": "Capacity available",
            "available": result
        }

    # ==================== Reserve / Release ====================

    async def reserve_capacity(self, token_cap: int, rpm_limit: int):
        """Reserve capacity when a plan is purchased."""
        await self.redis.redis.incrby("capacity:tokens:reserved", token_cap)
        await self.redis.redis.incrby("capacity:rpm:reserved", rpm_limit)
        logger.info(f"📦 Reserved: {token_cap} tokens, {rpm_limit} RPM")

    async def release_capacity(self, token_cap: int, rpm_limit: int):
        """Release capacity when a rental expires or is suspended."""
        await self.redis.redis.decrby("capacity:tokens:reserved", token_cap)
        await self.redis.redis.decrby("capacity:rpm:reserved", rpm_limit)

        # Ensure we don't go negative
        reserved_tokens = await self.get_reserved_tokens()
        if reserved_tokens < 0:
            await self.redis.redis.set("capacity:tokens:reserved", 0)

        reserved_rpm = await self.get_reserved_rpm()
        if reserved_rpm < 0:
            await self.redis.redis.set("capacity:rpm:reserved", 0)

        logger.info(f"🔓 Released: {token_cap} tokens, {rpm_limit} RPM")

    async def record_spend(self, cost_usd: float):
        """Record actual money spent on provider API."""
        await self.redis.redis.incrbyfloat("capacity:budget:spent", cost_usd)

    # ==================== Dashboard ====================

    async def get_capacity_dashboard(self) -> Dict:
        """Get full capacity utilization dashboard for admin."""
        config = await self.get_capacity_config("global")

        reserved_tokens = await self.get_reserved_tokens()
        reserved_rpm = await self.get_reserved_rpm()
        total_spent = await self.get_total_spent()

        max_tokens = config["max_tokens"]
        max_rpm = config["max_rpm"]
        max_budget = config["monthly_budget_usd"]
        effective_token_capacity = int(max_tokens * OVERBOOKING_RATIO)

        return {
            "tokens": {
                "real_capacity": max_tokens,
                "effective_capacity": effective_token_capacity,
                "reserved": reserved_tokens,
                "available": effective_token_capacity - reserved_tokens,
                "utilization_pct": round(reserved_tokens / effective_token_capacity * 100, 2) if effective_token_capacity > 0 else 0,
                "overbooking_ratio": OVERBOOKING_RATIO,
            },
            "rpm": {
                "capacity": max_rpm,
                "reserved": reserved_rpm,
                "available": max_rpm - reserved_rpm,
                "utilization_pct": round(reserved_rpm / max_rpm * 100, 2) if max_rpm > 0 else 0,
            },
            "budget": {
                "total_usd": max_budget,
                "spent_usd": total_spent,
                "available_usd": max_budget - total_spent,
                "utilization_pct": round(total_spent / max_budget * 100, 2) if max_budget > 0 else 0,
            }
        }
