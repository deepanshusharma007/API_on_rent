"""Multi-provider fallback chain service."""
from typing import Dict, Any, Optional, List
from backend.services.circuit_breaker import CircuitBreakerService


def infer_provider(model_id: str) -> str:
    """Infer provider from model ID prefix. Mirrors frontend inferProvider()."""
    if not model_id:
        return "openai"
    m = model_id.lower()
    if m.startswith("gpt-") or m.startswith("o1") or m.startswith("o3"):
        return "openai"
    if m.startswith("gemini-") or m.startswith("palm-") or m.startswith("bison"):
        return "gemini"
    if m.startswith("claude-"):
        return "anthropic"
    return "openai"  # safe default


class FallbackChain:
    """Manages fallback chain across multiple AI providers."""

    def __init__(self, circuit_breaker: CircuitBreakerService):
        self.circuit_breaker = circuit_breaker

    async def get_fallback_chain(self, model: str) -> List[Dict[str, str]]:
        """
        Build the provider call list for a given model.

        Primary entry is always the model's native provider.
        We do NOT silently swap models across providers (user paid for a
        specific model — cross-provider fallback would change the output
        characteristics without consent). If the native provider's circuit
        is open the call simply fails with a 503.
        """
        primary_provider = infer_provider(model)

        is_available = await self.circuit_breaker.is_provider_available(primary_provider)
        if not is_available:
            return []   # caller raises 503

        return [{"provider": primary_provider, "model": model}]
