"""Email notification service for rental events.

Transport is chosen with EMAIL_TRANSPORT (default "smtp"):
- smtp:      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL
- gmail_api: GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET, GMAIL_API_REFRESH_TOKEN,
             GMAIL_SENDER (HTTPS; for hosts that block outbound SMTP)

Falls back to logging if the selected transport is not fully configured.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os

from backend.services.email_transport import GmailApiTransport

logger = logging.getLogger(__name__)

EMAIL_TRANSPORTS = ("smtp", "gmail_api")


def _config(name: str, default: str) -> str:
    """Process environment first (e.g. Render), then the app settings, which also
    read the project .env file; previously values only present in .env were ignored."""
    value = os.getenv(name)
    if value is not None:
        return value
    try:
        from backend.config import settings
        value = getattr(settings, name, None)
    except Exception:  # settings unavailable (e.g. isolated tests)
        value = None
    return default if value is None or value == "" else str(value)


class EmailService:
    """Send email notifications for rental events."""

    def __init__(self):
        self.host = _config("SMTP_HOST", "")
        self.port = int(_config("SMTP_PORT", "587"))
        self.user = _config("SMTP_USER", "")
        self.password = _config("SMTP_PASSWORD", "")
        self.from_email = _config("SMTP_FROM_EMAIL", "noreply@apirental.dev")
        self.enabled = bool(self.host and self.user and self.password)

        transport = _config("EMAIL_TRANSPORT", "smtp").strip().lower() or "smtp"
        if transport not in EMAIL_TRANSPORTS:
            logger.warning("Unknown EMAIL_TRANSPORT value; using smtp")
            transport = "smtp"
        self.transport = transport
        self.gmail = GmailApiTransport(
            client_id=_config("GMAIL_API_CLIENT_ID", ""),
            client_secret=_config("GMAIL_API_CLIENT_SECRET", ""),
            refresh_token=_config("GMAIL_API_REFRESH_TOKEN", ""),
            sender=_config("GMAIL_SENDER", ""),
        )
        if transport == "gmail_api":
            # Gmail only sends as the authorised account; never fall back to SMTP here
            self.from_email = self.gmail.sender
            self.enabled = self.gmail.configured
            if not self.enabled:
                logger.warning("EMAIL_TRANSPORT=gmail_api but Gmail API settings are incomplete; emails will only be logged")

    def status(self) -> dict:
        """What is configured, for startup logs and setup checks. Never includes secret values."""
        if self.transport == "gmail_api":
            required = {"GMAIL_API_CLIENT_ID": self.gmail._client_id, "GMAIL_API_CLIENT_SECRET": self.gmail._client_secret,
                        "GMAIL_API_REFRESH_TOKEN": self.gmail._refresh_token, "GMAIL_SENDER": self.gmail.sender}
        else:
            required = {"SMTP_HOST": self.host, "SMTP_USER": self.user, "SMTP_PASSWORD": self.password}
        return {
            "transport": self.transport,
            "enabled": self.enabled,
            "missing": [name for name, value in required.items() if not value],
            "sender": self.from_email if self.enabled else None,
        }

    def _deliver(self, msg: MIMEMultipart, to_email: str):
        """Send a built message with the selected transport. Raises on failure."""
        if self.transport == "gmail_api":
            self.gmail.send(msg)
            return
        with smtplib.SMTP(self.host, self.port, timeout=10) as server:
            server.starttls()
            server.login(self.user, self.password)
            server.sendmail(self.from_email, to_email, msg.as_string())

    def _send(self, to_email: str, subject: str, html_body: str) -> bool:
        """Send an email (blocking). Call from background task. Returns True if sent."""
        if not self.enabled:
            logger.info(f"[Email stub] To: {to_email} | Subject: {subject}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            self._deliver(msg, to_email)

            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Email send failed to {to_email}: {e}")
            return False

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

    def send_contact_form(self, sender_name: str, sender_email: str, subject: str, message: str, owner_email: str):
        """Forward a contact-form submission to the site owner."""
        email_subject = f"[AIRent Contact] {subject or 'New message'} — from {sender_name}"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #7c3aed;">New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; width: 120px;">Name</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb;">{sender_name}</td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Email</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb;"><a href="mailto:{sender_email}">{sender_email}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Topic</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb;">{subject or '(not selected)'}</td>
            </tr>
        </table>
        <h3 style="color: #374151; margin-top: 20px;">Message</h3>
        <div style="padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap; line-height: 1.6;">
{message}
        </div>
        <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
            Reply directly to this email to respond to {sender_name} at {sender_email}.
        </p>
        </body></html>
        """
        # Set reply-to so clicking Reply goes straight to the user
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = email_subject
            msg["From"] = self.from_email
            msg["To"] = owner_email
            msg["Reply-To"] = sender_email
            msg.attach(MIMEText(body, "html"))

            if not self.enabled:
                logger.info(f"[Email stub] Contact form from {sender_email}: {email_subject}")
                return

            self._deliver(msg, owner_email)

            logger.info(f"Contact form email sent to {owner_email} from {sender_email}")
        except Exception as e:
            logger.error(f"Contact form email failed: {e}")
            raise

    def send_new_signup_notification(self, admin_email: str, new_user_email: str,
                                       user_id: int, registered_at: str):
        """Notify admin when a new user signs up."""
        subject = f"🎉 New signup: {new_user_email}"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #10b981;">New User Signed Up</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; width: 140px;">Email</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb;"><a href="mailto:{new_user_email}">{new_user_email}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">User ID</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; font-family: monospace;">#{user_id}</td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Registered At</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb;">{registered_at}</td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Role</td>
                <td style="padding: 10px 14px; border: 1px solid #e5e7eb;">USER</td>
            </tr>
        </table>
        <p style="margin-top: 16px;">
            <a href="http://localhost:5173/admin" style="color: #10b981; font-weight: 600;">Open Admin Panel →</a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            This is an automated notification from AIRent.
        </p>
        </body></html>
        """
        self._send(admin_email, subject, body)

    def send_signup_otp(self, email: str, code: str, expires_minutes: int) -> bool:
        """Email a signup verification code. The code is only in the body, never the subject."""
        subject = "Your AIRent verification code"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333; max-width: 520px;">
        <h2>Verify your email</h2>
        <p>Use this code to finish creating your AIRent account:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace; margin: 24px 0;">{code}</p>
        <p>The code expires in {expires_minutes} minutes and can be used once.</p>
        <p style="color: #6b7280; font-size: 13px;">If you didn't try to sign up, you can ignore this email.</p>
        </body></html>
        """
        return self._send(email, subject, body)

    def send_account_exists_notice(self, email: str, login_url: str, reset_url: str) -> bool:
        """Sent instead of a code when someone tries to sign up with an existing account's email."""
        subject = "You already have an AIRent account"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333; max-width: 520px;">
        <h2>You already have an account</h2>
        <p>Someone (hopefully you) tried to create a new AIRent account with this email address,
           but an account already exists.</p>
        <p><a href="{login_url}" style="color: #7c3aed;">Sign in</a> &nbsp;·&nbsp;
           <a href="{reset_url}" style="color: #7c3aed;">Reset your password</a></p>
        <p style="color: #6b7280; font-size: 13px;">If this wasn't you, no action is needed.</p>
        </body></html>
        """
        return self._send(email, subject, body)

    def send_password_reset(self, email: str, reset_link: str, expires_minutes: int) -> bool:
        """Email a single-use password reset link."""
        subject = "Reset your AIRent password"
        body = f"""
        <html><body style="font-family: sans-serif; color: #333; max-width: 520px;">
        <h2>Reset your password</h2>
        <p>Click the button below to choose a new password. The link expires in
           {expires_minutes} minutes and works once.</p>
        <p style="margin: 24px 0;"><a href="{reset_link}" style="background: #7c3aed; color: #fff; padding: 12px 20px;
           border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a></p>
        <p style="color: #6b7280; font-size: 13px;">If you didn't ask to reset your password, you can ignore this
           email — your password won't change.</p>
        </body></html>
        """
        return self._send(email, subject, body)

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
