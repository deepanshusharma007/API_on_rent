"""Authentication API endpoints."""
import asyncio
import logging
import os
import re
import secrets
from datetime import timedelta, timezone
from functools import partial
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database.connection import get_db
from backend.database.models import User, UserRole
from backend.api.schemas import (
    UserRegister, UserLogin, Token, UserResponse,
    SignupOtpRequest, SignupOtpVerify, SignupComplete, PasswordForgotRequest, PasswordResetRequest,
    GoogleLoginRequest, OtpSentResponse, SignupVerifiedResponse, MessageResponse,
)
from backend.services.auth_utils import verify_password, hash_password, create_access_token
from backend.services.auth_codes import (
    normalize_email, check_send_allowed, release_send, issue_code, verify_code, issue_token, consume_token,
)
from backend.services.google_auth import google_verifier, GoogleTokenError, GoogleKeysUnavailable
from backend.api.dependencies import get_current_user
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.services.email_service import email_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Load disposable email domain blocklist once at module import
_BLOCKLIST_PATH = Path(__file__).parent.parent / "data" / "disposable_domains.txt"
try:
    _DISPOSABLE_DOMAINS: set[str] = {
        line.strip().lower()
        for line in _BLOCKLIST_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    }
except FileNotFoundError:
    _DISPOSABLE_DOMAINS = set()


def _is_disposable_email(email: str) -> bool:
    domain = email.strip().lower().split("@")[-1]
    return domain in _DISPOSABLE_DOMAINS


