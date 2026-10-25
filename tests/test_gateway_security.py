"""
Regression tests: gateway security and rental-key fixes (G1-G6).

Covers:
  G1  Rental (vk_) keys use the live Redis credit balance -- no more 402 on every call,
      and an exhausted balance is still rejected before any provider call
  G2  Provider-prefixed model ids only route to the matching provider's key;
      unknown / mismatched / nested prefixes are rejected with 400
  G3  Only standard OpenAI parameters reach LiteLLM (no base_url / api_base / ... )
  G4  Streaming requests ask for usage and are billed + logged
  G5  The response cache is scoped per user and per full request
  G6  A failure after a successful provider call never triggers a second provider call

Unlike test_playground_litellm.py, these run the REAL key verification, guardrail
pipeline, circuit breaker and cache on an in-memory fake Redis (decode_responses=True,
like production). Only litellm.acompletion and the provider key lookup are mocked.
In-memory SQLite, no network, no paid API calls, no real credentials.

Run:
    python -m pytest tests/test_gateway_security.py -v
"""

import os
import sys
import json
import asyncio
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
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database.connection import Base, get_db
from backend.database.models import InternalKey, Plan, UsageLog, User
from backend.database.redis_manager import RedisManager, get_redis_manager
from backend.api import proxy
from backend.services import router as gateway_router
from backend.services.cache import GatewayCache, _cache_key
from backend.services.drain_rate import get_drain_rate
from backend.services.virtual_key_service import create_rental

TOKENS = 42
TOKEN_CAP = 20000


# -- Fake LiteLLM responses ----------------------------------------------------

def _fake_response(model: str):
    resp = MagicMock()
    resp.usage.total_tokens = TOKENS
    resp.model_dump.return_value = {
        "id": "chatcmpl-test", "object": "chat.completion", "model": model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": "hello"}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 32, "total_tokens": TOKENS},
    }
    return resp


def _fake_stream_with_usage(*texts):
    """Content chunks followed by the final usage-only chunk (include_usage=True)."""
    async def gen():
        for t in texts:
            chunk = MagicMock()
            chunk.usage = None
            chunk.model_dump.return_value = {"choices": [{"index": 0, "delta": {"content": t}}]}
            yield chunk
        last = MagicMock()
        last.usage.total_tokens = TOKENS
        last.model_dump.return_value = {"choices": [], "usage": {"total_tokens": TOKENS}}
        yield last
    return gen()


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
    # Own FakeServer per test: FakeRedis instances otherwise share one in-memory server,
    # which would leak cache entries between tests.
    return RedisManager(fake_aioredis.FakeRedis(server=fakeredis.FakeServer(), decode_responses=True))


@pytest.fixture
def user(db):
    u = User(email="sec@test.local", hashed_password="x")
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def rental(client, db, redis_mgr, user):
    """A rental created by the real create_rental -- same Redis data as production."""
    plan = Plan(name="15 Min", price=49.0, duration_minutes=15, token_cap=TOKEN_CAP, rpm_limit=20)
    db.add(plan)
    db.commit()
    return _run(client, create_rental(user.id, plan.id, db, redis_mgr, send_activation_email=False))


@pytest.fixture
def acompletion(monkeypatch):
    mock = AsyncMock()
    monkeypatch.setattr(proxy.litellm, "acompletion", mock)
    # One fake key per provider, so the right key per provider can be asserted
    monkeypatch.setattr(gateway_router.GatewayRouter, "_get_key", lambda self, p: f"test-{p}-key")
    return mock


@pytest.fixture
def client(db, redis_mgr, acompletion):
    app = FastAPI()
    app.include_router(proxy.router, prefix="/v1")
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_redis_manager] = lambda: redis_mgr
    with TestClient(app) as c:
        yield c


