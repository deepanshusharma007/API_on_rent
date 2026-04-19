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
        db = SessionLocal()
        try:
            # Get users with active rentals
            active_user_ids = db.query(Rental.user_id).filter(
                Rental.status == RentalStatus.ACTIVE
            ).distinct().all()

            for (user_id,) in active_user_ids:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    await self.check_user_spending(db, user)

        finally:
            db.close()

    async def check_user_spending(self, db: Session, user: User):
        """Check spending for a specific user."""
        window_start = datetime.utcnow() - timedelta(minutes=MONITORING_WINDOW_MINUTES)

        # Get usage costs through rental relationship
        total_spent = db.query(func.sum(UsageLog.cost_usd)).join(
            Rental, Rental.id == UsageLog.rental_id
        ).filter(
            Rental.user_id == user.id,
            UsageLog.created_at >= window_start
        ).scalar() or 0.0

        if total_spent > SPENDING_THRESHOLD:
            logger.warning(
                f"⚠️  User {user.email} exceeded spending threshold: "
                f"${total_spent:.2f} in {MONITORING_WINDOW_MINUTES} minutes"
            )

            # Check if already alerted recently
            existing_alert = db.query(SpendingAlert).filter(
                SpendingAlert.user_id == user.id,
                SpendingAlert.created_at >= window_start
            ).first()

            if not existing_alert:
                alert = SpendingAlert(
                    user_id=user.id,
                    amount_usd=total_spent,
                    window_minutes=MONITORING_WINDOW_MINUTES,
                    was_suspended=True
                )
                db.add(alert)

                # Auto-suspend user's active rentals
                active_rentals = db.query(Rental).filter(
                    Rental.user_id == user.id,
                    Rental.status == RentalStatus.ACTIVE
                ).all()

                for rental in active_rentals:
                    rental.status = RentalStatus.SUSPENDED
                    logger.info(f"🔒 Suspended rental ID: {rental.id}")

                db.commit()

                logger.info(
                    f"🚨 Created spending alert for user {user.email} "
                    f"and suspended {len(active_rentals)} rental(s)"
                )

                # Notify admin via email
                await _notify_admin(user.email, total_spent, len(active_rentals))


# Global instance
spending_monitor = SpendingMonitor()


async def start_spending_monitor():
    """Start the spending monitor background task."""
    await spending_monitor.start()


async def stop_spending_monitor():
    """Stop the spending monitor background task."""
    await spending_monitor.stop()
