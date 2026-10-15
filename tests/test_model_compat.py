"""
Regression tests: retired Anthropic model IDs keep working through aliases.

Covers the LiteLLM Playground fix:
  - Legacy Claude IDs normalize to supported replacements (case-insensitive)
  - No retired ID is left in the router tables or the /v1/models catalogue
  - The router resolves legacy IDs to the replacement fallback chain
  - Non-streaming requests with a legacy ID reach the replacement model,
    are not reported as a fallback, and are charged once at the legacy rate
  - A provider 404 still falls back to OpenAI, or ends in a 503 without a key
  - The per-user allowlist still checks the requested ID
  - Drain rates and cost-estimator entries for the new IDs

Self-contained: in-memory SQLite, in-process fakeredis, mocked LiteLLM.
No running server, network or real credentials needed.

Run:
    python -m pytest tests/test_model_compat.py -v
"""

import os
import asyncio
from unittest.mock import patch

# Isolated test config -- set before any backend import so no real DB/secrets are used.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("USE_FAKE_REDIS", "false")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import httpx
import litellm
import pytest
import fakeredis
import fakeredis.aioredis
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api import proxy
from backend.database.connection import Base, get_db
from backend.database.redis_manager import RedisManager, get_redis_manager
from backend.services import router as gw
from backend.services.circuit_breaker import CircuitBreakerService
from backend.services.cost_estimator import CostEstimator
from backend.services.drain_rate import get_drain_rate

RETIRED_IDS = {
    "claude-3-5-sonnet-20241022",
    "claude-3-sonnet-20240229",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
    "claude-3-opus-20240229",
}


# ==================== Helpers ====================

class FakeUpstream:
    """Stands in for litellm.acompletion: retired IDs 404 like Anthropic, others answer."""

    def __init__(self, failing=()):
        self.calls = []            # bare model ids, in call order
        self.qualified_calls = []  # ids exactly as the gateway sent them ("anthropic/...")
        self.failing = set(failing) | RETIRED_IDS

    async def __call__(self, model, messages, api_key=None, stream=False, **kwargs):
        self.qualified_calls.append(model)
        model = model.split("/", 1)[-1]
        self.calls.append(model)
        if model in self.failing:
            raise litellm.NotFoundError(
                message=f"AnthropicException - model: {model} not found",
                model=model, llm_provider="anthropic",
            )
        return litellm.ModelResponse(
            model=model,
            choices=[{"message": {"role": "assistant", "content": "ok"}}],
            usage={"prompt_tokens": 60, "completion_tokens": 40, "total_tokens": 100},
        )


def _fake_redis():
    """Fresh, unshared Redis per test: fakeredis instances share one server by default,
    which would leak cached responses and circuit-breaker state between tests."""
    return fakeredis.aioredis.FakeRedis(server=fakeredis.FakeServer(), decode_responses=True)


def _keys_for(providers):
    return lambda self, provider: f"test-{provider}-key" if provider in providers else None


