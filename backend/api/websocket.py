"""WebSocket endpoint for real-time rental updates.

Provides live TTL countdown, token balance, and usage updates
so the frontend doesn't need to poll.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.database.redis_manager import get_redis_manager
from backend.database.connection import SessionLocal
from backend.database.models import Rental, RentalStatus

logger = logging.getLogger(__name__)

router = APIRouter()

# Track active connections: rental_id -> set of websockets
active_connections: Dict[int, Set[WebSocket]] = {}


class ConnectionManager:
    """Manages WebSocket connections per rental."""

    def __init__(self):
        self.connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, rental_id: int):
        await websocket.accept()
        if rental_id not in self.connections:
            self.connections[rental_id] = set()
        self.connections[rental_id].add(websocket)
        logger.info(f"WebSocket connected for rental {rental_id}")

    def disconnect(self, websocket: WebSocket, rental_id: int):
        if rental_id in self.connections:
            self.connections[rental_id].discard(websocket)
            if not self.connections[rental_id]:
                del self.connections[rental_id]
        logger.info(f"WebSocket disconnected for rental {rental_id}")

    async def broadcast(self, rental_id: int, data: dict):
        if rental_id in self.connections:
            dead = set()
            for ws in self.connections[rental_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.connections[rental_id].discard(ws)


manager = ConnectionManager()


@router.websocket("/ws/rentals/{rental_id}")
async def rental_websocket(websocket: WebSocket, rental_id: int):
    """WebSocket for real-time rental updates.

    Sends every 2 seconds:
    - ttl_seconds: remaining time
    - tokens_remaining: current token balance
    - tokens_used: tokens consumed
    - status: active/expired
    """
    await manager.connect(websocket, rental_id)

    try:
        while True:
            try:
                redis_mgr = get_redis_manager()
                db = SessionLocal()

                try:
                    rental = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: db.query(Rental).filter(Rental.id == rental_id).first()
                    )
                    if not rental:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Rental not found"
                        })
                        break

                    # Fetch TTL and token balance concurrently
                    async def _zero(): return 0
                    ttl_raw, token_balance = await asyncio.gather(
                        redis_mgr.get_virtual_key_ttl(rental.virtual_key) if rental.virtual_key else _zero(),
                        redis_mgr.get_token_balance(rental_id)
                    )
                    ttl = ttl_raw if ttl_raw and ttl_raw > 0 else max(0, int((rental.expires_at - datetime.utcnow()).total_seconds()))

                    status = rental.status.value
                    if ttl <= 0 and status == "active":
                        status = "expired"

                    update = {
                        "type": "rental_update",
                        "rental_id": rental_id,
                        "ttl_seconds": max(0, ttl),
                        "tokens_remaining": token_balance,
                        "tokens_used": rental.tokens_used,
                        "requests_made": rental.requests_made,
                        "status": status,
                        "timestamp": datetime.utcnow().isoformat()
                    }

                    await websocket.send_json(update)

                finally:
                    db.close()

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.debug(f"WebSocket update error: {e}")

            # Wait 2 seconds before next update
            await asyncio.sleep(2)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, rental_id)


@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """WebSocket for dashboard — streams updates for ALL active rentals of a user.

    Client sends: {"user_id": 123}
    Server streams rental updates every 3 seconds.
    """
    await websocket.accept()

    try:
        # Wait for client to send user_id
        init_data = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        user_id = init_data.get("user_id")
        if not user_id:
            await websocket.send_json({"type": "error", "message": "user_id required"})
            return

        while True:
            try:
                redis_mgr = get_redis_manager()
                db = SessionLocal()

                try:
                    rentals = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: db.query(Rental).filter(
                            Rental.user_id == user_id,
                            Rental.status == RentalStatus.ACTIVE
                        ).all()
                    )

                    async def _zero(): return 0

                    # Fetch all TTLs and balances concurrently
                    ttl_tasks = [
                        redis_mgr.get_virtual_key_ttl(r.virtual_key) if r.virtual_key else _zero()
                        for r in rentals
                    ]
                    balance_tasks = [redis_mgr.get_token_balance(r.id) for r in rentals]
                    ttl_results, balance_results = await asyncio.gather(
                        asyncio.gather(*ttl_tasks),
                        asyncio.gather(*balance_tasks)
                    )

                    updates = []
                    for rental, ttl_raw, token_balance in zip(rentals, ttl_results, balance_results):
                        ttl = ttl_raw if ttl_raw and ttl_raw > 0 else max(
                            0, int((rental.expires_at - datetime.utcnow()).total_seconds())
                        )
                        updates.append({
                            "rental_id": rental.id,
                            "ttl_seconds": max(0, ttl),
                            "tokens_remaining": token_balance,
                            "tokens_used": rental.tokens_used,
                            "requests_made": rental.requests_made,
                            "status": "expired" if ttl <= 0 else "active"
                        })

                    await websocket.send_json({
                        "type": "dashboard_update",
                        "rentals": updates,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                finally:
                    db.close()

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.debug(f"Dashboard WS error: {e}")

            await asyncio.sleep(3)

    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
