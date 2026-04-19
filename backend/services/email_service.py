"""Email notification service for rental events.

Uses SMTP for sending emails. Configure via environment variables:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

Falls back to logging if SMTP is not configured.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os

logger = logging.getLogger(__name__)


class EmailService:
    """Send email notifications for rental events."""

    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "")
        self.port = int(os.getenv("SMTP_PORT", "587"))
        self.user = os.getenv("SMTP_USER", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", "noreply@apirental.dev")
        self.enabled = bool(self.host and self.user and self.password)

    def _send(self, to_email: str, subject: str, html_body: str):
        """Send an email (blocking). Call from background task."""
        if not self.enabled:
            logger.info(f"[Email stub] To: {to_email} | Subject: {subject}")
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, to_email, msg.as_string())

            logger.info(f"Email sent to {to_email}: {subject}")
        except Exception as e:
            logger.error(f"Email send failed to {to_email}: {e}")

    def send_rental_activated(self, email: str, plan_name: str, virtual_key: str,
                               expires_at: str, token_cap: int):
        """Notify user that their rental is active."""
        subject = f"🚀 Your {plan_name} rental is active!"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
        <h2>Your AI API Rental is Ready</h2>
        <p>Your <strong>{plan_name}</strong> plan is now active.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Virtual Key</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">{virtual_key}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Token Cap</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{token_cap:,} tokens</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Expires</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{expires_at}</td></tr>
        </table>
        <p>Use your virtual key with any OpenAI-compatible client.</p>
        </body></html>
        """
        self._send(email, subject, body)

    def send_rental_expired(self, email: str, plan_name: str):
        """Notify user that their rental has expired."""
        subject = f"⏰ Your {plan_name} rental has expired"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
        <h2>Rental Expired</h2>
        <p>Your <strong>{plan_name}</strong> rental has expired. Your virtual key is no longer active.</p>
        <p><a href="http://localhost:5173/marketplace" style="color: #7c3aed;">Browse new plans →</a></p>
        </body></html>
        """
        self._send(email, subject, body)

    def send_spending_alert(self, email: str, utilization_pct: float,
                             spent: float, budget: float):
        """Notify admin about spending threshold breach."""
        subject = f"⚠️ Spending Alert: {utilization_pct:.0f}% of budget used"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
        <h2>Spending Alert</h2>
        <p>Provider spending has reached <strong>{utilization_pct:.1f}%</strong> of the monthly budget.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Spent</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${spent:.2f}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Budget</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${budget:.2f}</td></tr>
        </table>
        <p><a href="http://localhost:5173/admin" style="color: #7c3aed;">Open Admin Panel →</a></p>
        </body></html>
        """
        self._send(email, subject, body)

    def send_token_low_warning(self, email: str, plan_name: str, tokens_remaining: int, pct: float):
        """Notify user when their tokens are running low (< 10%)."""
        subject = f"⚠️ Low tokens: {tokens_remaining:,} remaining"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
        <h2>Token Balance Low</h2>
        <p>Your <strong>{plan_name}</strong> rental is at <strong>{pct:.0f}%</strong> token usage.</p>
        <p>Remaining: <strong>{tokens_remaining:,}</strong> tokens.</p>
        <p>Consider purchasing a new plan before tokens run out.</p>
        </body></html>
        """
        self._send(email, subject, body)


# Global instance
email_service = EmailService()
