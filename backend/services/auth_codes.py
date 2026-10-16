"""Short-lived verification state for signup and password reset, kept in Redis.

- 6-digit email codes: stored only as an HMAC, expire, limited attempts, single use
- Opaque single-use tokens (signup completion, password reset links)
- Per-email send limits (resend cooldown + hourly cap)

Keys use the "auth:" prefix and a hash of the email, never the email itself.
"""
import hashlib
import hmac
import secrets
from typing import Optional

from backend.config import settings


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _digest(value: str) -> str:
    return hmac.new(settings.JWT_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def _key(purpose: str, kind: str, value: str) -> str:
    return f"auth:{purpose}:{kind}:{_digest(value)}"


async def check_send_allowed(redis, purpose: str, email: str) -> Optional[int]:
    """Reserve a send for this email. Returns None if allowed, else seconds to wait."""
    cooldown_key = _key(purpose, "cooldown", email)
    if not await redis.set(cooldown_key, "1", ex=settings.OTP_RESEND_COOLDOWN_SECONDS, nx=True):
        ttl = await redis.ttl(cooldown_key)
        return ttl if ttl and ttl > 0 else settings.OTP_RESEND_COOLDOWN_SECONDS

    hourly_key = _key(purpose, "hourly", email)
    sends = await redis.incr(hourly_key)
    if sends == 1:
        await redis.expire(hourly_key, 3600)
    if sends > settings.OTP_MAX_SENDS_PER_HOUR:
        ttl = await redis.ttl(hourly_key)
        return ttl if ttl and ttl > 0 else 3600
    return None


async def release_send(redis, purpose: str, email: str):
    """Undo a reservation when the email could not be sent, so the user can retry."""
    await redis.delete(_key(purpose, "cooldown", email))
    hourly_key = _key(purpose, "hourly", email)
    if await redis.decr(hourly_key) <= 0:
        await redis.delete(hourly_key)


async def issue_code(redis, purpose: str, email: str) -> str:
    """Create a new 6-digit code for this email, replacing any previous one."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    ttl = settings.OTP_TTL_SECONDS
    await redis.set(_key(purpose, "code", email), _digest(f"{email}:{code}"), ex=ttl)
    await redis.delete(_key(purpose, "attempts", email))
    return code


async def verify_code(redis, purpose: str, email: str, code: str) -> str:
    """Returns "ok", "invalid", "expired" or "locked". A code works once."""
    code_key = _key(purpose, "code", email)
    stored = await redis.get(code_key)
    if not stored:
        return "expired"
    if hmac.compare_digest(stored, _digest(f"{email}:{code}")):
        # Single use: only the caller that actually deletes the code succeeds
        return "ok" if await redis.delete(code_key) else "expired"

    attempts_key = _key(purpose, "attempts", email)
    attempts = await redis.incr(attempts_key)
    if attempts == 1:
        await redis.expire(attempts_key, settings.OTP_TTL_SECONDS)
    if attempts >= settings.OTP_MAX_ATTEMPTS:
        await redis.delete(code_key, attempts_key)
        return "locked"
    return "invalid"


async def issue_token(redis, purpose: str, email: str, ttl: int) -> str:
    """Opaque single-use token bound to an email. Issuing a new one revokes the previous."""
    token = secrets.token_urlsafe(32)
    current_key = _key(purpose, "current", email)
    previous = await redis.get(current_key)
    if previous:
        await redis.delete(f"auth:{purpose}:token:{previous}")
    token_digest = _digest(token)
    await redis.set(f"auth:{purpose}:token:{token_digest}", email, ex=ttl)
    await redis.set(current_key, token_digest, ex=ttl)
    return token


async def consume_token(redis, purpose: str, token: str) -> Optional[str]:
    """Return the token's email and invalidate it, or None if invalid/expired/used."""
    token_key = f"auth:{purpose}:token:{_digest(token)}"
    async with redis.pipeline(transaction=True) as pipe:
        pipe.get(token_key)
        pipe.delete(token_key)
        email, deleted = await pipe.execute()
    if not email or not deleted:
        return None
    await redis.delete(_key(purpose, "current", email))
    return email
