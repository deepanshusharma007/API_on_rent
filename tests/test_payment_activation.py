"""
Regression tests: Cashfree payment -> rental activation must not wait on SMTP.

Covers the fix for the activation delay:
  - SMTP connections use a finite timeout (both call sites)
  - The Cashfree webhook responds while the activation email is still blocked
  - Cashfree purchases send exactly one activation email (human-readable expiry)
  - Duplicate webhooks stay idempotent
  - Invalid signatures are rejected, failed payments ignored
  - The direct marketplace purchase still sends its (unchanged) email, non-blocking

Self-contained: in-memory SQLite, mocked Redis/capacity/SMTP, signed payloads
built with the same HMAC rules as production. No running server, network or
real credentials needed.

Run:
    python -m pytest tests/test_payment_activation.py -v
"""

import os
import sys
import json
import time
import hmac
import base64
import socket
import asyncio
import hashlib
import threading
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock, patch

# Isolated test config -- set before any backend import so no real DB/secrets are used.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["USE_FAKE_REDIS"] = "false"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "test-admin-pass"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import settings
from backend.database.connection import Base, get_db
from backend.database.models import Plan, Rental, RentalStatus, Transaction, User, UserRole
from backend.database.redis_manager import get_redis_manager
from backend.api.dependencies import get_current_user
from backend.api import payment, marketplace
from backend.services import email_service as email_module
from backend.services.virtual_key_service import create_rental

WEBHOOK_SECRET = "test-webhook-secret"
PLAN_MINUTES = 10


# -- Helpers -------------------------------------------------------------------

class BlockingEmail:
    """Stand-in for send_rental_activated that hangs like an unreachable SMTP host."""

    def __init__(self):
        self.started = threading.Event()
        self.release = threading.Event()
        self.finished = threading.Event()
        self.calls = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        self.started.set()
        self.release.wait(timeout=10)
        self.finished.set()


def _sign(body: bytes, timestamp: str, secret: str = WEBHOOK_SECRET) -> str:
    # Same algorithm as payment._verify_cashfree_webhook: base64(HMAC-SHA256(ts + body))
    message = timestamp + body.decode("utf-8")
    return base64.b64encode(hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()).decode()


def _webhook_body(order_id: str, payment_status: str = "SUCCESS") -> bytes:
    return json.dumps({
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {
            "order": {"order_id": order_id, "order_amount": 49.0},
            "payment": {"cf_payment_id": 123456, "payment_status": payment_status},
        },
    }).encode()


def _post_webhook(client, body: bytes, signature: str = None):
    ts = str(int(time.time()))
    sig = signature if signature is not None else _sign(body, ts)
    return client.post(
        "/api/webhooks/cashfree",
        content=body,
        headers={"x-webhook-timestamp": ts, "x-webhook-signature": sig, "Content-Type": "application/json"},
    )


# -- Fixtures ------------------------------------------------------------------

@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def seed(db):
    user = User(email="buyer@test.local", hashed_password="x")
    plan = Plan(name="10 min", price=49.0, duration_minutes=PLAN_MINUTES,
                token_cap=20000, rpm_limit=10, is_active=True)
    db.add_all([user, plan])
    db.commit()
    return user.id, plan.id


@pytest.fixture
def redis_mock():
    mgr = MagicMock()
    mgr.set_virtual_key_ttl = AsyncMock()
    mgr.set_token_balance = AsyncMock()
    mgr.get_virtual_key_ttl = AsyncMock(return_value=PLAN_MINUTES * 60)
    mgr.delete_virtual_key = AsyncMock()
    # Raw client used by the webhook's per-order lock
    mgr.redis.set = AsyncMock(return_value=True)
    mgr.redis.get = AsyncMock(return_value=None)
    mgr.redis.delete = AsyncMock()
    return mgr


@pytest.fixture
def capacity_mock():
    cap = MagicMock()
    cap.reserve_capacity = AsyncMock()
    cap.can_sell_plan = AsyncMock(return_value={"allowed": True, "reason": ""})
    return cap


@pytest.fixture
def blocking_email():
    fake = BlockingEmail()
    with patch.object(email_module.email_service, "send_rental_activated", side_effect=fake):
        yield fake
    fake.release.set()