def _chat(client, key, model="gpt-4o-mini", stream=False, content="Say hi", **extra):
    body = {"model": model, "messages": [{"role": "user", "content": content}],
            "max_tokens": 20, "stream": stream, **extra}
    return client.post("/v1/chat/completions", headers={"Authorization": f"Bearer {key}"}, json=body)


def _run(client, coro):
    """Run a coroutine on the TestClient's event loop (the fake Redis client is loop-bound)."""
    async def _call():
        return await coro
    return client.portal.call(_call)


def _balance(client, redis_mgr, rental_id):
    return _run(client, redis_mgr.get_token_balance(rental_id))


# -- G1: rental keys use the live credit balance --------------------------------

def test_rental_key_end_to_end_ok(client, db, redis_mgr, rental, acompletion):
    acompletion.return_value = _fake_response("gpt-4o-mini")

    resp = _chat(client, rental.virtual_key)

    assert resp.status_code == 200, resp.text
    acompletion.assert_awaited_once()
    expected_credits = int(TOKENS * get_drain_rate("gpt-4o-mini"))
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - expected_credits
    log = db.query(UsageLog).one()
    assert log.model == "gpt-4o-mini" and log.tokens_used == TOKENS and log.credits_consumed == expected_credits


def test_exhausted_balance_returns_402(client, redis_mgr, rental, acompletion):
    _run(client, redis_mgr.set_token_balance(rental.id, 100))

    resp = _chat(client, rental.virtual_key)

    assert resp.status_code == 402
    assert "Available: 100" in resp.json()["detail"]
    assert acompletion.await_count == 0


def test_internal_key_balance_unchanged(client, db, user, acompletion):
    db.add(InternalKey(user_id=user.id, virtual_key="ik_test", is_active=True))
    db.commit()
    acompletion.return_value = _fake_response("gpt-4o-mini")

    resp = _chat(client, "ik_test")

    assert resp.status_code == 200, resp.text   # token_budget 0 = unlimited, as before
    acompletion.assert_awaited_once()


def test_internal_key_cache_hit_survives_usage_log_failure(client, db, user, acompletion):
    """ik_ keys log usage with rental_id "ik_<id>", which a database enforcing the
    UsageLog.rental_id -> rentals.id foreign key rejects. SQLite FK enforcement stands in
    for that here (this is not a PostgreSQL test). A cache hit must still return 200."""
    db.connection().exec_driver_sql("PRAGMA foreign_keys=ON")   # this test's in-memory DB only
    assert db.connection().exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
    db.add(InternalKey(user_id=user.id, virtual_key="ik_test", is_active=True))
    db.commit()
    acompletion.return_value = _fake_response("gpt-4o-mini")

    first = _chat(client, "ik_test", temperature=0)   # only temperature=0 is cached
    db.rollback()   # the app opens a fresh session per request; the shared test session must be reset
    second = _chat(client, "ik_test", temperature=0)

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["x_cache"] == "MISS"
    assert second.json()["x_cache"] == "HIT"
    acompletion.assert_awaited_once()


# -- G2: provider prefixes ------------------------------------------------------

def test_prefixed_model_uses_matching_provider_key(client, db, redis_mgr, rental, acompletion):
    acompletion.return_value = _fake_response("gemini-1.5-flash")

    resp = _chat(client, rental.virtual_key, model="gemini/gemini-1.5-flash")

    assert resp.status_code == 200, resp.text
    kwargs = acompletion.await_args.kwargs
    assert kwargs["model"] == "gemini/gemini-1.5-flash"
    assert kwargs["api_key"] == "test-gemini-key"
    assert resp.json()["x_model_used"] == "gemini-1.5-flash"
    assert db.query(UsageLog).one().model == "gemini-1.5-flash"
    expected_credits = int(TOKENS * get_drain_rate("gemini-1.5-flash"))
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - expected_credits


