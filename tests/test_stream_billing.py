"""
Regression tests: streaming requests are billed on every exit path, exactly once.

Covers:
  - Completed stream with provider usage    -> EXACT provider usage, charged once
  - Completed stream without usage          -> ESTIMATED usage (prompt + output)
  - Client disconnect before any output     -> estimated prompt tokens
  - Client disconnect after partial output  -> estimated prompt + output received so far
  - Provider error after partial output     -> estimated prompt + partial output
  - Provider error before the stream opens / before any output -> not charged
  - The request.is_disconnected() break path
  - Settlement runs at most once (stream finally + response background task)
  - Billing is not interrupted by the disconnect cancellation (shielded)
  - Billing / usage-log / token-counter failures are logged, never raised to the client
  - Offline token counting for every provider family
  - Internal (ik_) keys

Disconnect tests drive the ASGI app directly with a real `http.disconnect`, so they go
through Starlette's actual StreamingResponse cancellation. Real key verification, guardrails,
circuit breaker and RedisManager run on an in-memory fake Redis; only litellm.acompletion and
the provider key lookup are mocked. In-memory SQLite, no network, no paid API calls.

Run:
    python -m pytest tests/test_stream_billing.py -v
"""

import os
import sys
import json
import socket
import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock

# Isolated test config -- set before any backend import so no real DB/secrets are used.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["USE_FAKE_REDIS"] = "false"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "test-admin-pass"
os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"  # never fetch LiteLLM's remote model map

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import fakeredis
from fakeredis import aioredis as fake_aioredis
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database.connection import Base, get_db
from backend.database.models import InternalKey, Plan, UsageLog, User
from backend.database.redis_manager import RedisManager, get_redis_manager
from backend.api import proxy
from backend.services import router as gateway_router
from backend.services.drain_rate import get_drain_rate
from backend.services.virtual_key_service import create_rental

MODEL = "gpt-4o-mini"
CONTENT = "Say hi"
MESSAGES = [{"role": "user", "content": CONTENT}]
TOKENS = 42            # provider-reported total in the fake usage chunk
TOKEN_CAP = 20000
LOGGER = "backend.api.proxy"


# -- Fake provider stream --------------------------------------------------------

def _text_chunk(text):
    chunk = MagicMock()
    chunk.usage = None
    chunk.model_dump.return_value = {"choices": [{"index": 0, "delta": {"content": text}}]}
    return chunk


def _usage_chunk(total=TOKENS):
    chunk = MagicMock()
    chunk.usage.total_tokens = total
    chunk.model_dump.return_value = {"choices": [], "usage": {"total_tokens": total}}
    return chunk


def _provider_stream(*chunks, then=None, started=None):
    """Yield chunks, then: None = finish, "hang" = wait for the client, "raise" = fail."""
    async def gen():
        if started is not None:
            started.set()
        for chunk in chunks:
            yield chunk
        if then == "hang":
            await asyncio.Event().wait()     # provider still generating; only cancellation ends it
        elif then == "raise":
            raise RuntimeError("provider exploded mid-stream")
    return gen()


def _estimated_credits(output_text, model=MODEL):
    tokens = proxy._estimate_stream_tokens(model, MESSAGES, None, output_text)
    return tokens, int(tokens * get_drain_rate(model))


EXACT_CREDITS = int(TOKENS * get_drain_rate(MODEL))


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
def user(db):
    u = User(email="stream@test.local", hashed_password="x")
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def plan(db):
    p = Plan(name="15 Min", price=49.0, duration_minutes=15, token_cap=TOKEN_CAP, rpm_limit=20)
    db.add(p)
    db.commit()
    return p


@pytest.fixture
def acompletion(monkeypatch):
    mock = AsyncMock()
    monkeypatch.setattr(proxy.litellm, "acompletion", mock)
    monkeypatch.setattr(gateway_router.GatewayRouter, "_get_key", lambda self, p: f"test-{p}-key")
    return mock