@pytest.fixture
def app(db, redis_mock, capacity_mock, monkeypatch):
    monkeypatch.setattr(settings, "CASHFREE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(payment, "CapacityManager", lambda _r: capacity_mock)
    monkeypatch.setattr(marketplace, "CapacityManager", lambda _r: capacity_mock)

    test_app = FastAPI()
    test_app.include_router(payment.router, prefix="/api")
    test_app.include_router(marketplace.router, prefix="/api")
    test_app.dependency_overrides[get_db] = lambda: db
    test_app.dependency_overrides[get_redis_manager] = lambda: redis_mock
    return test_app


# -- SMTP timeout --------------------------------------------------------------

def _enabled_email_service():
    svc = email_module.EmailService()
    svc.transport = "smtp"  # never the real transport from a developer's .env
    svc.host, svc.port, svc.user, svc.password = "smtp.test.local", 587, "u", "p"
    svc.enabled = True
    return svc


def test_smtp_send_uses_finite_timeout():
    svc = _enabled_email_service()
    with patch.object(email_module.smtplib, "SMTP") as smtp:
        svc.send_rental_activated("a@test.local", "10 min", "vk_x", "2026-01-01 00:10 UTC", 20000)
    smtp.assert_called_once_with("smtp.test.local", 587, timeout=10)


def test_contact_form_smtp_uses_finite_timeout():
    svc = _enabled_email_service()
    with patch.object(email_module.smtplib, "SMTP") as smtp:
        svc.send_contact_form("Name", "s@test.local", "Subj", "Msg", "owner@test.local")
    smtp.assert_called_once_with("smtp.test.local", 587, timeout=10)


def test_smtp_timeout_keeps_existing_error_handling():
    """_send (activation/expiry emails) still swallows errors; contact form still re-raises."""
    svc = _enabled_email_service()
    with patch.object(email_module.smtplib, "SMTP", side_effect=socket.timeout("timed out")):
        svc.send_rental_expired("a@test.local", "10 min")  # must not raise
        with pytest.raises(socket.timeout):
            svc.send_contact_form("Name", "s@test.local", "Subj", "Msg", "owner@test.local")


# -- Cashfree webhook ----------------------------------------------------------

def test_webhook_returns_while_email_blocked(app, db, seed, redis_mock, capacity_mock, blocking_email):
    user_id, plan_id = seed
    order_id = f"order_{plan_id}_{user_id}_gateway_{int(time.time())}"

    with TestClient(app) as client:
        t0 = time.monotonic()
        resp = _post_webhook(client, _webhook_body(order_id))
        elapsed = time.monotonic() - t0

        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "success"
        assert elapsed < 2.0, f"webhook took {elapsed:.2f}s -- still waiting on email"
        assert blocking_email.started.wait(5), "activation email was never dispatched"
        assert not blocking_email.finished.is_set(), "email finished before response -- not off the critical path"

        # Rental fully provisioned before the email completes
        rental = db.query(Rental).filter(Rental.user_id == user_id).one()
        assert rental.status == RentalStatus.ACTIVE
        assert rental.expires_at - rental.started_at == timedelta(minutes=PLAN_MINUTES)
        assert rental.tokens_remaining == 20000
        assert rental.virtual_key.startswith("vk_")
        redis_mock.set_virtual_key_ttl.assert_awaited_once()
        redis_mock.set_token_balance.assert_awaited_once_with(rental.id, 20000)
        capacity_mock.reserve_capacity.assert_awaited_once_with(20000, 10)

        blocking_email.release.set()
        assert blocking_email.finished.wait(5)


def test_webhook_sends_exactly_one_readable_email(app, db, seed, blocking_email):
    user_id, plan_id = seed
    order_id = f"order_{plan_id}_{user_id}_gateway_{int(time.time())}"
    blocking_email.release.set()

    with TestClient(app) as client:
        assert _post_webhook(client, _webhook_body(order_id)).json()["status"] == "success"
        assert blocking_email.finished.wait(5)
        time.sleep(0.2)  # allow any (incorrect) second email to land

    rental = db.query(Rental).filter(Rental.user_id == user_id).one()
    assert len(blocking_email.calls) == 1
    call = blocking_email.calls[0]
    assert call["email"] == "buyer@test.local"
    assert call["virtual_key"] == rental.virtual_key
    assert call["expires_at"] == rental.expires_at.strftime("%Y-%m-%d %H:%M UTC")
    assert call["plan_name"] == "10 min" and call["token_cap"] == 20000


def test_duplicate_webhook_is_idempotent(app, db, seed, blocking_email):
    user_id, plan_id = seed
    order_id = f"order_{plan_id}_{user_id}_gateway_{int(time.time())}"
    blocking_email.release.set()
    body = _webhook_body(order_id)

    with TestClient(app) as client:
        assert _post_webhook(client, body).json()["status"] == "success"
        assert _post_webhook(client, body).json()["status"] == "already_processed"
        time.sleep(0.2)

    assert db.query(Transaction).filter(Transaction.cashfree_order_id == order_id).count() == 1
    assert db.query(Rental).filter(Rental.user_id == user_id).count() == 1
    assert len(blocking_email.calls) == 1


def test_invalid_signature_rejected(app, db, seed, blocking_email):
    user_id, plan_id = seed
    order_id = f"order_{plan_id}_{user_id}_gateway_{int(time.time())}"
    body = _webhook_body(order_id)
    bad_sig = _sign(body, str(int(time.time())), secret="wrong-secret")

    with TestClient(app) as client:
        resp = _post_webhook(client, body, signature=bad_sig)

    assert resp.status_code == 400
    assert db.query(Transaction).count() == 0
    assert db.query(Rental).count() == 0
    assert blocking_email.calls == []


def test_failed_payment_ignored(app, db, seed, blocking_email):
    user_id, plan_id = seed
    order_id = f"order_{plan_id}_{user_id}_gateway_{int(time.time())}"

    with TestClient(app) as client:
        resp = _post_webhook(client, _webhook_body(order_id, payment_status="FAILED"))

    assert resp.status_code == 200
    assert resp.json()["status"] == "ignored"
    assert db.query(Transaction).count() == 0
    assert db.query(Rental).count() == 0
    assert blocking_email.calls == []


# -- Direct marketplace purchase (create_rental default behaviour) ------------

def test_create_rental_default_still_emails_without_blocking(db, seed, redis_mock, blocking_email):
    user_id, plan_id = seed

    async def run():
        t0 = time.monotonic()
        rental = await create_rental(user_id, plan_id, db, redis_mock, provider="openai")
        elapsed = time.monotonic() - t0
        assert elapsed < 2.0, f"create_rental took {elapsed:.2f}s -- still waiting on email"
        assert await asyncio.to_thread(blocking_email.started.wait, 5)
        assert not blocking_email.finished.is_set()
        blocking_email.release.set()
        assert await asyncio.to_thread(blocking_email.finished.wait, 5)
        return rental

    rental = asyncio.run(run())
    assert rental.expires_at - rental.started_at == timedelta(minutes=PLAN_MINUTES)
    assert len(blocking_email.calls) == 1
    call = blocking_email.calls[0]
    # Unchanged marketplace email: same fields, ISO-format expiry as before
    assert call["virtual_key"] == rental.virtual_key
    assert call["expires_at"] == rental.expires_at.isoformat()


def test_marketplace_purchase_route_still_works(app, db, seed, blocking_email):
    # The direct (no-payment) route is an admin-only injection workflow
    user_id, plan_id = seed
    user = db.query(User).filter(User.id == user_id).one()
    user.role = UserRole.ADMIN
    db.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as client:
        t0 = time.monotonic()
        resp = client.post("/api/rentals/purchase", json={"plan_id": plan_id, "provider": "openai"})
        elapsed = time.monotonic() - t0

        assert resp.status_code == 201, resp.text
        assert elapsed < 2.0, f"purchase took {elapsed:.2f}s -- still waiting on email"
        data = resp.json()
        assert data["status"] == "active"
        assert data["virtual_key"].startswith("vk_")
        assert data["ttl_seconds"] == PLAN_MINUTES * 60
        assert blocking_email.started.wait(5)
        blocking_email.release.set()
        assert blocking_email.finished.wait(5)

    assert len(blocking_email.calls) == 1
    assert blocking_email.calls[0]["virtual_key"] == data["virtual_key"]