@pytest.mark.parametrize("model", [
    "openrouter/anthropic/claude-3-opus",   # unsupported provider
    "ollama/llama3",                        # unsupported provider (local endpoint)
    "openai/claude-3-5-sonnet-20241022",    # prefix does not match the model
    "anthropic/gpt-4o",                     # prefix does not match the model
    "openai/foo/bar",                       # nested prefix would re-route inside LiteLLM
    123,                                    # not a string
])
def test_bad_prefix_rejected_without_provider_call(client, rental, acompletion, model):
    resp = _chat(client, rental.virtual_key, model=model)

    assert resp.status_code == 400, resp.text
    assert acompletion.await_count == 0


# -- G3: parameter allowlist ----------------------------------------------------

def test_unsafe_params_not_forwarded(client, rental, acompletion):
    acompletion.return_value = _fake_response("gpt-4o-mini")
    unsafe = {
        "base_url": "https://attacker.example", "api_base": "https://attacker.example",
        "extra_headers": {"X-Steal": "1"}, "mock_response": "free", "max_completion_tokens": 100000,
        "n": 50, "stream_options": {"include_usage": False}, "custom_llm_provider": "openai",
        "api_version": "x", "timeout": 1,
    }

    resp = _chat(client, rental.virtual_key, **unsafe)

    assert resp.status_code == 200, resp.text
    kwargs = acompletion.await_args.kwargs
    for name in unsafe:
        assert name not in kwargs, f"{name} was forwarded to LiteLLM"
    assert kwargs["api_key"] == "test-openai-key"
    assert kwargs["max_tokens"] == 20


def test_allowed_params_forwarded(client, rental, acompletion):
    acompletion.return_value = _fake_response("gpt-4o-mini")
    tools = [{"type": "function", "function": {"name": "f", "parameters": {"type": "object", "properties": {}}}}]

    resp = _chat(client, rental.virtual_key, temperature=0.2, tools=tools, user="end-user-1")

    assert resp.status_code == 200, resp.text
    kwargs = acompletion.await_args.kwargs
    assert kwargs["temperature"] == 0.2 and kwargs["tools"] == tools and kwargs["user"] == "end-user-1"


# -- G4: streaming is billed --------------------------------------------------

def test_stream_requests_usage_and_bills(client, db, redis_mgr, rental, acompletion):
    acompletion.return_value = _fake_stream_with_usage("Hel", "lo")

    resp = _chat(client, rental.virtual_key, model="gpt-4o-mini", stream=True)

    assert resp.status_code == 200
    assert acompletion.await_args.kwargs["stream_options"] == {"include_usage": True}
    payloads = [l[len("data: "):] for l in resp.text.splitlines() if l.startswith("data: ")]
    assert payloads[-1] == "[DONE]"
    text = "".join(c["delta"].get("content", "") for p in payloads[:-1] for c in json.loads(p)["choices"])
    assert text == "Hello"
    expected_credits = int(TOKENS * get_drain_rate("gpt-4o-mini"))
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - expected_credits
    log = db.query(UsageLog).one()
    assert log.tokens_used == TOKENS and log.credits_consumed == expected_credits


def _sse_events(text):
    return [l[len("data: "):] for l in text.splitlines() if l.startswith("data: ")]


def test_stream_usage_log_failure_after_done_is_silent(client, redis_mgr, rental, acompletion, monkeypatch):
    """A usage-log failure after a successful stream is our bookkeeping problem: nothing is sent
    after [DONE], the provider's breaker is not touched, and credits are still deducted."""
    acompletion.return_value = _fake_stream_with_usage("Hel", "lo")

    def broken_usage_log(*args, **kwargs):
        raise RuntimeError("[SQL: INSERT INTO usage_logs (rental_id) VALUES (?)] [parameters: (7,)]")
    monkeypatch.setattr(proxy, "UsageLog", broken_usage_log)

    resp = _chat(client, rental.virtual_key, model="gpt-4o-mini", stream=True)

    assert resp.status_code == 200
    events = _sse_events(resp.text)
    assert events[-1] == "[DONE]"                          # nothing after [DONE]
    assert all("error" not in json.loads(e) for e in events[:-1])
    assert "INSERT" not in resp.text and "parameters" not in resp.text
    assert _run(client, redis_mgr.redis.get("failures:openai")) in (None, "0")
    expected_credits = int(TOKENS * get_drain_rate("gpt-4o-mini"))
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - expected_credits


