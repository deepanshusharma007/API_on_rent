"""In-app support chat — user <-> admin WebSocket + REST."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Set

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_current_admin, get_db
from backend.database.models import ChatMessage, User

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------

class ChatConnectionManager:
    def __init__(self):
        self.user_sockets: Dict[int, Set[WebSocket]] = {}
        self.admin_sockets: Set[WebSocket] = set()

    async def connect_user(self, ws: WebSocket, user_id: int):
        await ws.accept()
        self.user_sockets.setdefault(user_id, set()).add(ws)

    def disconnect_user(self, ws: WebSocket, user_id: int):
        if user_id in self.user_sockets:
            self.user_sockets[user_id].discard(ws)
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]

    async def connect_admin(self, ws: WebSocket):
        await ws.accept()
        self.admin_sockets.add(ws)

    def disconnect_admin(self, ws: WebSocket):
        self.admin_sockets.discard(ws)

    async def send_to_user(self, user_id: int, data: dict):
        for ws in list(self.user_sockets.get(user_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.user_sockets[user_id].discard(ws)

    async def broadcast_admin(self, data: dict):
        for ws in list(self.admin_sockets):
            try:
                await ws.send_json(data)
            except Exception:
                self.admin_sockets.discard(ws)


manager = ChatConnectionManager()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SendMessageRequest(BaseModel):
    content: str


def _msg(m: ChatMessage) -> dict:
    return {
        "id": m.id,
        "sender": m.sender,
        "content": m.content,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------

@router.get("/chat/messages")
async def get_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    # Mark all admin messages as read
    for m in msgs:
        if m.sender == "admin" and not m.is_read:
            m.is_read = True
    db.commit()
    return [_msg(m) for m in msgs]


@router.post("/chat/messages")
async def send_message(
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = body.content.strip()
    if not content:
        from fastapi import HTTPException
        raise HTTPException(400, "Message cannot be empty")

    msg = ChatMessage(
        user_id=current_user.id,
        sender="user",
        content=content,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    payload = {
        "type": "new_message",
        "user_id": current_user.id,
        "user_email": current_user.email,
        "message": _msg(msg),
    }
    await manager.broadcast_admin(payload)
    return _msg(msg)


@router.get("/chat/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.user_id == current_user.id,
            ChatMessage.sender == "admin",
            ChatMessage.is_read == False,
        )
        .count()
    )
    return {"count": count}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("/admin/threads")
async def list_threads(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ChatMessage.user_id, User.email)
        .join(User, User.id == ChatMessage.user_id)
        .distinct(ChatMessage.user_id)
        .all()
    )
    threads = []
    for user_id, email in rows:
        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.user_id == user_id,
                ChatMessage.sender == "user",
                ChatMessage.is_read == False,
            )
            .count()
        )
        last = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        threads.append({
            "user_id": user_id,
            "email": email,
            "unread": unread,
            "last_message": _msg(last) if last else None,
        })
    threads.sort(key=lambda t: t["last_message"]["created_at"] if t["last_message"] else "", reverse=True)
    return threads


@router.get("/admin/threads/{user_id}")
async def get_thread(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    # Mark user messages as read
    for m in msgs:
        if m.sender == "user" and not m.is_read:
            m.is_read = True
    db.commit()
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "user": {"id": user.id, "email": user.email} if user else None,
        "messages": [_msg(m) for m in msgs],
    }


@router.post("/admin/threads/{user_id}/reply")
async def admin_reply(
    user_id: int,
    body: SendMessageRequest,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    content = body.content.strip()
    if not content:
        from fastapi import HTTPException
        raise HTTPException(400, "Message cannot be empty")

    msg = ChatMessage(
        user_id=user_id,
        sender="admin",
        content=content,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    await manager.send_to_user(user_id, {
        "type": "admin_reply",
        "message": _msg(msg),
    })
    return _msg(msg)


# ---------------------------------------------------------------------------
# WebSocket endpoints
# ---------------------------------------------------------------------------

@router.websocket("/ws/chat/user/{user_id}")
async def ws_user(ws: WebSocket, user_id: int):
    await manager.connect_user(ws, user_id)
    try:
        while True:
            await ws.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        manager.disconnect_user(ws, user_id)


@router.websocket("/ws/chat/admin")
async def ws_admin(ws: WebSocket):
    await manager.connect_admin(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_admin(ws)
