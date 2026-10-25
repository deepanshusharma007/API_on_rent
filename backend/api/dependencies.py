"""Shared API dependencies for authentication and authorization."""
import asyncio
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.database.models import User, UserRole
from backend.services.auth_utils import decode_access_token
from backend.database.redis_manager import get_redis_manager, RedisManager

# Security scheme
security = HTTPBearer()


async def authenticate_token(token: str, db: Session, redis_manager: RedisManager) -> User:
    """Validate a JWT and return its user. Also validates the session against Redis to
    enforce single-device login: if the user logged in on another device this raises 401.
    Shared by the REST dependency and the WebSocket endpoints."""
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # ── Single-device session check via Redis ──
    token_session_id = payload.get("sid")
    if token_session_id:
        active_session_id = await redis_manager.get_user_session(int(user_id))
        if active_session_id is None or active_session_id != token_session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. You have been logged in on another device.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    loop = asyncio.get_event_loop()
    user = await loop.run_in_executor(
        None, lambda: db.query(User).filter(User.id == int(user_id)).first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager),
) -> User:
    """Authenticated user from the Bearer token."""
    return await authenticate_token(credentials.credentials, db, redis_manager)


def rate_limit(scope: str, limit: int, window_seconds: int):
    """Dependency: allow `limit` calls per `window_seconds` per client IP for a public
    endpoint (login, signup, contact...). Behind a proxy the IP is only the real client's
    if uvicorn runs with --proxy-headers (see the Dockerfile and render.yaml)."""
    async def dependency(request: Request, redis_manager: RedisManager = Depends(get_redis_manager)):
        ip = request.client.host if request.client else "unknown"
        if not await redis_manager.hit_limit(f"rl:{scope}:{ip}", limit, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )
    return dependency


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify user has admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