def test_internal_key_stream_with_fk_enforcement(client, db, redis_mgr, user, acompletion):
    """ik_ usage rows fail a database enforcing UsageLog.rental_id -> rentals.id (SQLite FK
    enforcement stands in for that; this is not a PostgreSQL test). The stream must stay clean."""
    db.connection().exec_driver_sql("PRAGMA foreign_keys=ON")   # this test's in-memory DB only
    assert db.connection().exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
    db.add(InternalKey(user_id=user.id, virtual_key="ik_test", is_active=True))
    db.commit()
    acompletion.return_value = _fake_stream_with_usage("Hel", "lo")

    resp = _chat(client, "ik_test", model="gpt-4o-mini", stream=True)

    assert resp.status_code == 200
    events = _sse_events(resp.text)
    assert events[-1] == "[DONE]"
    text = "".join(c["delta"].get("content", "") for e in events[:-1] for c in json.loads(e)["choices"])
    assert text == "Hello"
    assert "FOREIGN KEY" not in resp.text and "INSERT" not in resp.text
    assert _run(client, redis_mgr.redis.get("failures:openai")) in (None, "0")
    acompletion.assert_awaited_once()


# -- G5: cache isolation ---------------------------------------------------------

def test_cache_scoped_per_user_and_full_prompt():
    msgs = [{"role": "system", "content": "You are A's private assistant."}, {"role": "user", "content": "hi"}]
    body = {"max_tokens": 20}
    base = _cache_key("gpt-4o-mini", msgs, body, user_id=1)

    assert base.startswith("cache:v2:")
    assert base == _cache_key("gpt-4o-mini", [dict(m) for m in msgs], dict(body), user_id=1)
    assert base != _cache_key("gpt-4o-mini", msgs, body, user_id=2)
    other_system = [{"role": "system", "content": "You are B's assistant."}, msgs[1]]
    assert base != _cache_key("gpt-4o-mini", other_system, body, user_id=1)
    assert base != _cache_key("gpt-4o-mini", msgs, {"max_tokens": 500}, user_id=1)
    assert base != _cache_key("gpt-4o", msgs, body, user_id=1)


def test_cache_get_set_isolated_between_users(redis_mgr):
    cache = GatewayCache(redis_mgr)   # real RedisManager, as built by the proxy and admin routes
    msgs = [{"role": "user", "content": "hi"}]

    async def scenario():
        body = {"temperature": 0}   # only temperature=0 requests are cached
        await cache.set("gpt-4o-mini", msgs, body, {"answer": "for user 1"}, user_id=1)
        return (await cache.get("gpt-4o-mini", msgs, body, user_id=1),
                await cache.get("gpt-4o-mini", msgs, body, user_id=2))
    own, other = asyncio.run(scenario())

    assert own == {"answer": "for user 1"}
    assert other is None


def test_same_user_identical_repeat_is_cache_hit(client, db, redis_mgr, rental, acompletion):
    acompletion.return_value = _fake_response("gpt-4o-mini")

    first = _chat(client, rental.virtual_key, temperature=0)    # only temperature=0 is cached
    repeat = _chat(client, rental.virtual_key, temperature=0)
    other_prompt = _chat(client, rental.virtual_key, content="Say bye", temperature=0)
    not_cacheable = _chat(client, rental.virtual_key, temperature=0.7)

    assert [r.status_code for r in (first, repeat, other_prompt, not_cacheable)] == [200] * 4
    assert [r.json()["x_cache"] for r in (first, repeat, other_prompt, not_cacheable)] == ["MISS", "HIT", "MISS", "MISS"]
    assert repeat.json()["choices"] == first.json()["choices"]
    assert acompletion.await_count == 3                      # the HIT made no provider call
    credits = int(TOKENS * get_drain_rate("gpt-4o-mini"))
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - 4 * credits   # hits charged as before
    logs = db.query(UsageLog).order_by(UsageLog.id).all()
    assert [l.was_cached for l in logs] == [False, True, False, False]


