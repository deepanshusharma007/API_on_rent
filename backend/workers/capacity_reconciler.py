"""Background worker to reconcile capacity reservations with actual state."""
import asyncio
from sqlalchemy import func
from backend.database.connection import SessionLocal
from backend.database.models import Rental, Plan, RentalStatus
import logging

logger = logging.getLogger(__name__)

RECONCILE_INTERVAL_SECONDS = 300  # Every 5 minutes


class CapacityReconciler:
    """Periodically sync capacity reservations with actual DB state."""

    def __init__(self):
        self.running = False

    async def start(self):
        self.running = True
        logger.info("📊 Capacity Reconciler started")

        while self.running:
            try:
                await self.reconcile()
                await asyncio.sleep(RECONCILE_INTERVAL_SECONDS)
            except Exception as e:
                logger.error(f"❌ Capacity Reconciler error: {e}")
                await asyncio.sleep(RECONCILE_INTERVAL_SECONDS)

    async def stop(self):
        self.running = False
        logger.info("🛑 Capacity Reconciler stopped")

    async def reconcile(self):
        """Sync Redis capacity counters with actual DB state."""
        db = SessionLocal()
        try:
            # Calculate actual reserved tokens and RPM from active rentals
            active_reservations = db.query(
                func.sum(Plan.token_cap).label("total_tokens"),
                func.sum(Plan.rpm_limit).label("total_rpm"),
                func.count(Rental.id).label("count"),
            ).join(Plan, Rental.plan_id == Plan.id).filter(
                Rental.status == RentalStatus.ACTIVE
            ).first()

            actual_tokens = int(active_reservations.total_tokens or 0)
            actual_rpm = int(active_reservations.total_rpm or 0)
            rental_count = int(active_reservations.count or 0)

            # Update Redis to match actual state
            try:
                from backend.database.redis_manager import get_redis_manager
                redis_mgr = get_redis_manager()

                current_tokens = int(await redis_mgr.redis.get("capacity:tokens:reserved") or 0)
                current_rpm = int(await redis_mgr.redis.get("capacity:rpm:reserved") or 0)

                if current_tokens != actual_tokens or current_rpm != actual_rpm:
                    await redis_mgr.redis.set("capacity:tokens:reserved", actual_tokens)
                    await redis_mgr.redis.set("capacity:rpm:reserved", actual_rpm)

                    logger.info(
                        f"📊 Capacity reconciled: tokens {current_tokens}→{actual_tokens}, "
                        f"RPM {current_rpm}→{actual_rpm} ({rental_count} active rentals)"
                    )
                else:
                    logger.debug(f"📊 Capacity in sync: {actual_tokens} tokens, {actual_rpm} RPM")

            except Exception as redis_err:
                logger.warning(f"⚠️ Redis reconciliation failed: {redis_err}")

        finally:
            db.close()


# Global instance
capacity_reconciler = CapacityReconciler()
