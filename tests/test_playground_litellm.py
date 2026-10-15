"""
Regression tests: Playground / gateway -> LiteLLM provider resolution.

Covers the Stage 1 fix:
  - LiteLLM receives a provider-qualified model id ("anthropic/claude-...") for
    both streaming and non-streaming calls, never a double prefix
  - Billing, usage logs, cache keys and response metadata keep the bare model id
  - The existing fallback chain is unchanged
  - Streaming errors are sent as valid JSON so the Playground can display them

Fully mocked: litellm.acompletion is patched, Redis / circuit breaker / cache /
guardrails are mocked, DB is in-memory SQLite. No network, no paid API calls,
no real credentials.

Run:
    python -m pytest tests/test_playground_litellm.py -v
"""

import os
import sys
import json
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
import litellm
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database.connection import Base, get_db
from backend.database.models import Plan, Rental, RentalStatus, UsageLog, User
from backend.database.redis_manager import get_redis_manager
from backend.api import proxy
from backend.api.proxy import _litellm_model, verify_virtual_key
from backend.services import router as gateway_router
from backend.services.drain_rate import get_drain_rate

TOKENS = 42


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


def _fake_stream(*texts):
    async def gen():
        for t in texts:
            chunk = MagicMock()
            chunk.usage = None
            chunk.model_dump.return_value = {"choices": [{"index": 0, "delta": {"content": t}}]}
            yield chunk
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
def rental(db):
    user = User(email="pg@test.local", hashed_password="x")
    plan = Plan(name="15 min", price=49.0, duration_minutes=15, token_cap=20000, rpm_limit=10)
    db.add_all([user, plan])
    db.commit()
    now = datetime.utcnow()
    r = Rental(user_id=user.id, plan_id=plan.id, virtual_key="vk_test", status=RentalStatus.ACTIVE,
               tokens_used=0, tokens_remaining=20000, requests_made=0,
               started_at=now, expires_at=now + timedelta(minutes=15))
    db.add(r)
    db.commit()
    return r


@pytest.fixture
def mocks(monkeypatch):
    redis_mgr = MagicMock()
    redis_mgr.check_rate_limit = AsyncMock(return_value=True)
    redis_mgr.get_pinned_ip = AsyncMock(return_value=None)
    redis_mgr.set_pinned_ip = AsyncMock()
    redis_mgr.deduct_tokens = AsyncMock()

    breaker = MagicMock()
    breaker.is_provider_available = AsyncMock(return_value=True)
    breaker.record_success = AsyncMock()
    breaker.record_failure = AsyncMock()

    cache = MagicMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()

    async def passthrough(ctx):
        return ctx

    monkeypatch.setattr(proxy, "CircuitBreakerService", lambda _r: breaker)
    monkeypatch.setattr(proxy, "GatewayCache", lambda _r: cache)
    monkeypatch.setattr(proxy, "run_input_pipeline", passthrough)
    monkeypatch.setattr(proxy, "run_output_pipeline", passthrough)
    # One fake key per provider, so the real fallback chains are exercised
    monkeypatch.setattr(gateway_router.GatewayRouter, "_get_key", lambda self, p: f"test-{p}-key")

    acompletion = AsyncMock()
    monkeypatch.setattr(proxy.litellm, "acompletion", acompletion)
    return {"redis": redis_mgr, "breaker": breaker, "cache": cache, "acompletion": acompletion}


@pytest.fixture
def client(db, rental, mocks):
    app = FastAPI()
    app.include_router(proxy.router, prefix="/v1")
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_redis_manager] = lambda: mocks["redis"]
    app.dependency_overrides[verify_virtual_key] = lambda: {
        "rental_id": rental.id, "user_id": rental.user_id, "rpm_limit": 60, "tokens_remaining": 20000,
    }
    with TestClient(app) as c:
        yield c


def _chat(client, model, stream=False):
    return client.post(
        "/v1/chat/completions",
        headers={"Authorization": "Bearer vk_test"},
        json={"model": model, "messages": [{"role": "user", "content": "Say hi"}], "max_tokens": 20, "stream": stream},
    )


# -- Helper --------------------------------------------------------------------

@pytest.mark.parametrize("provider,model,expected", [
    ("anthropic", "claude-3-5-sonnet-20241022", "anthropic/claude-3-5-sonnet-20241022"),
    ("gemini", "gemini-2.0-flash", "gemini/gemini-2.0-flash"),
    ("openai", "gpt-4o-mini", "openai/gpt-4o-mini"),
    ("gemini", "gemini/gemini-1.5-flash", "gemini/gemini-1.5-flash"),     # no double prefix
    ("openai", "anthropic/claude-x", "anthropic/claude-x"),               # explicit prefix wins
])
def test_litellm_model_helper(provider, model, expected):
    assert _litellm_model(provider, model) == expected


def test_every_catalogue_model_resolves_to_its_provider():
    """Offline: each (provider, model) the router can emit is resolvable by LiteLLM
    to the intended provider -- bare names like claude-3-5-sonnet-20241022 are not."""
    pairs = {(p, m) for chain in gateway_router.FALLBACK_CHAINS.values() for p, m in chain}
    pairs |= {(gateway_router.infer_provider(m), m) for m in gateway_router.MODEL_METADATA}
    for provider, model in sorted(pairs):
        _, resolved, _, _ = litellm.get_llm_provider(model=_litellm_model(provider, model))
        assert resolved == provider, f"{model} resolved to {resolved}, expected {provider}"