@pytest.fixture
def app(db, redis_mgr, acompletion):
    a = FastAPI()
    a.include_router(proxy.router, prefix="/v1")
    a.dependency_overrides[get_db] = lambda: db
    a.dependency_overrides[get_redis_manager] = lambda: redis_mgr
    return a


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def rental(client, db, redis_mgr, user, plan):
    return _run(client, create_rental(user.id, plan.id, db, redis_mgr, send_activation_email=False))


def _run(client, coro):
    """Run a coroutine on the TestClient's event loop (the fake Redis client is loop-bound)."""
    async def _call():
        return await coro
    return client.portal.call(_call)


def _body():
    return {"model": MODEL, "messages": MESSAGES, "max_tokens": 20, "stream": True}


def _stream(client, key):
    return client.post("/v1/chat/completions", headers={"Authorization": f"Bearer {key}"}, json=_body())


def _events(text):
    return [l[len("data: "):] for l in text.splitlines() if l.startswith("data: ")]


def _balance(client, redis_mgr, rental_id):
    return _run(client, redis_mgr.get_token_balance(rental_id))


async def _asgi_stream(app, key, disconnect_when=None, disconnect_after_first_chunk=False, block_send=False):
    """Drive one streaming request through the ASGI app with a real http.disconnect.

    disconnect_when: asyncio.Event -- once set, the client disconnects.
    disconnect_after_first_chunk: the client disconnects as soon as it receives a body chunk.
    block_send: additionally, that chunk's send() blocks (slow client), so the disconnect
                cancels the stream while it is paused at a yield.
    """
    request_msgs = [{"type": "http.request", "body": json.dumps(_body()).encode(), "more_body": False}]
    received = []

    async def receive():
        if request_msgs:
            return request_msgs.pop(0)
        if disconnect_when is None:
            await asyncio.Event().wait()
        await disconnect_when.wait()
        return {"type": "http.disconnect"}

    async def send(message):
        if message["type"] == "http.response.body" and message.get("body"):
            received.append(message["body"].decode())
            if disconnect_after_first_chunk or block_send:
                disconnect_when.set()
            if block_send:
                await asyncio.sleep(30)          # cancelled by the disconnect

    scope = {
        "type": "http", "asgi": {"version": "3.0", "spec_version": "2.4"}, "http_version": "1.1",
        "method": "POST", "scheme": "http", "path": "/v1/chat/completions",
        "raw_path": b"/v1/chat/completions", "query_string": b"", "root_path": "",
        "headers": [(b"content-type", b"application/json"), (b"authorization", f"Bearer {key}".encode())],
        "client": ("127.0.0.1", 50000), "server": ("testserver", 80),
    }
    await asyncio.wait_for(app(scope, receive, send), timeout=10)
    return _events("".join(received))


async def _new_rental(db, redis_mgr, user, plan):
    return await create_rental(user.id, plan.id, db, redis_mgr, send_activation_email=False)


# -- Exact provider usage --------------------------------------------------------

