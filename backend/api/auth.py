"""Authentication API endpoints."""
import asyncio
from functools import partial
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.database.models import User, UserRole
from backend.api.schemas import UserRegister, UserLogin, Token, UserResponse
from backend.services.auth_utils import verify_password, hash_password, create_access_token
from backend.api.dependencies import get_current_user
from backend.database.redis_manager import get_redis_manager, RedisManager

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create account", description="Register a new user account. Returns user info (no token — call /auth/login next).")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    loop = asyncio.get_event_loop()

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

    # Create Stripe customer (best-effort — don't block registration)
    try:
        import stripe
        from backend.config import settings
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
    user = db.query(User).filter(User.email == credentials.email).first()
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

    access_token, session_id = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    # Store session in Redis — overwrites any previous session (kicks old device)
    from backend.config import settings
    await redis_manager.set_user_session(user.id, session_id, ttl_seconds=settings.JWT_EXPIRATION_HOURS * 3600)

    return {"access_token": access_token, "token_type": "bearer"}


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
