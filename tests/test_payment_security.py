"""
Regression tests: Cashfree payment security fixes.

Covers:
  1  Webhook authentication fails closed: both signature headers required, a configured
     secret required, HMAC over the raw body, nothing processed before verification,
     malformed / non-UTF-8 bodies rejected with 4xx, signature values never logged
  2  POST /api/rentals/purchase (no payment) is admin-only; Cashfree checkout unaffected
  3  A failed activation is not recorded as a completed payment: non-2xx, generic error,
     redelivery creates exactly one rental, Transaction.rental_id is set; partial
     create_rental failures and payment-record failures leave no usable rental behind
     (key and token balance revoked; cleanup failures logged, never raised or leaked)
  4  Concurrent deliveries of one order are processed once (owned, expiring Redis lock,
     atomic compare-and-delete release)

Real payment/marketplace routers, real create_rental, real RedisManager on an isolated
in-memory FakeRedis. In-memory SQLite, capacity + email mocked. No network, no Cashfree,
no real credentials.

Run:
    python -m pytest tests/test_payment_security.py -v
"""

import os
import sys
import json
import time
import hmac
import base64
import asyncio
import hashlib
import logging
from unittest.mock import AsyncMock, MagicMock, patch

# Isolated test config -- set before any backend import so no real DB/secrets are used.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["USE_FAKE_REDIS"] = "false"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "test-admin-pass"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
import pytest
import fakeredis
from fakeredis import aioredis as fake_aioredis
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import settings
from backend.database.connection import Base, get_db
from backend.database.models import Plan, Rental, Transaction, User, UserRole
from backend.database.redis_manager import RedisManager, get_redis_manager
from backend.api.dependencies import get_current_user
from backend.api import payment, marketplace
from backend.services import email_service as email_module
from backend.services.virtual_key_service import create_rental as real_create_rental

SECRET = "test-webhook-secret"


# -- Helpers -------------------------------------------------------------------

def _sign(body: bytes, timestamp: str, secret: str = SECRET) -> str:
    # Cashfree: base64(HMAC-SHA256(timestamp + raw body))
    return base64.b64encode(hmac.new(secret.encode(), timestamp.encode() + body, hashlib.sha256).digest()).decode()


def _body(order_id: str, payment_status: str = "SUCCESS") -> bytes:
    return json.dumps({
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {"order": {"order_id": order_id, "order_amount": 499.0, "order_currency": "INR"},
                 "payment": {"cf_payment_id": 1, "payment_status": payment_status}},
    }).encode()


def _signed_headers(body: bytes, secret: str = SECRET) -> dict:
    ts = str(int(time.time()))
    return {"x-webhook-timestamp": ts, "x-webhook-signature": _sign(body, ts, secret), "Content-Type": "application/json"}


def _counts(db):
    db.expire_all()
    return db.query(Transaction).count(), db.query(Rental).count()


def _run(client, coro):
    """Run a coroutine on the TestClient's event loop (the FakeRedis client is loop-bound)."""
    async def _call():
        return await coro
    return client.portal.call(_call)


# -- Fixtures ------------------------------------------------------------------

@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def redis_mgr():
    return RedisManager(fake_aioredis.FakeRedis(server=fakeredis.FakeServer(), decode_responses=True))


@pytest.fixture
def seed(db):
    user = User(email="buyer@test.local", hashed_password="x")
    admin = User(email="admin@test.local", hashed_password="x", role=UserRole.ADMIN)
    plan = Plan(name="1 Day", price=499.0, duration_minutes=1440, token_cap=120000, rpm_limit=20, is_active=True)
    db.add_all([user, admin, plan])
    db.commit()
    return user, admin, plan


@pytest.fixture
def order_id(seed):
    user, _admin, plan = seed
    return f"order_{plan.id}_{user.id}_gateway_{int(time.time())}"


