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
        loop = asyncio.get_event_loop()

        # Fetch expired rentals in thread pool (blocking DB call)
        def _fetch_expired():
            db = SessionLocal()
            try:
                now = datetime.utcnow()
                return db.query(Rental).filter(
                    Rental.status == RentalStatus.ACTIVE,
                    Rental.expires_at <= now
                ).all(), db
            except Exception:
                db.close()
                raise

        expired_rentals, db = await loop.run_in_executor(None, _fetch_expired)

        if not expired_rentals:
            db.close()
            return

        logger.info(f"⏰ Found {len(expired_rentals)} expired rentals")

        try:
            redis_mgr = get_redis_manager()
            from backend.services.capacity_manager import CapacityManager
            capacity_mgr = CapacityManager(redis_mgr)

            for rental in expired_rentals:
                rental.status = RentalStatus.EXPIRED

                # Release capacity and clean up Redis keys concurrently
                plan = await loop.run_in_executor(
                    None, lambda r=rental: db.query(Plan).filter(Plan.id == r.plan_id).first()
                )
                tasks = [redis_mgr.delete_virtual_key(rental.virtual_key)]
                if plan:
                    tasks.append(capacity_mgr.release_capacity(plan.token_cap, plan.rpm_limit))
                await asyncio.gather(*tasks, return_exceptions=True)

                logger.info(
                    f"   ✅ Rental {rental.id} expired → capacity released "
                    f"({plan.token_cap if plan else 0} tokens)"
                )

                # Send expiry email (best-effort, non-blocking)
                try:
                    user = await loop.run_in_executor(
                        None, lambda r=rental: db.query(User).filter(User.id == r.user_id).first()
                    )
                    if user and plan:
                        email_service.send_rental_expired(user.email, plan.name)
                except Exception as email_err:
                    logger.debug(f"Expiry email failed (non-fatal): {email_err}")

            await loop.run_in_executor(None, db.commit)

        except Exception as cap_err:
            logger.warning(f"   ⚠️ Capacity release failed (non-fatal): {cap_err}")
            for rental in expired_rentals:
                rental.status = RentalStatus.EXPIRED
            await loop.run_in_executor(None, db.commit)
        finally:
            db.close()


# Global instance
expiration_monitor = RentalExpirationMonitor()