def test_completed_stream_charges_exact_usage_once(client, db, redis_mgr, rental, acompletion, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"), _usage_chunk())

    resp = _stream(client, rental.virtual_key)

    assert resp.status_code == 200
    events = _events(resp.text)
    assert events[-1] == "[DONE]"
    assert "".join(json.loads(e)["choices"][0]["delta"]["content"] for e in events[:2]) == "Hello"
    # Both the stream's finally and the background task ran; exactly one charge and one row
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - EXACT_CREDITS
    log = db.query(UsageLog).one()
    assert log.tokens_used == TOKENS and log.credits_consumed == EXACT_CREDITS
    assert f"{TOKENS} tokens (exact usage)" in caplog.text
    assert "estimated usage" not in caplog.text


# -- Estimated usage ---------------------------------------------------------------

def test_completed_stream_without_usage_charges_labelled_estimate(client, db, redis_mgr, rental, acompletion, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"))
    tokens, credits = _estimated_credits("Hello")

    resp = _stream(client, rental.virtual_key)

    assert resp.status_code == 200 and _events(resp.text)[-1] == "[DONE]"
    assert tokens > 0
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - credits
    assert db.query(UsageLog).one().tokens_used == tokens
    assert f"{tokens} tokens (estimated usage)" in caplog.text
    assert "exact usage" not in caplog.text


def test_real_disconnect_after_partial_output_charges_prompt_plus_received(app, db, redis_mgr, user, plan, acompletion, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)

    async def scenario():
        rental = await _new_rental(db, redis_mgr, user, plan)
        # The client disconnects once it has "Hel", while the provider is still generating
        acompletion.return_value = _provider_stream(_text_chunk("Hel"), then="hang")
        events = await _asgi_stream(app, rental.virtual_key, disconnect_when=asyncio.Event(),
                                    disconnect_after_first_chunk=True)
        return rental, events, await redis_mgr.get_token_balance(rental.id)

    rental, events, balance = asyncio.run(scenario())
    tokens, credits = _estimated_credits("Hel")

    assert [json.loads(e)["choices"][0]["delta"]["content"] for e in events] == ["Hel"]
    assert balance == TOKEN_CAP - credits
    row = db.query(UsageLog).one()
    assert row.tokens_used == tokens and row.credits_consumed == credits
    assert f"{tokens} tokens (estimated usage)" in caplog.text


def test_real_disconnect_before_output_charges_prompt_only(app, db, redis_mgr, user, plan, acompletion):
    async def scenario():
        rental = await _new_rental(db, redis_mgr, user, plan)
        provider_started = asyncio.Event()
        acompletion.return_value = _provider_stream(then="hang", started=provider_started)
        events = await _asgi_stream(app, rental.virtual_key, disconnect_when=provider_started)
        return rental, events, await redis_mgr.get_token_balance(rental.id)

    rental, events, balance = asyncio.run(scenario())
    tokens, credits = _estimated_credits("")

    assert events == []
    assert tokens > 0
    assert balance == TOKEN_CAP - credits
    assert db.query(UsageLog).one().tokens_used == tokens


def test_billing_completes_despite_cancellation(app, db, redis_mgr, user, plan, acompletion, monkeypatch):
    """The settlement awaits inside the cancelled stream; the shield must let it finish."""
    real_deduct = redis_mgr.deduct_tokens

    async def slow_deduct(rental_id, credits):
        await asyncio.sleep(0.05)            # a real suspension inside the cancelled scope
        return await real_deduct(rental_id, credits)
    monkeypatch.setattr(redis_mgr, "deduct_tokens", slow_deduct)

    async def scenario():
        rental = await _new_rental(db, redis_mgr, user, plan)
        acompletion.return_value = _provider_stream(_text_chunk("Hel"), then="hang")
        await _asgi_stream(app, rental.virtual_key, disconnect_when=asyncio.Event(),
                           disconnect_after_first_chunk=True)
        return rental, await redis_mgr.get_token_balance(rental.id)

    rental, balance = asyncio.run(scenario())
    _tokens, credits = _estimated_credits("Hel")

    assert balance == TOKEN_CAP - credits
    assert db.query(UsageLog).count() == 1


def test_disconnect_while_paused_at_yield_settles_via_background_task(app, db, redis_mgr, user, plan, acompletion):
    """A slow client: the disconnect cancels send() while the stream is paused at a yield, so
    the stream's finally does not run in time. The response background task settles instead."""
    async def scenario():
        rental = await _new_rental(db, redis_mgr, user, plan)
        acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"), _usage_chunk())
        events = await _asgi_stream(app, rental.virtual_key, disconnect_when=asyncio.Event(), block_send=True)
        # read the outcome before the event loop shuts down (which would close the stream)
        return rental, events, await redis_mgr.get_token_balance(rental.id), db.query(UsageLog).count()

    rental, events, balance, rows = asyncio.run(scenario())
    tokens, credits = _estimated_credits("Hel")

    assert len(events) == 1
    assert balance == TOKEN_CAP - credits     # stream never completed -> estimate, not exact usage
    assert rows == 1
    assert db.query(UsageLog).count() == 1    # the stream's late finally did not charge again


def test_is_disconnected_break_charges_estimate(client, db, redis_mgr, rental, acompletion, monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)
    answers = iter([False, True])

    async def is_disconnected(self):
        return next(answers, True)
    monkeypatch.setattr(Request, "is_disconnected", is_disconnected)
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"), _usage_chunk())
    tokens, credits = _estimated_credits("Hel")

    resp = _stream(client, rental.virtual_key)

    events = _events(resp.text)
    assert events[-1] == "[DONE]" and len(events) == 2      # unchanged response shape
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - credits
    assert db.query(UsageLog).one().tokens_used == tokens
    assert "(estimated usage)" in caplog.text and "(exact usage)" not in caplog.text


# -- Provider errors -------------------------------------------------------------

def test_provider_error_after_partial_output_charges_estimate(client, db, redis_mgr, rental, acompletion):
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), then="raise")
    tokens, credits = _estimated_credits("Hel")

    resp = _stream(client, rental.virtual_key)

    events = _events(resp.text)
    assert json.loads(events[-1]) == {"error": "The AI provider returned an error. Please try again."}
    assert "exploded" not in resp.text
    assert _run(client, redis_mgr.redis.get("failures:openai")) not in (None, "0")   # breaker unchanged
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - credits
    assert db.query(UsageLog).one().tokens_used == tokens