@pytest.fixture
def app(db, redis_mgr, monkeypatch):
    monkeypatch.setattr(settings, "CASHFREE_WEBHOOK_SECRET", SECRET)
    capacity = MagicMock()
    capacity.reserve_capacity = AsyncMock()
    capacity.can_sell_plan = AsyncMock(return_value={"allowed": True, "reason": ""})
    monkeypatch.setattr(payment, "CapacityManager", lambda _r: capacity)
    monkeypatch.setattr(marketplace, "CapacityManager", lambda _r: capacity)

    test_app = FastAPI()
    test_app.include_router(payment.router, prefix="/api")
    test_app.include_router(marketplace.router, prefix="/api")
    test_app.dependency_overrides[get_db] = lambda: db
    test_app.dependency_overrides[get_redis_manager] = lambda: redis_mgr
    with patch.object(email_module.email_service, "send_rental_activated", lambda **kw: None):
        yield test_app


def _post(client, body, headers):
    return client.post("/api/webhooks/cashfree", content=body, headers=headers)


# -- 1: webhook authentication fails closed --------------------------------------

@pytest.mark.parametrize("headers", [
    {},                                                   # no signature headers
    {"x-webhook-timestamp": "1700000000"},                # timestamp only
    {"x-webhook-signature": "c2lnbmF0dXJl"},              # signature only
], ids=["no-headers", "timestamp-only", "signature-only"])
def test_webhook_without_both_headers_rejected(app, db, order_id, headers):
    with TestClient(app) as client:
        resp = _post(client, _body(order_id), {"Content-Type": "application/json", **headers})

    assert resp.status_code == 400
    assert _counts(db) == (0, 0)


def test_webhook_rejected_when_no_secret_configured(app, db, order_id, monkeypatch):
    monkeypatch.setattr(settings, "CASHFREE_WEBHOOK_SECRET", "")
    monkeypatch.setattr(settings, "CASHFREE_CLIENT_SECRET", "")
    body = _body(order_id)

    with TestClient(app) as client:
        resp = _post(client, body, _signed_headers(body, secret="anything"))

    assert resp.status_code == 400
    assert _counts(db) == (0, 0)


def test_webhook_invalid_signature_rejected(app, db, order_id):
    body = _body(order_id)

    with TestClient(app) as client:
        resp = _post(client, body, _signed_headers(body, secret="wrong-secret"))

    assert resp.status_code == 400
    assert _counts(db) == (0, 0)


def test_correctly_signed_webhook_activates_and_links_rental(app, db, order_id):
    body = _body(order_id)

    with TestClient(app) as client:
        resp = _post(client, body, _signed_headers(body))

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "success"
    tx = db.query(Transaction).one()
    rental = db.query(Rental).one()
    assert tx.cashfree_order_id == order_id and tx.rental_id == rental.id


def test_non_utf8_and_malformed_bodies_get_4xx_without_side_effects(app, db):
    bad = b"\xff\xfe\x00not-json"
    with TestClient(app) as client:
        unsigned = _post(client, bad, {"x-webhook-timestamp": "1", "x-webhook-signature": "x"})
        signed_non_utf8 = _post(client, bad, _signed_headers(bad))
        signed_not_object = _post(client, b"[1, 2]", _signed_headers(b"[1, 2]"))

    assert unsigned.status_code == 400
    assert signed_non_utf8.status_code == 400
    assert signed_not_object.status_code == 400
    assert _counts(db) == (0, 0)


def test_signature_values_never_logged(app, order_id, caplog):
    caplog.set_level(logging.DEBUG, logger="backend.api.payment")
    sentinel = "SIGNATURE-SENTINEL-12345"
    body = _body(order_id)
    good = _signed_headers(body)

    with TestClient(app) as client:
        _post(client, body, {"x-webhook-timestamp": "1", "x-webhook-signature": sentinel})
        _post(client, body, {"x-webhook-signature": sentinel})
        _post(client, body, good)

    assert sentinel not in caplog.text
    assert good["x-webhook-signature"] not in caplog.text


# -- 2: direct no-payment route is admin-only ------------------------------------

