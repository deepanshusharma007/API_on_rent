"""Background worker to update expired rental statuses and release capacity."""
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.connection import SessionLocal
from backend.database.models import Rental, Plan, User, RentalStatus
from backend.database.redis_manager import get_redis_manager
from backend.services.email_service import email_service
import logging

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 30  # Check every 30 seconds


class RentalExpirationMonitor:
    """Monitor and update expired rental statuses, release capacity."""

    def __init__(self):
        self.running = False

    async def start(self):
        """Start the expiration monitor background task."""
        self.running = True
        logger.info("⏰ Rental Expiration Monitor started")

        while self.running:
            try:
                await self.check_expired_rentals()
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
            except Exception as e:
                logger.error(f"❌ Expiration Monitor error: {e}")
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)

    async def stop(self):
        """Stop the expiration monitor."""
        self.running = False
        logger.info("🛑 Rental Expiration Monitor stopped")

    async def check_expired_rentals(self):
        """Check and update expired rentals, release capacity."""
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            expired_rentals = db.query(Rental).filter(
                Rental.status == RentalStatus.ACTIVE,
                Rental.expires_at <= now
            ).all()

            if expired_rentals:
                logger.info(f"⏰ Found {len(expired_rentals)} expired rentals")

                # Try to release capacity
                try:
                    redis_mgr = get_redis_manager()
                    from backend.services.capacity_manager import CapacityManager
                    capacity_mgr = CapacityManager(redis_mgr)

                    for rental in expired_rentals:
                        rental.status = RentalStatus.EXPIRED

                        # Release capacity
                        plan = db.query(Plan).filter(Plan.id == rental.plan_id).first()
                        if plan:
                            await capacity_mgr.release_capacity(plan.token_cap, plan.rpm_limit)

                        # Clean up Redis keys
                        await redis_mgr.delete_virtual_key(rental.virtual_key)

                        logger.info(
                            f"   ✅ Rental {rental.id} expired → capacity released "
                            f"({plan.token_cap} tokens, {plan.rpm_limit} RPM)"
                        )

                        # Send expiry email (best-effort)
                        try:
                            user = db.query(User).filter(User.id == rental.user_id).first()
                            if user and plan:
                                email_service.send_rental_expired(user.email, plan.name)
                        except Exception as email_err:
                            logger.debug(f"Expiry email failed (non-fatal): {email_err}")

                except Exception as cap_err:
                    logger.warning(f"   ⚠️ Capacity release failed (non-fatal): {cap_err}")
                    # Still mark as expired even if capacity release fails
                    for rental in expired_rentals:
                        rental.status = RentalStatus.EXPIRED

                db.commit()

        finally:
            db.close()


# Global instance
expiration_monitor = RentalExpirationMonitor()