def test_stream_request_never_served_from_cache(client, rental, acompletion):
    """A stream=true repeat of a cached non-stream request must still stream (SSE) from the provider."""
    acompletion.side_effect = [_fake_response("gpt-4o-mini"), _fake_stream_with_usage("Hel", "lo")]

    first = _chat(client, rental.virtual_key, stream=False)
    streamed = _chat(client, rental.virtual_key, stream=True)

    assert first.status_code == 200 and first.json()["x_cache"] == "MISS"
    assert streamed.status_code == 200
    assert streamed.headers["content-type"].startswith("text/event-stream")
    assert streamed.headers["X-Cache"] == "MISS"
    assert streamed.text.lstrip().startswith("data: ")
    assert acompletion.await_count == 2
    assert acompletion.await_args.kwargs["stream"] is True


def test_proxy_does_not_serve_another_users_cache(client, db, redis_mgr, rental, acompletion):
    other = User(email="other@test.local", hashed_password="x")
    db.add(other)
    db.commit()
    other_rental = _run(client, create_rental(other.id, rental.plan_id, db, redis_mgr, send_activation_email=False))
    acompletion.side_effect = [_fake_response("gpt-4o-mini"), _fake_response("gpt-4o-mini")]

    assert _chat(client, rental.virtual_key).status_code == 200
    second = _chat(client, other_rental.virtual_key)

    assert second.status_code == 200, second.text
    assert second.json()["x_cache"] == "MISS"
    assert acompletion.await_count == 2


def test_cache_stats_and_flush_use_v2(redis_mgr):
    cache = GatewayCache(redis_mgr)

    async def scenario():
        await cache.set("gpt-4o-mini", [{"role": "user", "content": "hi"}], {"temperature": 0}, {"a": 1}, user_id=1)
        return await cache.get_stats(), await cache.flush(), await cache.get_stats()
    before, flushed, after = asyncio.run(scenario())

    assert before == {"cached_entries": 1}
    assert flushed == 1
    assert after == {"cached_entries": 0}


# -- G6: no second provider call after success ----------------------------------

def test_post_success_failure_makes_single_provider_call(client, redis_mgr, rental, acompletion, monkeypatch):
    acompletion.return_value = _fake_response("gpt-4o-mini")

    def broken_usage_log(*args, **kwargs):
        raise RuntimeError("usage_logs write failed")
    monkeypatch.setattr(proxy, "UsageLog", broken_usage_log)

    resp = _chat(client, rental.virtual_key, model="gpt-4o-mini")

    assert resp.status_code == 200, resp.text
    assert acompletion.await_count == 1
    assert resp.json()["x_model_used"] == "gpt-4o-mini"
    expected_credits = int(TOKENS * get_drain_rate("gpt-4o-mini"))
    assert _balance(client, redis_mgr, rental.id) == TOKEN_CAP - expected_credits   # charged exactly once


def test_provider_error_still_falls_back(client, rental, acompletion):
    acompletion.side_effect = [Exception("openai down"), _fake_response("gemini-1.5-flash")]

    resp = _chat(client, rental.virtual_key, model="gpt-4o-mini")

    assert resp.status_code == 200, resp.text
    called = [(c.kwargs["model"], c.kwargs["api_key"]) for c in acompletion.await_args_list]
    assert called == [("openai/gpt-4o-mini", "test-openai-key"), ("gemini/gemini-1.5-flash", "test-gemini-key")]
    assert resp.json()["x_fallback_used"] is True
