"""Drain rate system for dynamic credit consumption based on model."""
from typing import Dict

# Model drain rate multipliers (credits per second of usage)
# Higher multiplier = more expensive model = faster credit drain
MODEL_DRAIN_RATES: Dict[str, float] = {
    # OpenAI models
    "gpt-4o": 10.0,
    "gpt-4o-mini": 3.0,
    "gpt-4-turbo": 8.0,
    "gpt-4": 8.0,
    "gpt-3.5-turbo": 3.0,
    "gpt-3.5-turbo-16k": 4.0,
    
    # Anthropic models
    "claude-3-5-sonnet-20241022": 8.0,
    "claude-sonnet-5-5": 8.0,
    "claude-haiku-5-5": 5.0,
    "claude-opus-4-8": 10.0,
    "claude-3-opus": 10.0,
    "claude-3-sonnet": 8.0,
    "claude-3-haiku": 3.0,
    "claude-2.1": 6.0,
    "claude-2": 6.0,
    
    # Reasoning models
    "o1": 10.0,
    "o1-mini": 5.0,
    "o3-mini": 4.0,

    # Google models
    "gemini-1.5-pro": 7.0,
    "gemini-1.5-flash": 1.0,
    "gemini-2.0-flash": 1.0,
    "gemini-1.0-pro": 5.0,
    "gemini-pro": 5.0,
    
    # Default for unknown models
    "default": 5.0
}


def get_drain_rate(model: str) -> float:
    """
    Get the drain rate multiplier for a given model.
    
    Args:
        model: Model name (e.g., "gpt-4o", "claude-3-sonnet")
    
    Returns:
        Drain rate multiplier (credits per second)
    """
    # Normalize model name (lowercase, remove version suffixes)
    normalized_model = model.lower().strip()
    
    # Direct match
    if normalized_model in MODEL_DRAIN_RATES:
        return MODEL_DRAIN_RATES[normalized_model]
    
    # Dated variants (e.g. "gpt-4o-mini-2024-07-18") use the LONGEST matching base name,
    # so a mini model is never billed at its bigger sibling's rate.
    matches = [k for k in MODEL_DRAIN_RATES if k != "default" and normalized_model.startswith(k)]
    if matches:
        return MODEL_DRAIN_RATES[max(matches, key=len)]
    
    # Default rate for unknown models
    return MODEL_DRAIN_RATES["default"]