# -- Non-streaming -------------------------------------------------------------

@pytest.mark.parametrize("model,provider", [
    ("claude-sonnet-5-5", "anthropic"),
    ("gpt-4o-mini", "openai"),
    ("gemini-2.0-flash", "gemini"),
])
def test_non_stream_passes_qualified_model_and_keeps_bare_internally(client, db, rental, mocks, model, provider):
    mocks["acompletion"].return_value = _fake_response(model)

    resp = _chat(client, model)

    assert resp.status_code == 200, resp.text
    kwargs = mocks["acompletion"].await_args.kwargs
    assert kwargs["model"] == f"{provider}/{model}"
    assert kwargs["api_key"] == f"test-{provider}-key"
    assert kwargs["stream"] is False

    data = resp.json()
    assert data["choices"][0]["message"]["content"] == "hello"
    assert data["x_model_used"] == model            # bare
    assert data["x_provider"] == provider
    assert "x_fallback_used" not in data

    # Billing / logs / cache unchanged: bare model id everywhere
    mocks["redis"].deduct_tokens.assert_awaited_once_with(rental.id, int(TOKENS * get_drain_rate(model)))
    log = db.query(UsageLog).one()
    assert log.model == model and log.tokens_used == TOKENS
    assert mocks["cache"].set.await_args.args[0] == model
    db.refresh(rental)
    assert rental.tokens_used == TOKENS and rental.requests_made == 1


def test_already_prefixed_request_model_is_not_double_prefixed(client, mocks):
    mocks["acompletion"].return_value = _fake_response("gemini/gemini-1.5-flash")

    resp = _chat(client, "gemini/gemini-1.5-flash")

    assert resp.status_code == 200, resp.text
    assert mocks["acompletion"].await_args.kwargs["model"] == "gemini/gemini-1.5-flash"
    assert mocks["acompletion"].await_args.kwargs["api_key"] == "test-gemini-key"


def test_fallback_chain_unchanged(client, db, mocks):
    """Legacy claude-3-5-sonnet ID uses the claude-sonnet-5-5 chain: sonnet -> haiku -> gpt-4o-mini."""
    mocks["acompletion"].side_effect = [
        Exception("anthropic down"), Exception("anthropic down"), _fake_response("gpt-4o-mini"),
    ]

    resp = _chat(client, "claude-3-5-sonnet-20241022")

    assert resp.status_code == 200, resp.text
    called = [c.kwargs["model"] for c in mocks["acompletion"].await_args_list]
    assert called == [
        "anthropic/claude-sonnet-5-5",
        "anthropic/claude-haiku-5-5",
        "openai/gpt-4o-mini",
    ]
    data = resp.json()
    assert data["x_model_used"] == "gpt-4o-mini" and data["x_fallback_used"] is True
    assert mocks["breaker"].record_failure.await_count == 2
    assert db.query(UsageLog).one().model == "gpt-4o-mini"


def test_all_providers_fail_returns_503_with_last_error(client, mocks):
    mocks["acompletion"].side_effect = Exception("upstream exploded")

    resp = _chat(client, "gemini-1.5-flash")

    assert resp.status_code == 503
    assert "upstream exploded" in resp.json()["detail"]


# -- Streaming -----------------------------------------------------------------

def _sse_payloads(text):
    return [line[len("data: "):] for line in text.splitlines() if line.startswith("data: ")]


def test_stream_passes_qualified_model(client, mocks):
    mocks["acompletion"].return_value = _fake_stream("Hel", "lo")

    resp = _chat(client, "claude-3-5-sonnet-20241022", stream=True)

    assert resp.status_code == 200
    kwargs = mocks["acompletion"].await_args.kwargs
    assert kwargs["model"] == "anthropic/claude-sonnet-5-5"            # legacy ID served by its replacement
    assert kwargs["api_key"] == "test-anthropic-key" and kwargs["stream"] is True
    assert resp.headers["X-Model-Used"] == "claude-sonnet-5-5"            # bare

    payloads = _sse_payloads(resp.text)
    assert payloads[-1] == "[DONE]"
    text = "".join(json.loads(p)["choices"][0]["delta"]["content"] for p in payloads[:-1])
    assert text == "Hello"


def test_stream_error_is_valid_json_and_reported(client, mocks):
    # Quotes, backslashes and newlines used to produce invalid JSON in the SSE error line
    message = 'litellm.BadRequestError: model "claude-x" not found\n path C:\\x'
    mocks["acompletion"].side_effect = Exception(message)

    resp = _chat(client, "claude-3-5-sonnet-20241022", stream=True)

    assert resp.status_code == 200
    payloads = _sse_payloads(resp.text)
    assert len(payloads) == 1
    assert json.loads(payloads[0]) == {"error": "The AI provider returned an error. Please try again."}
    assert "claude-x" not in resp.text and "C:\\x" not in resp.text   # raw provider error never reaches the client
    mocks["breaker"].record_failure.assert_awaited_once()
