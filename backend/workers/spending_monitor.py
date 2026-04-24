"""Background worker for monitoring user spending and auto-suspension."""
import asyncio
import httpx
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database.connection import SessionLocal
from backend.database.models import User, UsageLog, SpendingAlert, Rental, RentalStatus
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

SPENDING_THRESHOLD = settings.SPENDING_ALERT_THRESHOLD_USD
MONITORING_WINDOW_MINUTES = settings.SPENDING_ALERT_WINDOW_MINUTES
CHECK_INTERVAL_SECONDS = 30


async def _notify_admin(user_email: str, amount_usd: float, rentals_suspended: int):
    """Send email + optional webhook notification to admin on spending threshold breach."""
    admin_email = settings.ADMIN_NOTIFICATION_EMAIL or settings.ADMIN_EMAIL

    # Email notification (uses EmailService — falls back to log if SMTP not configured)
    try:
        from backend.services.email_service import email_service
        budget = SPENDING_THRESHOLD
        pct = (amount_usd / budget) * 100 if budget > 0 else 100
        subject = f"🚨 Spending Alert: User {user_email} exceeded threshold"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
        <h2>Spending Threshold Exceeded</h2>
        <p>User <strong>{user_email}</strong> spent <strong>${amount_usd:.2f}</strong>
           in the last <strong>{MONITORING_WINDOW_MINUTES} minutes</strong>
           (threshold: ${SPENDING_THRESHOLD:.2f}).</p>
        <p><strong>{rentals_suspended}</strong> rental(s) auto-suspended.</p>
        <p><a href="http://localhost:5173/admin" style="color: #7c3aed;">Open Admin Panel →</a></p>
        </body></html>
        """
        email_service._send(admin_email, subject, body)
    except Exception as e:
        logger.warning(f"Admin email notification failed: {e}")


class SpendingMonitor:
    """Monitor user spending and auto-suspend on threshold breach."""

    def __init__(self):
        self.running = False

    async def start(self):
        """Start the spending monitor background task."""
        self.running = True
        logger.info("🔍 Spending Monitor started")

        while self.running:
            try:
                await self.check_all_users()
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
            except Exception as e:
                logger.error(f"❌ Spending Monitor error: {e}")
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)

    async def stop(self):
        """Stop the spending monitor."""
        self.running = False
        logger.info("🛑 Spending Monitor stopped")

    async def check_all_users(self):
        """Check spending for all active users."""
        loop = asyncio.get_event_loop()

        # Fetch all active user IDs + their User objects in one thread
        def _fetch_users():
            db = SessionLocal()
            try:
                rows = db.query(Rental.user_id).filter(
                    Rental.status == RentalStatus.ACTIVE
                ).distinct().all()
                if not rows:
                    return db, []
                user_ids = [r[0] for r in rows]
                users = db.query(User).filter(User.id.in_(user_ids)).all()
                return db, users
            except Exception:
                db.close()
                raise

        db, users = await loop.run_in_executor(None, _fetch_users)
        if not users:
            db.close()
            return

        try:
            for user in users:
                await self.check_user_spending(db, user)
        finally:
            db.close()

    async def check_user_spending(self, db: Session, user: User):
        """Check spending for a specific user."""
        loop = asyncio.get_event_loop()
        window_start = datetime.utcnow() - timedelta(minutes=MONITORING_WINDOW_MINUTES)

        # Run all DB work in thread pool
        def _check_and_suspend():
            total_spent = db.query(func.sum(UsageLog.cost_usd)).join(
                Rental, Rental.id == UsageLog.rental_id
            ).filter(
                Rental.user_id == user.id,
                UsageLog.created_at >= window_start
            ).scalar() or 0.0

            if total_spent <= SPENDING_THRESHOLD:
                return total_spent, False, 0

            existing_alert = db.query(SpendingAlert).filter(
                SpendingAlert.user_id == user.id,
                SpendingAlert.created_at >= window_start
            ).first()

            if existing_alert:
                return total_spent, False, 0

            alert = SpendingAlert(
                user_id=user.id,
                amount_usd=total_spent,
                window_minutes=MONITORING_WINDOW_MINUTES,
                was_suspended=True
            )
            db.add(alert)

            active_rentals = db.query(Rental).filter(
                Rental.user_id == user.id,
                Rental.status == RentalStatus.ACTIVE
            ).all()
            for rental in active_rentals:
                rental.status = RentalStatus.SUSPENDED
                logger.info(f"🔒 Suspended rental ID: {rental.id}")

            db.commit()
            return total_spent, True, len(active_rentals)

        total_spent, did_suspend, suspended_count = await loop.run_in_executor(None, _check_and_suspend)

        if did_suspend:
            logger.warning(
                f"⚠️  User {user.email} exceeded spending threshold: "
                f"${total_spent:.2f} in {MONITORING_WINDOW_MINUTES} minutes"
            )
            logger.info(
                f"🚨 Created spending alert for user {user.email} "
                f"and suspended {suspended_count} rental(s)"
            )
            await _notify_admin(user.email, total_spent, suspended_count)


# Global instance
spending_monitor = SpendingMonitor()


async def start_spending_monitor():
    """Start the spending monitor background task."""
    await spending_monitor.start()


async def stop_spending_monitor():
    """Stop the spending monitor background task."""
    await spending_monitor.stop()