def test_direct_purchase_forbidden_for_normal_user(app, db, seed):
    user, _admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as client:
        resp = client.post("/api/rentals/purchase", json={"plan_id": plan.id})

    assert resp.status_code == 403
    assert _counts(db) == (0, 0)


def test_direct_purchase_allowed_for_admin(app, db, seed):
    _user, admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: admin

    with TestClient(app) as client:
        resp = client.post("/api/rentals/purchase", json={"plan_id": plan.id})

    assert resp.status_code == 201, resp.text
    assert resp.json()["virtual_key"].startswith("vk_")
    assert db.query(Rental).one().user_id == admin.id


def test_cashfree_checkout_still_available_to_normal_user(app, seed, monkeypatch):
    user, _admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: user
    sent = {}

    class FakeCashfree:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, headers=None, json=None):
            sent["payload"] = json
            return httpx.Response(200, json={"payment_session_id": "sess_test", "order_id": json["order_id"], "cf_order_id": "1"})
    monkeypatch.setattr(payment.httpx, "AsyncClient", FakeCashfree)

    with TestClient(app) as client:
        resp = client.post("/api/checkout/session", json={"plan_id": plan.id, "provider": "openai"})

    assert resp.status_code == 200, resp.text
    assert resp.json()["payment_session_id"] == "sess_test"
    assert sent["payload"]["order_amount"] == 499.0 and sent["payload"]["order_currency"] == "INR"


# -- 3: failed activation is retryable, recovery creates exactly one rental ------