def test_provider_error_before_stream_opens_not_charged(client, db, redis_mgr, rental, acompletion):
    acompletion.side_effect = RuntimeError("provider rejected the request")

    resp = _stream(client, rental.virtual_key)

    assert json.loads(_events(resp.text)[-1]) == {"error": "The AI provider returned an error. Please try again."}
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP
    assert db.query(UsageLog).count() == 0


def test_provider_error_before_any_output_not_charged(client, db, redis_mgr, rental, acompletion):
    acompletion.return_value = _provider_stream(then="raise")

    resp = _stream(client, rental.virtual_key)

    assert len(_events(resp.text)) == 1
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP
    assert db.query(UsageLog).count() == 0


def test_partial_usage_then_disconnect_never_charges_less_than_reported(app, db, redis_mgr, user, plan, acompletion):
    big = 5000      # usage reported part-way, larger than the estimate

    async def scenario():
        rental = await _new_rental(db, redis_mgr, user, plan)
        partial = _text_chunk("Hel")
        partial.usage = MagicMock(total_tokens=big)
        acompletion.return_value = _provider_stream(partial, then="hang")
        await _asgi_stream(app, rental.virtual_key, disconnect_when=asyncio.Event(),
                           disconnect_after_first_chunk=True)
        return await redis_mgr.get_token_balance(rental.id)

    balance = asyncio.run(scenario())
    tokens, _ = _estimated_credits("Hel")

    assert big > tokens
    assert balance == TOKEN_CAP - int(big * get_drain_rate(MODEL))


# -- Settlement at most once ----------------------------------------------------

def test_settlement_runs_at_most_once():
    state = {"opened": True, "completed": True, "failed": False,
             "reported_total": TOKENS, "text_parts": ["Hello"], "settled": False}
    redis = MagicMock(deduct_tokens=AsyncMock())
    db = MagicMock()

    async def settle():
        await proxy._settle_stream_usage(
            state, rental_id=1, model=MODEL, messages=MESSAGES, tools=None,
            drain_rate=get_drain_rate(MODEL), redis_manager=redis, db=db,
        )

    async def scenario():
        await asyncio.gather(settle(), settle())     # finally + background racing
        await settle()                                # and a late call

    asyncio.run(scenario())

    redis.deduct_tokens.assert_awaited_once_with(1, EXACT_CREDITS)
    db.add.assert_called_once()


# -- Settlement failures ------------------------------------------------------------

def test_deduction_failure_is_logged_not_raised(client, db, redis_mgr, rental, acompletion, monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)

    async def down(*args, **kwargs):
        raise ConnectionError("redis down")
    monkeypatch.setattr(redis_mgr, "deduct_tokens", down)
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"), _usage_chunk())

    resp = _stream(client, rental.virtual_key)

    assert resp.status_code == 200 and _events(resp.text)[-1] == "[DONE]"
    assert "redis down" not in resp.text
    assert f"Stream billing failed for rental {rental.id}: could not deduct {EXACT_CREDITS} credits" in caplog.text
    assert db.query(UsageLog).count() == 0       # not recorded as charged


