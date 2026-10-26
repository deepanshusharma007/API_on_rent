"""WebSocket endpoints for real-time rental updates (live TTL countdown, balance, usage).

Authentication: browsers cannot set headers on a WebSocket and a token in the URL ends up
in server logs, so the client's FIRST message must be {"token": "<jwt>"}. Nothing is sent
before that, and a rental socket is only served to the rental's owner (or an admin).
"""
import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from backend.api.dependencies import authenticate_token
from backend.database.connection import SessionLocal
from backend.database.models import Rental, RentalStatus, UserRole
from backend.database.redis_manager import get_redis_manager

logger = logging.getLogger(__name__)

router = APIRouter()

AUTH_TIMEOUT_SECONDS = 10
MAX_SOCKETS_PER_USER = 10   # each socket polls the database, so cap them

# Close codes (4000-4999 are application-defined)
CLOSE_UNAUTHORIZED = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_TOO_MANY = 4429

_open_sockets: dict[int, int] = defaultdict(int)


async def _authenticate(websocket: WebSocket):
    """Accept the socket and read the token message. Returns the user, or None after
    closing the socket with the reason."""
    await websocket.accept()
    try:
        first = await asyncio.wait_for(websocket.receive_text(), timeout=AUTH_TIMEOUT_SECONDS)
        token = json.loads(first).get("token")
        if not isinstance(token, str) or not token:
            raise ValueError("no token")
    except WebSocketDisconnect:
        return None
    except Exception:
        await websocket.close(code=CLOSE_UNAUTHORIZED, reason="Authentication required")
        return None

    db = SessionLocal()
    try:
        user = await authenticate_token(token, db, get_redis_manager())
    except HTTPException:
        await websocket.close(code=CLOSE_UNAUTHORIZED, reason="Invalid or expired token")
        return None
    finally:
        db.close()

    if _open_sockets[user.id] >= MAX_SOCKETS_PER_USER:
        await websocket.close(code=CLOSE_TOO_MANY, reason="Too many open connections")
        return None
    return user


def _fetch_rentals(user_id: int, rental_id: int | None, is_admin: bool):
    """Rentals to report (runs in a worker thread, short-lived session)."""
    db = SessionLocal()
    try:
        query = db.query(Rental)
        if rental_id is not None:
            query = query.filter(Rental.id == rental_id)
            if not is_admin:
                query = query.filter(Rental.user_id == user_id)
        else:
            query = query.filter(Rental.user_id == user_id, Rental.status == RentalStatus.ACTIVE)
        rentals = query.all()
        # Detach plain values so the session can close before we await Redis
        return [
            {
                "id": r.id, "virtual_key": r.virtual_key, "status": r.status.value,
                "tokens_used": r.tokens_used, "requests_made": r.requests_made,
                "expires_at": r.expires_at,
            }
            for r in rentals
        ]
    finally:
        db.close()


async def _snapshot(rental: dict) -> dict:
    redis_mgr = get_redis_manager()
    ttl_raw, balance = await asyncio.gather(
        redis_mgr.get_virtual_key_ttl(rental["virtual_key"]),
        redis_mgr.get_token_balance(rental["id"]),
    )
    ttl = ttl_raw if ttl_raw and ttl_raw > 0 else int((rental["expires_at"] - datetime.utcnow()).total_seconds())
    ttl = max(0, ttl)
    status = rental["status"]
    if ttl <= 0 and status == "active":
        status = "expired"
    return {
        "rental_id": rental["id"],
        "ttl_seconds": ttl,
        "tokens_remaining": balance,
        "tokens_used": rental["tokens_used"],
        "requests_made": rental["requests_made"],
        "status": status,
    }


async def _stream(websocket: WebSocket, user, rental_id: int | None, interval: int):
    loop = asyncio.get_event_loop()
    is_admin = user.role == UserRole.ADMIN
    _open_sockets[user.id] += 1
    try:
        while True:
            rentals = await loop.run_in_executor(None, _fetch_rentals, user.id, rental_id, is_admin)
            if rental_id is not None:
                if not rentals:
                    # Same answer for "missing" and "not yours": IDs can't be probed
                    await websocket.send_json({"type": "error", "message": "Rental not found"})
                    await websocket.close(code=CLOSE_FORBIDDEN)
                    return
                payload = {"type": "rental_update", **await _snapshot(rentals[0])}
            else:
                payload = {"type": "dashboard_update", "rentals": [await _snapshot(r) for r in rentals]}
            payload["timestamp"] = datetime.utcnow().isoformat()
            await websocket.send_json(payload)
            await asyncio.sleep(interval)
    except (WebSocketDisconnect, RuntimeError):
        pass   # client went away
    except Exception as e:
        logger.warning(f"WebSocket stream error: {e}")
    finally:
        _open_sockets[user.id] -= 1
        if _open_sockets[user.id] <= 0:
            _open_sockets.pop(user.id, None)


@router.websocket("/ws/rentals/{rental_id}")
async def rental_websocket(websocket: WebSocket, rental_id: int):
    """Live updates for one rental, every 2 seconds. Owner or admin only."""
    user = await _authenticate(websocket)
    if user:
        await _stream(websocket, user, rental_id, interval=2)


@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """Live updates for all of the signed-in user's active rentals, every 3 seconds."""
    user = await _authenticate(websocket)
    if user:
        await _stream(websocket, user, None, interval=3)
