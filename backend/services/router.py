"""Gateway router — model-to-provider mapping, key pool selection, fallback chain."""
from typing import Optional
import asyncio
from backend.database.connection import SessionLocal
from backend.database.models import ProviderKey, ProviderType
from backend.services.circuit_breaker import CircuitBreakerService
from backend.database.redis_manager import get_redis_manager


# ---------------------------------------------------------------------------
# Model → provider mapping
# ---------------------------------------------------------------------------

MODEL_PROVIDER_MAP = {
    # OpenAI
    "gpt-4o":                     "openai",
    "gpt-4o-mini":                "openai",
    "gpt-4-turbo":                "openai",
    "gpt-4":                      "openai",
    "gpt-3.5-turbo":              "openai",
    "o1":                         "openai",
    "o1-mini":                    "openai",
    "o3-mini":                    "openai",
    # Anthropic
    "claude-3-5-sonnet-20241022": "anthropic",
    "claude-3-5-haiku-20241022":  "anthropic",
    "claude-3-opus-20240229":     "anthropic",
    "claude-3-sonnet-20240229":   "anthropic",
    "claude-3-haiku-20240307":    "anthropic",
    # Google
    "gemini-1.5-pro":             "gemini",
    "gemini-1.5-flash":           "gemini",
    "gemini-2.0-flash":           "gemini",
    "gemini-1.0-pro":             "gemini",
}

# Fallback chains: model → ordered list of (provider, model) to try
FALLBACK_CHAINS = {
    "gpt-4o":                     [("openai", "gpt-4o"),          ("openai", "gpt-4o-mini"),     ("gemini", "gemini-1.5-pro")],
    "gpt-4o-mini":                [("openai", "gpt-4o-mini"),     ("gemini", "gemini-1.5-flash")],
    "claude-3-5-sonnet-20241022": [("anthropic", "claude-3-5-sonnet-20241022"), ("anthropic", "claude-3-5-haiku-20241022"), ("openai", "gpt-4o-mini")],
    "claude-3-5-haiku-20241022":  [("anthropic", "claude-3-5-haiku-20241022"),  ("openai", "gpt-4o-mini")],
    "claude-3-opus-20240229":     [("anthropic", "claude-3-opus-20240229"),     ("anthropic", "claude-3-5-sonnet-20241022"), ("openai", "gpt-4o")],
    "gemini-1.5-pro":             [("gemini", "gemini-1.5-pro"),  ("gemini", "gemini-1.5-flash"), ("openai", "gpt-4o-mini")],
    "gemini-1.5-flash":           [("gemini", "gemini-1.5-flash"), ("openai", "gpt-4o-mini")],
    "gemini-2.0-flash":           [("gemini", "gemini-2.0-flash"), ("gemini", "gemini-1.5-flash"), ("openai", "gpt-4o-mini")],
}

DEFAULT_MODEL = "gpt-4o-mini"

# Speed/capability metadata for UI
MODEL_METADATA = {
    "gpt-4o":                     {"provider": "OpenAI",    "speed": "Fast",    "best_for": "General purpose, vision"},
    "gpt-4o-mini":                {"provider": "OpenAI",    "speed": "Fastest", "best_for": "High volume, cost-efficient"},
    "gpt-4-turbo":                {"provider": "OpenAI",    "speed": "Medium",  "best_for": "Long context"},
    "claude-3-5-sonnet-20241022": {"provider": "Anthropic", "speed": "Medium",  "best_for": "Reasoning, coding, analysis"},
    "claude-3-5-haiku-20241022":  {"provider": "Anthropic", "speed": "Fast",    "best_for": "Lightweight tasks"},
    "claude-3-opus-20240229":     {"provider": "Anthropic", "speed": "Slow",    "best_for": "Complex reasoning"},
    "gemini-1.5-pro":             {"provider": "Google",    "speed": "Medium",  "best_for": "Long context, multimodal"},
    "gemini-1.5-flash":           {"provider": "Google",    "speed": "Fastest", "best_for": "High volume, low cost"},
    "gemini-2.0-flash":           {"provider": "Google",    "speed": "Fastest", "best_for": "Latest Google model"},
}


def infer_provider(model_id: str) -> str:
    """Infer provider from model ID. Exact match first, then prefix."""
    if not model_id:
        return "openai"
    exact = MODEL_PROVIDER_MAP.get(model_id.lower())
    if exact:
        return exact
    m = model_id.lower()
    if m.startswith("gpt-") or m.startswith("o1") or m.startswith("o3"):
        return "openai"
    if m.startswith("gemini-") or m.startswith("palm-"):
        return "gemini"
    if m.startswith("claude-"):
        return "anthropic"
    return "openai"


def get_all_models() -> list[dict]:
    """Return full model catalogue with metadata."""
    result = []
    for model_id, meta in MODEL_METADATA.items():
        result.append({
            "id": model_id,
            "provider": meta["provider"],
            "speed": meta["speed"],
            "best_for": meta["best_for"],
        })
    return result


class GatewayRouter:
    """
    Routes a request to the right (provider, api_key) with fallback.
    Uses DB ProviderKey pool with round-robin, falls back to env-var keys.
    """

    def __init__(self, circuit_breaker: CircuitBreakerService, db):
        self.circuit_breaker = circuit_breaker
        self.db = db

    def _get_db_key(self, provider: str) -> Optional[str]:
        """Get next available API key for a provider from DB pool."""
        try:
            provider_enum = ProviderType(provider)
            keys = (
                self.db.query(ProviderKey)
                .filter(
                    ProviderKey.provider == provider_enum,
                    ProviderKey.is_active == True,
                )
                .order_by(ProviderKey.last_used_at.asc().nullsfirst())
                .first()
            )
            if keys:
                return keys.api_key
        except Exception:
            pass
        return None

    def _get_env_key(self, provider: str) -> Optional[str]:
        """Get first key from environment variables for a provider."""
        from backend.config import settings
        mapping = {
            "openai":    settings.get_openai_keys(),
            "anthropic": settings.get_anthropic_keys(),
            "gemini":    settings.get_gemini_keys(),
        }
        keys = mapping.get(provider, [])
        return keys[0] if keys else None

    def _get_key(self, provider: str) -> Optional[str]:
        """Get best available key: DB pool first, env fallback."""
        return self._get_db_key(provider) or self._get_env_key(provider)

    async def resolve(self, model: str) -> list[dict]:
        """
        Return ordered list of {provider, model, api_key} to try.
        Skips entries where circuit is open or no key is available.
        """
        model = model or DEFAULT_MODEL
        chain = FALLBACK_CHAINS.get(model)

        if not chain:
            # Unknown model — build a single-entry chain
            provider = infer_provider(model)
            chain = [(provider, model)]

        result = []
        for provider, fallback_model in chain:
            available = await self.circuit_breaker.is_provider_available(provider)
            if not available:
                continue
            api_key = await asyncio.get_event_loop().run_in_executor(
                None, lambda p=provider: self._get_key(p)
            )
            if not api_key:
                continue
            result.append({
                "provider": provider,
                "model": fallback_model,
                "api_key": api_key,
            })

        return result