def test_usage_log_failure_is_logged_after_deduction(client, db, redis_mgr, rental, acompletion, monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)

    def broken_usage_log(*args, **kwargs):
        raise RuntimeError("usage_logs table unavailable")
    monkeypatch.setattr(proxy, "UsageLog", broken_usage_log)
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"), _usage_chunk())

    resp = _stream(client, rental.virtual_key)

    assert resp.status_code == 200 and _events(resp.text)[-1] == "[DONE]"
    assert "unavailable" not in resp.text
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - EXACT_CREDITS
    assert "Usage log write failed" in caplog.text and "credits already deducted" in caplog.text


def test_token_counter_failure_falls_back_to_heuristic(client, db, redis_mgr, rental, acompletion, monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)

    def broken_counter(*args, **kwargs):
        raise RuntimeError("tokenizer unavailable")
    monkeypatch.setattr(proxy.litellm, "token_counter", broken_counter)
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"))
    heuristic_tokens = (len(CONTENT) + len("Hello")) // 4

    resp = _stream(client, rental.virtual_key)

    assert resp.status_code == 200
    assert "4-chars-per-token heuristic" in caplog.text
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - int(heuristic_tokens * get_drain_rate(MODEL))
    assert f"{heuristic_tokens} tokens (estimated usage)" in caplog.text


# -- Offline token counting ------------------------------------------------------

@pytest.mark.parametrize("model", ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet-20241022", "gemini-1.5-flash"])
def test_token_counting_works_offline(model, monkeypatch, caplog):
    caplog.set_level(logging.WARNING, logger=LOGGER)

    def no_network(*args, **kwargs):
        raise OSError("network disabled in test")
    monkeypatch.setattr(socket.socket, "connect", no_network)
    monkeypatch.setattr(socket, "create_connection", no_network)

    prompt_only = proxy._estimate_stream_tokens(model, MESSAGES, None, "")
    with_output = proxy._estimate_stream_tokens(model, MESSAGES, None, "Hello there, how can I help?")

    assert prompt_only > 0 and with_output > prompt_only
    assert "heuristic" not in caplog.text          # the real (offline) token counter was used


def test_tool_call_arguments_count_as_output():
    data = {"choices": [{"delta": {"content": None, "tool_calls": [
        {"function": {"name": "f", "arguments": '{"city": "Pune"}'}}]}}]}
    assert proxy._chunk_output_text(data) == '{"city": "Pune"}'
    assert proxy._chunk_output_text("not a dict") == ""


# -- Internal keys -----------------------------------------------------------------

def test_internal_key_stream_exact_usage(client, db, redis_mgr, user, acompletion):
    key = InternalKey(user_id=user.id, virtual_key="ik_stream", is_active=True)
    db.add(key)
    db.commit()
    acompletion.return_value = _provider_stream(_text_chunk("Hel"), _text_chunk("lo"), _usage_chunk())

    resp = _stream(client, "ik_stream")

    assert resp.status_code == 200 and _events(resp.text)[-1] == "[DONE]"
    assert _run(client, redis_mgr.get_token_balance(f"ik_{key.id}")) == -EXACT_CREDITS   # balance:ik_<id>, as before


def test_internal_key_stream_disconnect_charges_estimate(app, db, redis_mgr, user, acompletion):
    key = InternalKey(user_id=user.id, virtual_key="ik_stream", is_active=True)
    db.add(key)
    db.commit()

    async def scenario():
        acompletion.return_value = _provider_stream(_text_chunk("Hel"), then="hang")
        await _asgi_stream(app, "ik_stream", disconnect_when=asyncio.Event(), disconnect_after_first_chunk=True)
        return await redis_mgr.get_token_balance(f"ik_{key.id}")

    balance = asyncio.run(scenario())
    _tokens, credits = _estimated_credits("Hel")

    assert balance == -credits