def test_activation_failure_is_retryable_and_recovers_once(app, db, redis_mgr, order_id, monkeypatch):
    calls = {"n": 0}

    async def flaky_create_rental(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("internal-detail: redis exploded at 10.0.0.5")
        return await real_create_rental(*args, **kwargs)
    monkeypatch.setattr(payment, "create_rental", flaky_create_rental)
    body = _body(order_id)

    with TestClient(app) as client:
        first = _post(client, body, _signed_headers(body))
        assert first.status_code == 500
        assert "internal-detail" not in first.text and "10.0.0.5" not in first.text
        assert _counts(db) == (0, 0)                      # not recorded as a completed payment
        assert _run(client, redis_mgr.redis.get(f"webhook_lock:{order_id}")) is None

        retry = _post(client, body, _signed_headers(body))
        again = _post(client, body, _signed_headers(body))

    assert retry.status_code == 200 and retry.json()["status"] == "success"
    assert again.status_code == 200 and again.json()["status"] == "already_processed"
    assert _counts(db) == (1, 1)
    assert db.query(Transaction).one().rental_id == db.query(Rental).one().id


def test_partial_create_rental_failure_leaves_no_rental(app, db, redis_mgr, order_id, monkeypatch):
    """create_rental commits the Rental row before setting its Redis key/balance."""
    original = redis_mgr.set_token_balance
    calls = {"n": 0}

    async def flaky_set_token_balance(rental_id, balance):
        calls["n"] += 1
        if calls["n"] == 1:
            raise ConnectionError("redis down")
        return await original(rental_id, balance)
    monkeypatch.setattr(redis_mgr, "set_token_balance", flaky_set_token_balance)
    body = _body(order_id)

    with TestClient(app) as client:
        first = _post(client, body, _signed_headers(body))
        assert first.status_code == 500
        assert _counts(db) == (0, 0)                      # half-made rental removed
        assert _run(client, redis_mgr.redis.keys("vkey:*")) == []

        retry = _post(client, body, _signed_headers(body))
        keys = _run(client, redis_mgr.redis.keys("vkey:*"))

    assert retry.status_code == 200 and retry.json()["status"] == "success"
    assert _counts(db) == (1, 1)
    assert keys == [f"vkey:{db.query(Rental).one().virtual_key}"]


def test_payment_record_failure_withdraws_rental(app, db, redis_mgr, order_id):
    fired = {"done": False}

    def fail_first_transaction_insert(session, flush_context, instances):
        if not fired["done"] and any(isinstance(o, Transaction) for o in session.new):
            fired["done"] = True
            raise RuntimeError("db write failed")
    event.listen(db, "before_flush", fail_first_transaction_insert)
    body = _body(order_id)

    try:
        with TestClient(app) as client:
            first = _post(client, body, _signed_headers(body))
            assert first.status_code == 500
            assert _counts(db) == (0, 0)                  # rental withdrawn, no payment record
            assert _run(client, redis_mgr.redis.keys("vkey:*")) == []
            assert _run(client, redis_mgr.redis.keys("balance:*")) == []   # balance removed too

            retry = _post(client, body, _signed_headers(body))
            balances = _run(client, redis_mgr.redis.keys("balance:*"))
    finally:
        event.remove(db, "before_flush", fail_first_transaction_insert)

    assert retry.status_code == 200 and retry.json()["status"] == "success"
    assert _counts(db) == (1, 1)
    assert balances == [f"balance:{db.query(Rental).one().id}"]


def test_withdraw_does_not_query_db_after_failure(app, db, redis_mgr, order_id, caplog):
    """The DB goes down as the payment insert fails. Error handling must not issue another
    query (e.g. reloading expired rental attributes to format a log line, which would raise
    out of cleanup), and must still revoke the key and balance and return the controlled,
    generic 500."""
    caplog.set_level(logging.ERROR, logger="backend.api.payment")
    engine = db.get_bind()
    state = {"down": False, "queries_while_down": []}

    def fail_transaction_insert(session, flush_context, instances):
        if any(isinstance(o, Transaction) for o in session.new):
            state["down"] = True
            raise RuntimeError("db write failed")

    def db_unavailable(conn, cursor, statement, params, context, executemany):
        if state["down"]:
            state["queries_while_down"].append(statement.split()[0])
            raise RuntimeError("database unavailable")

    event.listen(db, "before_flush", fail_transaction_insert)
    event.listen(engine, "before_cursor_execute", db_unavailable)
    body = _body(order_id)
    try:
        with TestClient(app) as client:
            resp = _post(client, body, _signed_headers(body))
            vkeys = _run(client, redis_mgr.redis.keys("vkey:*"))
            balances = _run(client, redis_mgr.redis.keys("balance:*"))
            lock = _run(client, redis_mgr.redis.get(f"webhook_lock:{order_id}"))
    finally:
        event.remove(db, "before_flush", fail_transaction_insert)
        event.remove(engine, "before_cursor_execute", db_unavailable)

    assert resp.status_code == 500
    assert resp.json() == {"detail": "Payment processing failed, will retry"}
    # Only the row-delete attempt itself touches the DB; error handling issues no extra query
    assert len(state["queries_while_down"]) <= 1, state["queries_while_down"]
    assert vkeys == [] and balances == [] and lock is None
    assert "Could not remove rental 1 " in caplog.text   # logged with the captured id


def test_withdraw_cleanup_failures_logged_without_masking_or_leaking(app, db, redis_mgr, order_id, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG, logger="backend.api.payment")
    created = {}

    async def recording_create_rental(*args, **kwargs):
        rental = await real_create_rental(*args, **kwargs)
        created["key"] = rental.virtual_key
        return rental
    monkeypatch.setattr(payment, "create_rental", recording_create_rental)

    async def redis_down(*args, **kwargs):
        raise ConnectionError("redis down at secret-host:6379")
    monkeypatch.setattr(redis_mgr, "delete_virtual_key", redis_down)
    monkeypatch.setattr(redis_mgr.redis, "delete", redis_down)

    fired = {"done": False}
    def fail_first_transaction_insert(session, flush_context, instances):
        if not fired["done"] and any(isinstance(o, Transaction) for o in session.new):
            fired["done"] = True
            raise RuntimeError("db write failed")
    event.listen(db, "before_flush", fail_first_transaction_insert)
    body = _body(order_id)
    try:
        with TestClient(app) as client:
            resp = _post(client, body, _signed_headers(body))
    finally:
        event.remove(db, "before_flush", fail_first_transaction_insert)

    assert resp.status_code == 500                        # original payment error, not masked
    assert resp.json() == {"detail": "Payment processing failed, will retry"}
    assert _counts(db) == (0, 0)                          # DB cleanup still ran
    assert "Could not revoke key for rental" in caplog.text
    assert "Could not remove token balance for rental" in caplog.text
    assert created["key"] not in caplog.text and "secret-host" not in caplog.text


def test_inactive_plan_not_acknowledged_and_recoverable(app, db, seed, order_id):
    """Current policy is kept: inactive plans are not activated. The paid order is no longer
    acknowledged with 200, so it stays retryable (e.g. after the plan is re-enabled)."""
    _user, _admin, plan = seed
    plan.is_active = False
    db.commit()
    body = _body(order_id)

    with TestClient(app) as client:
        first = _post(client, body, _signed_headers(body))
        assert first.status_code == 500
        assert _counts(db) == (0, 0)

        plan.is_active = True
        db.commit()
        retry = _post(client, body, _signed_headers(body))

    assert retry.status_code == 200 and retry.json()["status"] == "success"
    assert _counts(db) == (1, 1)


# -- 4: concurrent deliveries are processed once ----------------------------------

def _gated_create_rental(entered: asyncio.Event, release: asyncio.Event):
    async def gated(*args, **kwargs):
        entered.set()            # first delivery is past the duplicate check, before the insert
        await release.wait()
        return await real_create_rental(*args, **kwargs)
    return gated


def test_concurrent_duplicate_delivery_processed_once(app, db, redis_mgr, order_id, monkeypatch):
    body = _body(order_id)

    async def scenario():
        entered, release = asyncio.Event(), asyncio.Event()
        monkeypatch.setattr(payment, "create_rental", _gated_create_rental(entered, release))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
            first = asyncio.create_task(c.post("/api/webhooks/cashfree", content=body, headers=_signed_headers(body)))
            await entered.wait()
            second = await c.post("/api/webhooks/cashfree", content=body, headers=_signed_headers(body))
            in_flight_counts = _counts(db)
            ttl = await redis_mgr.redis.ttl(f"webhook_lock:{order_id}")
            release.set()
            first = await first
            redelivery = await c.post("/api/webhooks/cashfree", content=body, headers=_signed_headers(body))
            lock_left = await redis_mgr.redis.get(f"webhook_lock:{order_id}")
        return first, second, in_flight_counts, ttl, redelivery, lock_left

    first, second, in_flight_counts, ttl, redelivery, lock_left = asyncio.run(scenario())

    assert second.status_code == 409                       # retryable; cannot process twice
    assert in_flight_counts == (0, 0)
    assert 0 < ttl <= payment.WEBHOOK_LOCK_SECONDS          # lock always expires
    assert first.status_code == 200 and first.json()["status"] == "success"
    assert redelivery.status_code == 200 and redelivery.json()["status"] == "already_processed"
    assert lock_left is None
    assert _counts(db) == (1, 1)


def test_lock_not_released_if_ownership_changed(app, db, redis_mgr, order_id, monkeypatch):
    """If our lock expired and another worker took it, finishing must not delete theirs."""
    body = _body(order_id)
    key = f"webhook_lock:{order_id}"

    async def scenario():
        entered, release = asyncio.Event(), asyncio.Event()
        monkeypatch.setattr(payment, "create_rental", _gated_create_rental(entered, release))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
            first = asyncio.create_task(c.post("/api/webhooks/cashfree", content=body, headers=_signed_headers(body)))
            await entered.wait()
            await redis_mgr.redis.set(key, "another-worker", ex=60)   # simulate expiry + re-acquire
            release.set()
            await first
            return await redis_mgr.redis.get(key)

    assert asyncio.run(scenario()) == "another-worker"


def test_lock_release_race_keeps_new_owners_lock(redis_mgr, monkeypatch):
    """Deterministic race: our lock expires and another delivery takes it right after our
    read, before our delete. The release must leave the new owner's lock in place. The read
    is intercepted on both the client and pipeline paths, so a plain GET-then-DELETE release
    fails this test."""
    r = redis_mgr.redis
    key = "webhook_lock:order_race"
    stolen = {"done": False}

    def steal_after_read(read):
        async def wrapper(name, *args, **kwargs):
            value = await read(name, *args, **kwargs)
            if name == key and not stolen["done"]:
                stolen["done"] = True
                await r.set(key, "another-worker", ex=60)
            return value
        return wrapper

    real_pipeline = r.pipeline
    def racing_pipeline(*args, **kwargs):
        pipe = real_pipeline(*args, **kwargs)
        pipe.get = steal_after_read(pipe.get)
        return pipe

    async def scenario():
        await r.set(key, "our-token", ex=60)
        monkeypatch.setattr(r, "get", steal_after_read(r.get))
        monkeypatch.setattr(r, "pipeline", racing_pipeline)
        await payment._release_webhook_lock(redis_mgr, key, "our-token")
        monkeypatch.undo()
        return await r.get(key), await r.ttl(key)

    value, ttl = asyncio.run(scenario())
    assert stolen["done"]
    assert value == "another-worker" and 0 < ttl <= 60


def test_lock_release_deletes_own_lock_only(redis_mgr):
    r = redis_mgr.redis

    async def scenario():
        await r.set("webhook_lock:a", "mine", ex=60)
        await r.set("webhook_lock:b", "theirs", ex=60)
        await payment._release_webhook_lock(redis_mgr, "webhook_lock:a", "mine")
        await payment._release_webhook_lock(redis_mgr, "webhook_lock:b", "mine")
        await payment._release_webhook_lock(redis_mgr, "webhook_lock:missing", "mine")
        return await r.get("webhook_lock:a"), await r.get("webhook_lock:b")

    assert asyncio.run(scenario()) == (None, "theirs")


def test_foreign_lock_blocks_until_it_expires(app, db, redis_mgr, order_id):
    body = _body(order_id)
    key = f"webhook_lock:{order_id}"

    with TestClient(app) as client:
        _run(client, redis_mgr.redis.set(key, "crashed-worker", ex=60))
        blocked = _post(client, body, _signed_headers(body))
        assert _run(client, redis_mgr.redis.get(key)) == "crashed-worker"   # not deleted by us
        _run(client, redis_mgr.redis.delete(key))                           # lock expiry
        recovered = _post(client, body, _signed_headers(body))

    assert blocked.status_code == 409
    assert recovered.status_code == 200 and recovered.json()["status"] == "success"
    assert _counts(db) == (1, 1)


def test_lock_released_after_activation_exception(app, db, redis_mgr, order_id, monkeypatch):
    async def failing(*args, **kwargs):
        raise RuntimeError("boom")
    monkeypatch.setattr(payment, "create_rental", failing)
    body = _body(order_id)

    with TestClient(app) as client:
        resp = _post(client, body, _signed_headers(body))
        lock = _run(client, redis_mgr.redis.get(f"webhook_lock:{order_id}"))

    assert resp.status_code == 500
    assert lock is None


def test_redis_unavailable_returns_retryable_error(app, db, redis_mgr, order_id, monkeypatch):
    async def down(*args, **kwargs):
        raise ConnectionError("redis down")
    monkeypatch.setattr(redis_mgr.redis, "set", down)
    body = _body(order_id)

    with TestClient(app) as client:
        resp = _post(client, body, _signed_headers(body))

    assert resp.status_code == 503
    assert "redis down" not in resp.text
    assert _counts(db) == (0, 0)


# -- 5: review fixes: paid amount, checkout lock, order ownership -----------------

def _body_with_amount(order_id: str, amount, currency: str = "INR") -> bytes:
    return json.dumps({
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {"order": {"order_id": order_id, "order_amount": amount, "order_currency": currency},
                 "payment": {"cf_payment_id": 1, "payment_status": "SUCCESS"}},
    }).encode()


@pytest.mark.parametrize("amount,currency", [(1.0, "INR"), (499.0, "USD")], ids=["underpaid", "wrong-currency"])
def test_webhook_with_wrong_amount_or_currency_creates_no_rental(app, db, order_id, amount, currency):
    body = _body_with_amount(order_id, amount, currency)

    with TestClient(app) as client:
        resp = _post(client, body, _signed_headers(body))

    assert resp.status_code == 200 and resp.json()["status"] == "rejected"   # acknowledged: a retry can't fix it
    assert _counts(db) == (0, 0)


def test_webhook_accepts_the_amount_the_order_was_created_for_even_if_price_changed(app, db, redis_mgr, seed, order_id):
    """The customer paid 399 when the plan cost 399; the price is 499 by the time the webhook arrives."""
    body = _body_with_amount(order_id, 399.0)

    with TestClient(app) as client:
        _run(client, redis_mgr.redis.set(f"order_amount:{order_id}", "399.0"))
        resp = _post(client, body, _signed_headers(body))

    assert resp.status_code == 200 and resp.json()["status"] == "success", resp.text
    assert db.query(Transaction).one().amount == 399.0       # what was actually paid


def test_checkout_rejects_unknown_provider(app, seed):
    user, _admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as client:
        resp = client.post("/api/checkout/session", json={"plan_id": plan.id, "provider": "a_b_c"})

    assert resp.status_code == 400


def test_checkout_failure_does_not_block_retry_and_hides_provider_error(app, seed, monkeypatch):
    user, _admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: user
    outcomes = iter([500, 200])

    class FakeCashfree:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, headers=None, json=None):
            if next(outcomes) == 500:
                return httpx.Response(500, text="secret-internal-cashfree-detail")
            return httpx.Response(200, json={"payment_session_id": "sess", "order_id": json["order_id"], "cf_order_id": "1"})
    monkeypatch.setattr(payment.httpx, "AsyncClient", FakeCashfree)

    with TestClient(app) as client:
        first = client.post("/api/checkout/session", json={"plan_id": plan.id, "provider": "openai"})
        retry = client.post("/api/checkout/session", json={"plan_id": plan.id, "provider": "openai"})
        double_click = client.post("/api/checkout/session", json={"plan_id": plan.id, "provider": "openai"})

    assert first.status_code == 502 and "secret-internal" not in first.text
    assert retry.status_code == 200                      # the failed attempt released the lock
    assert double_click.status_code == 429               # a real duplicate is still stopped