def _gateway(rental_overrides=None):
    """Proxy router on an isolated app with in-memory DB and fake Redis."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)

    def _db():
        db = session()
        try:
            yield db
        finally:
            db.close()

    redis_manager = RedisManager(_fake_redis())
    rental = {"rental_id": 42, "user_id": 1, "rpm_limit": 1000,
              "tokens_remaining": 10**6, "allowed_models": []}
    rental.update(rental_overrides or {})

    app = FastAPI()
    app.include_router(proxy.router, prefix="/v1")
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_redis_manager] = lambda: redis_manager
    app.dependency_overrides[proxy.verify_virtual_key] = lambda: rental
    return app, redis_manager


def _post(app, model, stream=False):
    async def go():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/v1/chat/completions",
                json={"model": model, "messages": [{"role": "user", "content": "Say hi"}],
                      "max_tokens": 64, "stream": stream},
                headers={"Authorization": "Bearer vk_test"},
            )
    return asyncio.run(go())


def _run_chat(model, providers, failing=(), rental_overrides=None):
    """Send one non-streaming request; return (response, upstream, deductions)."""
    app, redis_manager = _gateway(rental_overrides)
    upstream = FakeUpstream(failing)
    deductions = []
    real_deduct = redis_manager.deduct_tokens

    async def spy_deduct(rental_id, credits):
        deductions.append((rental_id, credits))
        return await real_deduct(rental_id, credits)

    redis_manager.deduct_tokens = spy_deduct
    with patch.object(proxy.litellm, "acompletion", upstream), \
         patch.object(gw.GatewayRouter, "_get_key", _keys_for(providers)):
        response = _post(app, model)
    return response, upstream, deductions


# ==================== Aliases ====================

class TestModelAliases:
    @pytest.mark.parametrize("legacy,current", [
        ("claude-3-5-sonnet-20241022", "claude-sonnet-5-5"),
        ("claude-3-sonnet-20240229", "claude-sonnet-5-5"),
        ("claude-3-5-haiku-20241022", "claude-haiku-5-5"),
        ("claude-3-haiku-20240307", "claude-haiku-5-5"),
        ("claude-3-opus-20240229", "claude-opus-4-8"),
    ])
    def test_legacy_ids_map_to_replacements(self, legacy, current):
        assert gw.normalize_model_id(legacy) == current

    def test_alias_lookup_is_case_insensitive(self):
        assert gw.normalize_model_id("Claude-3-5-Sonnet-20241022") == "claude-sonnet-5-5"

    @pytest.mark.parametrize("model", ["claude-sonnet-5-5", "gpt-4o-mini", "gemini-1.5-flash", "my-custom-model"])
    def test_other_ids_pass_through_unchanged(self, model):
        assert gw.normalize_model_id(model) == model

    def test_empty_model_passes_through(self):
        assert gw.normalize_model_id("") == ""
        assert gw.normalize_model_id(None) is None

    def test_aliases_cover_every_retired_id(self):
        assert set(gw.MODEL_ALIASES) == RETIRED_IDS

    def test_alias_targets_are_routable(self):
        for target in gw.MODEL_ALIASES.values():
            assert target in gw.FALLBACK_CHAINS
            assert gw.MODEL_PROVIDER_MAP[target] == "anthropic"


# ==================== Router tables ====================

class TestRouterTables:
    def test_no_retired_ids_in_router_tables(self):
        chain_models = {m for chain in gw.FALLBACK_CHAINS.values() for _, m in chain}
        tables = set(gw.MODEL_PROVIDER_MAP) | set(gw.FALLBACK_CHAINS) | set(gw.MODEL_METADATA) | chain_models
        assert not tables & RETIRED_IDS

    def test_claude_fallback_chains(self):
        assert gw.FALLBACK_CHAINS["claude-sonnet-5-5"] == [
            ("anthropic", "claude-sonnet-5-5"), ("anthropic", "claude-haiku-5-5"), ("openai", "gpt-4o-mini")]
        assert gw.FALLBACK_CHAINS["claude-haiku-5-5"] == [
            ("anthropic", "claude-haiku-5-5"), ("openai", "gpt-4o-mini")]
        assert gw.FALLBACK_CHAINS["claude-opus-4-8"] == [
            ("anthropic", "claude-opus-4-8"), ("anthropic", "claude-sonnet-5-5"), ("openai", "gpt-4o")]

    def test_legacy_ids_still_infer_anthropic(self):
        for legacy in RETIRED_IDS:
            assert gw.infer_provider(legacy) == "anthropic"

    def test_models_endpoint_lists_current_ids_only(self):
        app, _ = _gateway()

        async def go():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                return await client.get("/v1/models")

        ids = {m["id"] for m in asyncio.run(go()).json()["data"]}
        assert {"claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-4-8"} <= ids
        assert not ids & RETIRED_IDS


class TestRouterResolve:
    def _resolve(self, model, providers):
        breaker = CircuitBreakerService(RedisManager(_fake_redis()))
        router = gw.GatewayRouter(breaker, db=None)
        with patch.object(gw.GatewayRouter, "_get_key", _keys_for(providers)):
            return asyncio.run(router.resolve(model))

    def test_legacy_id_resolves_to_replacement_chain(self):
        entries = self._resolve("claude-3-5-sonnet-20241022", {"anthropic", "openai"})
        assert [(e["provider"], e["model"]) for e in entries] == gw.FALLBACK_CHAINS["claude-sonnet-5-5"]

    def test_provider_without_key_is_skipped(self):
        entries = self._resolve("claude-3-5-haiku-20241022", {"anthropic"})
        assert [e["model"] for e in entries] == ["claude-haiku-5-5"]


# ==================== Non-streaming requests ====================

class TestChatCompletions:
    def test_legacy_sonnet_is_served_by_replacement(self):
        response, upstream, deductions = _run_chat("claude-3-5-sonnet-20241022", {"anthropic"})
        assert response.status_code == 200
        body = response.json()
        assert upstream.calls == ["claude-sonnet-5-5"]
        assert upstream.qualified_calls == ["anthropic/claude-sonnet-5-5"]
        assert body["x_model_used"] == "claude-sonnet-5-5"
        assert "x_fallback_used" not in body  # alias is not a fallback
        assert deductions == [(42, 800)]       # charged once, 100 tokens at legacy 8x

    def test_current_id_is_charged_once_at_same_rate(self):
        response, upstream, deductions = _run_chat("claude-sonnet-5-5", {"anthropic"})
        assert response.status_code == 200
        assert upstream.calls == ["claude-sonnet-5-5"]
        assert deductions == [(42, 800)]

    @pytest.mark.parametrize("legacy,current,credits", [
        ("claude-3-5-haiku-20241022", "claude-haiku-5-5", 500),  # legacy rate 5x (default)
        ("claude-3-haiku-20240307", "claude-haiku-5-5", 300),    # legacy rate 3x
        ("claude-3-opus-20240229", "claude-opus-4-8", 1000),     # legacy rate 10x
    ])
    def test_legacy_billing_rate_is_preserved(self, legacy, current, credits):
        response, upstream, deductions = _run_chat(legacy, {"anthropic"})
        assert response.status_code == 200
        assert upstream.calls == [current]
        assert deductions == [(42, credits)]

    def test_anthropic_404_falls_back_to_openai(self):
        response, upstream, deductions = _run_chat(
            "claude-3-5-sonnet-20241022", {"anthropic", "openai"},
            failing={"claude-sonnet-5-5", "claude-haiku-5-5"})
        assert response.status_code == 200
        body = response.json()
        assert upstream.calls == ["claude-sonnet-5-5", "claude-haiku-5-5", "gpt-4o-mini"]
        assert upstream.qualified_calls[-1] == "openai/gpt-4o-mini"
        assert body["x_model_used"] == "gpt-4o-mini"
        assert body["x_fallback_used"] is True
        assert deductions == [(42, 800)]  # one charge, requested-model rate

    def test_in_chain_fallback_is_reported(self):
        response, upstream, _ = _run_chat(
            "claude-sonnet-5-5", {"anthropic"}, failing={"claude-sonnet-5-5"})
        assert response.status_code == 200
        assert upstream.calls == ["claude-sonnet-5-5", "claude-haiku-5-5"]
        assert response.json()["x_fallback_used"] is True

    def test_all_providers_failing_returns_503_without_charge(self):
        response, upstream, deductions = _run_chat(
            "claude-sonnet-5-5", {"anthropic"},
            failing={"claude-sonnet-5-5", "claude-haiku-5-5"})
        assert response.status_code == 503
        assert "All providers failed" in response.json()["detail"]
        assert upstream.calls == ["claude-sonnet-5-5", "claude-haiku-5-5"]
        assert deductions == []

    def test_allowlist_checks_requested_legacy_id(self):
        allowed = {"allowed_models": ["claude-3-5-sonnet-20241022"]}
        response, upstream, _ = _run_chat("claude-3-5-sonnet-20241022", {"anthropic"}, rental_overrides=allowed)
        assert response.status_code == 200
        assert upstream.calls == ["claude-sonnet-5-5"]

        response, upstream, _ = _run_chat("claude-sonnet-5-5", {"anthropic"}, rental_overrides=allowed)
        assert response.status_code == 403
        assert upstream.calls == []


# ==================== Pricing metadata ====================

class TestPricingMetadata:
    def test_drain_rates(self):
        assert get_drain_rate("claude-sonnet-5-5") == 8.0
        assert get_drain_rate("claude-haiku-5-5") == 5.0
        assert get_drain_rate("claude-opus-4-8") == 10.0
        # Legacy IDs keep their existing rates
        assert get_drain_rate("claude-3-5-sonnet-20241022") == 8.0
        assert get_drain_rate("claude-3-5-haiku-20241022") == 5.0
        assert get_drain_rate("claude-3-haiku-20240307") == 3.0
        assert get_drain_rate("claude-3-opus-20240229") == 10.0

    def test_cost_estimator_uses_published_prices(self):
        estimator = CostEstimator()
        assert estimator.estimate_cost("claude-sonnet-5-5", 1_000_000, 1_000_000) == pytest.approx(12.00)
        assert estimator.estimate_cost("claude-haiku-5-5", 1_000_000, 1_000_000) == pytest.approx(0.60)
        assert estimator.estimate_cost("claude-opus-4-8", 1_000_000, 1_000_000) == pytest.approx(30.00)
