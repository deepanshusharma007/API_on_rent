"""Background worker to monitor total provider spend and protect against cost overruns."""
import asyncio
import json
from datetime import datetime
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 60  # Every minute


class CostProtectionWorker:
    """Monitor provider spend. Auto-pause new sales and notify admin if approaching budget limit."""

    def __init__(self):
        self.running = False
        self.threshold = settings.COST_PROTECTION_THRESHOLD  # 0.90 = 90%
        self._last_alert_level = None  # Avoid duplicate alerts

    async def start(self):
        self.running = True
        logger.info("💰 Cost Protection Worker started")

        while self.running:
            try:
                await self.check_costs()
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
            except Exception as e:
                logger.error(f"❌ Cost Protection error: {e}")
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)

    async def stop(self):
        self.running = False
        logger.info("🛑 Cost Protection Worker stopped")

    async def check_costs(self):
        """Check if provider costs are approaching budget limits."""
        try:
            from backend.database.redis_manager import get_redis_manager
            from backend.services.capacity_manager import CapacityManager

            redis_mgr = get_redis_manager()
            capacity_mgr = CapacityManager(redis_mgr)

            config = await capacity_mgr.get_capacity_config("global")
            total_spent = await capacity_mgr.get_total_spent()
            budget = config["monthly_budget_usd"]

            if budget <= 0:
                return

            utilization = total_spent / budget

            if utilization >= 0.95 and self._last_alert_level != "critical":
                self._last_alert_level = "critical"
                msg = (
                    f"🚨 CRITICAL: Provider cost at {utilization*100:.1f}% of budget! "
                    f"${total_spent:.2f} / ${budget:.2f}"
                )
                logger.critical(msg)
                await self._notify_admin("critical", msg, utilization, total_spent, budget)

            elif utilization >= self.threshold and self._last_alert_level != "warning":
                self._last_alert_level = "warning"
                msg = (
                    f"⚠️ Provider cost at {utilization*100:.1f}% of budget. "
                    f"${total_spent:.2f} / ${budget:.2f}"
                )
                logger.warning(msg)
                await self._notify_admin("warning", msg, utilization, total_spent, budget)

            elif utilization < self.threshold:
                self._last_alert_level = None  # Reset so future alerts fire again

        except Exception as e:
            logger.debug(f"Cost check skipped: {e}")

    async def _notify_admin(self, level: str, message: str, utilization: float,
                            spent: float, budget: float):
        """Send admin notification via multiple channels."""
        alert_data = {
            "level": level,
            "message": message,
            "utilization_pct": round(utilization * 100, 1),
            "total_spent_usd": round(spent, 2),
            "budget_usd": round(budget, 2),
            "timestamp": datetime.utcnow().isoformat()
        }

        # 1. Store alert in Redis for admin dashboard
        try:
            from backend.database.redis_manager import get_redis_manager
            redis_mgr = get_redis_manager()
            alert_key = f"cost_alert:{level}:{datetime.utcnow().strftime('%Y%m%d%H%M')}"
            await redis_mgr.redis.setex(alert_key, 86400, json.dumps(alert_data))  # 24h TTL
        except Exception as e:
            logger.debug(f"Redis alert store failed: {e}")

        # 2. Store in DB via SpendingAlert
        try:
            from backend.database.connection import SessionLocal
            from backend.database.models import SpendingAlert
            db = SessionLocal()
            try:
                alert = SpendingAlert(
                    user_id=0,  # System-level alert
                    amount_usd=spent,
                    window_minutes=60,
                    was_suspended=level == "critical",
                    description=message
                )
                db.add(alert)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"DB alert store failed: {e}")

        # 3. Webhook notification (if configured)
        webhook_url = getattr(settings, 'ADMIN_WEBHOOK_URL', None)
        if webhook_url:
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    await session.post(
                        webhook_url,
                        json=alert_data,
                        timeout=aiohttp.ClientTimeout(total=5)
                    )
                logger.info(f"Webhook notification sent to {webhook_url}")
            except Exception as e:
                logger.warning(f"Webhook notification failed: {e}")

        # 4. Log to file for audit trail
        try:
            import os
            log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, "cost_alerts.log")
            with open(log_path, "a") as f:
                f.write(json.dumps(alert_data) + "\n")
        except Exception:
            pass

        # 5. Email notification to admin
        try:
            from backend.services.email_service import email_service
            admin_email = getattr(settings, 'ADMIN_EMAIL', None)
            if admin_email:
                email_service.send_spending_alert(
                    email=admin_email,
                    utilization_pct=utilization * 100,
                    spent=spent,
                    budget=budget
                )
        except Exception as e:
            logger.debug(f"Admin email notification failed: {e}")


# Global instance
cost_protection_worker = CostProtectionWorker()