def _find_user_by_email(db: Session, email: str) -> Optional[User]:
    """Exact match first (existing behaviour); otherwise a case-insensitive match,
    used only when it is unambiguous."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    matches = db.query(User).filter(func.lower(User.email) == normalize_email(email)).limit(2).all()
    return matches[0] if len(matches) == 1 else None


async def _issue_session(user: User, redis_manager: RedisManager, remember_me: bool = False) -> dict:
    """JWT + Redis single-device session, exactly as /login has always done.
    Remember Me only lengthens the lifetime."""
    lifetime = timedelta(days=settings.REMEMBER_ME_DAYS) if remember_me else timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    access_token, session_id = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=lifetime,
    )
    await redis_manager.set_user_session(user.id, session_id, ttl_seconds=int(lifetime.total_seconds()))
    return {"access_token": access_token, "token_type": "bearer"}


def _check_new_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password is too long (maximum 72 bytes).")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one letter and one number.")


def _require_email_delivery() -> None:
    if not email_service.enabled:
        logger.error("Auth email requested but no email transport is configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured on this server. Please contact support.",
        )


def _too_many(wait_seconds: int, what: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Please wait {wait_seconds} seconds before requesting another {what}.",
        headers={"Retry-After": str(wait_seconds)},
    )


def _queue_signup_notification(background_tasks: BackgroundTasks, user: User) -> None:
    """Same best-effort admin notification that /register sends."""
    try:
        admin_email = settings.ADMIN_NOTIFICATION_EMAIL or os.getenv('ADMIN_NOTIFICATION_EMAIL', '')
        if admin_email:
            registered_at = user.created_at.replace(tzinfo=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC') if user.created_at else 'N/A'
            background_tasks.add_task(
                email_service.send_new_signup_notification, admin_email, user.email, user.id, registered_at,
            )
    except Exception:
        pass


def _create_user(db: Session, email: str, hashed_password: str) -> Optional[User]:
    """Create a normal user; None if the email was taken concurrently."""
    user = User(email=email, hashed_password=hashed_password, role=UserRole.USER, is_active=True)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(user)
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create account", description="Register a new user account. Returns user info (no token — call /auth/login next).")
async def register(user_data: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Register a new user."""
    if settings.REQUIRE_EMAIL_OTP:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification is required. Please sign up with a verification code.",
        )
    loop = asyncio.get_event_loop()

    # Reject disposable / temporary email addresses
    if _is_disposable_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disposable or temporary email addresses are not allowed. Please use a real email address."
        )

    existing_user = await loop.run_in_executor(
        None, lambda: db.query(User).filter(User.email == user_data.email).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # hash_password is CPU-bound (bcrypt) — offload to thread pool
    hashed_password = await loop.run_in_executor(
        None, partial(hash_password, user_data.password)
    )

    def _create_user():
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            role=UserRole.USER,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    new_user = await loop.run_in_executor(None, _create_user)

    # Notify admin of new signup (best-effort — non-blocking)
    try:
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', None) or os.getenv('ADMIN_NOTIFICATION_EMAIL', '')
        if admin_email:
            registered_at = new_user.created_at.replace(tzinfo=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC') if new_user.created_at else 'N/A'
            background_tasks.add_task(
                email_service.send_new_signup_notification,
                admin_email,
                new_user.email,
                new_user.id,
                registered_at,
            )
    except Exception:
        pass  # Never block registration over notification failure

    # Create Stripe customer (best-effort — don't block registration)
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if stripe.api_key and not stripe.api_key.startswith("sk_test_mock"):
            customer = stripe.Customer.create(
                email=user_data.email,
                metadata={"user_id": str(new_user.id)}
            )
            # Could store customer.id on user model if needed
    except Exception:
        pass  # Stripe is optional at registration time

    return new_user


@router.post("/login", response_model=Token, summary="Login", description="Authenticate with email and password. Returns a JWT access token valid for 24 hours. Logging in from a new device automatically invalidates any existing session.")
async def login(credentials: UserLogin, db: Session = Depends(get_db), redis_manager: RedisManager = Depends(get_redis_manager)):
    """Login and get JWT token. Enforces single active session per user via Redis."""
    user = _find_user_by_email(db, credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # bcrypt is CPU-bound (~100ms) — run in thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    password_ok = await loop.run_in_executor(
        None, partial(verify_password, credentials.password, user.hashed_password)
    )
    if not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Session in Redis overwrites any previous one (kicks old device)
    return await _issue_session(user, redis_manager, credentials.remember_me)


@router.post("/logout", summary="Logout", description="Invalidate the current session. The token will be rejected on all devices immediately.")
async def logout(current_user: User = Depends(get_current_user), redis_manager: RedisManager = Depends(get_redis_manager)):
    """Logout — delete session from Redis so the JWT is immediately invalidated."""
    await redis_manager.delete_user_session(current_user.id)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse, summary="Get current user", description="Returns the authenticated user's profile. Requires `Authorization: Bearer <jwt_token>`.")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.post("/refresh", response_model=Token, summary="Refresh token", description="Issue a fresh JWT token using the current valid token. Rotates the session ID — old token is immediately invalidated.")
async def refresh_token(current_user: User = Depends(get_current_user), redis_manager: RedisManager = Depends(get_redis_manager)):
    """Refresh JWT token — rotates session ID so old token is invalidated."""
    access_token, session_id = create_access_token(
        data={"sub": str(current_user.id), "email": current_user.email, "role": current_user.role.value}
    )
    from backend.config import settings
    await redis_manager.set_user_session(current_user.id, session_id, ttl_seconds=settings.JWT_EXPIRATION_HOURS * 3600)
    return {"access_token": access_token, "token_type": "bearer"}


# ==================== Sign-in options / setup status ====================

@router.get("/config", summary="Available sign-in methods",
            description="Public. Tells the frontend whether email codes can be sent and which Google OAuth client ID to use. Contains no secrets (a Google client ID is public by design).")
async def auth_config():
    return {"email_enabled": email_service.enabled, "google_client_id": settings.GOOGLE_CLIENT_ID or None}


def log_auth_setup_status() -> None:
    """Log at startup what sign-in features are usable and exactly which settings are missing (names only)."""
    email = email_service.status()
    if email["enabled"]:
        logger.info(f"Auth email: {email['transport']} transport configured, sending as {email['sender']}")
    else:
        logger.warning(
            f"Auth email NOT configured (EMAIL_TRANSPORT={email['transport']}; missing: {', '.join(email['missing'])}). "
            "Signup codes and password-reset emails will be refused with a 503 until this is set."
        )
    if settings.GOOGLE_CLIENT_ID:
        logger.info("Google Sign-In enabled")
    else:
        logger.warning("Google Sign-In disabled: GOOGLE_CLIENT_ID is not set")
    if settings.ENVIRONMENT == "production" and "localhost" in settings.FRONTEND_URL:
        logger.warning("FRONTEND_URL points to localhost in production: password-reset links will not work")


# ==================== Email signup with verification code ====================

@router.post("/signup/request-otp", response_model=OtpSentResponse, status_code=status.HTTP_202_ACCEPTED,
             summary="Send signup code",
             description="Email a 6-digit verification code (valid 10 minutes). The response is the same whether or not an account already exists; existing accounts get a sign-in notice instead of a code.")
async def signup_request_otp(payload: SignupOtpRequest, db: Session = Depends(get_db),
                             redis_manager: RedisManager = Depends(get_redis_manager)):
    email = normalize_email(payload.email)
    if _is_disposable_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disposable or temporary email addresses are not allowed. Please use a real email address.",
        )
    _require_email_delivery()

    redis = redis_manager.redis
    wait = await check_send_allowed(redis, "signup", email)
    if wait is not None:
        raise _too_many(wait, "code")

    loop = asyncio.get_event_loop()
    existing = await loop.run_in_executor(None, partial(_find_user_by_email, db, email))
    if existing:
        frontend = settings.FRONTEND_URL.rstrip("/")
        sent = await loop.run_in_executor(None, partial(
            email_service.send_account_exists_notice, existing.email, f"{frontend}/login", f"{frontend}/forgot-password"))
    else:
        code = await issue_code(redis, "signup", email)
        sent = await loop.run_in_executor(None, partial(
            email_service.send_signup_otp, email, code, settings.OTP_TTL_SECONDS // 60))
    if not sent:
        await release_send(redis, "signup", email)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't send the verification email right now. Please try again in a few minutes.",
        )
    return {
        "message": "If this email can be used for a new account, we've sent a 6-digit code to it.",
        "expires_in": settings.OTP_TTL_SECONDS,
        "resend_after": settings.OTP_RESEND_COOLDOWN_SECONDS,
    }


@router.post("/signup/verify-otp", response_model=SignupVerifiedResponse, summary="Verify signup code",
             description="Check the emailed code. Returns a short-lived, single-use token for /auth/signup/complete.")
async def signup_verify_otp(payload: SignupOtpVerify, redis_manager: RedisManager = Depends(get_redis_manager)):
    email = normalize_email(payload.email)
    redis = redis_manager.redis
    result = await verify_code(redis, "signup", email, payload.otp)
    if result == "invalid":
        raise HTTPException(status_code=400, detail="Incorrect code. Please check the email and try again.")
    if result == "locked":
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many incorrect attempts. Please request a new code.")
    if result == "expired":
        raise HTTPException(status_code=400, detail="This code has expired or was already used. Please request a new code.")
    token = await issue_token(redis, "signup", email, settings.SIGNUP_TOKEN_TTL_SECONDS)
    return {"signup_token": token, "expires_in": settings.SIGNUP_TOKEN_TTL_SECONDS}


@router.post("/signup/complete", response_model=Token, status_code=status.HTTP_201_CREATED,
             summary="Create account after verification",
             description="Set the password for a verified email, create the account and sign in.")
async def signup_complete(payload: SignupComplete, background_tasks: BackgroundTasks, db: Session = Depends(get_db),
                          redis_manager: RedisManager = Depends(get_redis_manager)):
    _check_new_password(payload.password)  # before the token is used, so a weak password doesn't burn it
    email = await consume_token(redis_manager.redis, "signup", payload.signup_token)
    if not email:
        raise HTTPException(status_code=400, detail="Your email verification has expired. Please start again.")

    loop = asyncio.get_event_loop()
    if await loop.run_in_executor(None, partial(_find_user_by_email, db, email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An account with this email already exists. Please sign in.")
    hashed = await loop.run_in_executor(None, partial(hash_password, payload.password))
    user = await loop.run_in_executor(None, partial(_create_user, db, email, hashed))
    if user is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An account with this email already exists. Please sign in.")
    _queue_signup_notification(background_tasks, user)
    return await _issue_session(user, redis_manager)


# ==================== Forgot / reset password ====================

@router.post("/password/forgot", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED,
             summary="Request password reset",
             description="Email a single-use reset link (valid 30 minutes) if an account exists. The response never reveals whether it does.")
async def password_forgot(payload: PasswordForgotRequest, db: Session = Depends(get_db),
                          redis_manager: RedisManager = Depends(get_redis_manager)):
    email = normalize_email(payload.email)
    _require_email_delivery()
    redis = redis_manager.redis
    wait = await check_send_allowed(redis, "reset", email)
    if wait is not None:
        raise _too_many(wait, "reset email")

    generic = {"message": "If an account exists for this email, we've sent a password reset link."}
    loop = asyncio.get_event_loop()
    user = await loop.run_in_executor(None, partial(_find_user_by_email, db, email))
    # Admin passwords are managed separately and are never reset by email
    if not user or not user.is_active or user.role == UserRole.ADMIN:
        return generic

    ttl = settings.PASSWORD_RESET_TTL_SECONDS
    token = await issue_token(redis, "reset", str(user.id), ttl)
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password#token={token}"
    sent = await loop.run_in_executor(None, partial(email_service.send_password_reset, user.email, link, ttl // 60))
    if not sent:
        # Same response either way, so the outcome never reveals whether the account exists
        await release_send(redis, "reset", email)
        logger.error(f"Password reset email could not be sent for user {user.id}")
    return generic


@router.post("/password/reset", response_model=MessageResponse, summary="Set a new password",
             description="Use the token from the reset link to set a new password. The link works once; other sessions are signed out.")
async def password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db),
                         redis_manager: RedisManager = Depends(get_redis_manager)):
    _check_new_password(payload.password)
    invalid = HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a new one.")
    user_id = await consume_token(redis_manager.redis, "reset", payload.token)
    if not user_id:
        raise invalid

    loop = asyncio.get_event_loop()
    hashed = await loop.run_in_executor(None, partial(hash_password, payload.password))

    def _update() -> bool:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active or user.role == UserRole.ADMIN:
            return False
        user.hashed_password = hashed
        db.commit()
        return True

    if not await loop.run_in_executor(None, _update):
        raise invalid
    await redis_manager.delete_user_session(int(user_id))
    return {"message": "Your password has been updated. You can now sign in."}


# ==================== Google Sign-In ====================

@router.post("/google", response_model=Token, summary="Sign in with Google",
             description="Exchange a Google Identity Services ID token for an AIRent session. Creates the account on first sign-in; links to an existing account with the same verified email.")
async def google_login(payload: GoogleLoginRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db),
                       redis_manager: RedisManager = Depends(get_redis_manager)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Google sign-in is not configured on this server.")
    loop = asyncio.get_event_loop()
    try:
        claims = await loop.run_in_executor(
            None, partial(google_verifier.verify, payload.credential, settings.GOOGLE_CLIENT_ID))
    except GoogleTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Google sign-in failed: {e}.")
    except GoogleKeysUnavailable as e:
        logger.error(f"Google sign-in unavailable: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Google sign-in is temporarily unavailable. Please try again.")

    email = normalize_email(claims["email"])
    user = await loop.run_in_executor(None, partial(_find_user_by_email, db, email))
    if user:
        if user.role == UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Admin accounts must sign in with email and password.")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    else:
        # Google-only account: random unusable password; "Forgot password" can set a real one
        hashed = await loop.run_in_executor(None, partial(hash_password, secrets.token_urlsafe(32)))
        user = await loop.run_in_executor(None, partial(_create_user, db, email, hashed))
        if user is None:  # created concurrently by another request
            user = await loop.run_in_executor(None, partial(_find_user_by_email, db, email))
            if user is None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Please try signing in again.")
        else:
            _queue_signup_notification(background_tasks, user)
    return await _issue_session(user, redis_manager, payload.remember_me)