def test_verify_order_only_for_own_orders(app, seed, monkeypatch):
    user, admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: user
    reached_cashfree = []

    class FakeCashfree:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url, headers=None):
            reached_cashfree.append(url)
            return httpx.Response(200, json={"order_status": "PAID", "order_amount": 499.0})
    monkeypatch.setattr(payment.httpx, "AsyncClient", FakeCashfree)

    with TestClient(app) as client:
        mine = client.get(f"/api/checkout/verify/order_{plan.id}_{user.id}_openai_1700000000")
        theirs = client.get(f"/api/checkout/verify/order_{plan.id}_{admin.id}_openai_1700000000")
        garbage = client.get("/api/checkout/verify/not-an-order")

    assert mine.status_code == 200 and mine.json()["order_status"] == "PAID"
    assert theirs.status_code == 404 and garbage.status_code == 404
    assert len(reached_cashfree) == 1                    # others' orders never reach Cashfree


def test_invoice_shows_what_was_paid_not_the_current_price(app, db, redis_mgr, seed, order_id):
    user, _admin, plan = seed
    app.dependency_overrides[get_current_user] = lambda: user
    body = _body_with_amount(order_id, 499.0)
    with TestClient(app) as client:
        assert _post(client, body, _signed_headers(body)).status_code == 200
        plan.price = 999.0                               # price changes after the purchase
        db.commit()
        rental = db.query(Rental).one()
        invoice = client.get(f"/api/invoice/{rental.id}")

    assert invoice.status_code == 200 and invoice.json()["amount_inr"] == 499.0
