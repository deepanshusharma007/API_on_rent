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
    "claude-3-opus": 10.0,
    "claude-3-sonnet": 8.0,
    "claude-3-haiku": 3.0,
    "claude-2.1": 6.0,
    "claude-2": 6.0,
    
    # Google models
    "gemini-1.5-pro": 7.0,
    "gemini-1.5-flash": 1.0,
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
    
    # Partial match (e.g., "gpt-4o-2024-05-13" matches "gpt-4o")
    for model_key, rate in MODEL_DRAIN_RATES.items():
        if model_key in normalized_model:
            return rate
    
    # Default rate for unknown models
    return MODEL_DRAIN_RATES["default"]


def calculate_credits_consumed(model: str, tokens_used: int) -> int:
    """
    Calculate credits consumed based on model and tokens.
    
    Args:
        model: Model name
        tokens_used: Number of tokens consumed
    
    Returns:
        Credits consumed (integer)
    """
    drain_rate = get_drain_rate(model)
    
    # Base calculation: tokens * drain_rate / 1000
    # This means 1000 tokens on gpt-4o (10x) = 10 credits
    # 1000 tokens on gemini-flash (1x) = 1 credit
    credits = int((tokens_used * drain_rate) / 1000)
    
    # Minimum 1 credit per request
    return max(1, credits)


def get_model_display_info(model: str) -> Dict[str, any]:
    """
    Get display information for a model including drain rate.
    
    Args:
        model: Model name
    
    Returns:
        Dictionary with model info (name, drain_rate, tier)
    """
    drain_rate = get_drain_rate(model)
    
    # Determine tier based on drain rate
    if drain_rate >= 8.0:
        tier = "Premium"
        color = "red"
    elif drain_rate >= 5.0:
        tier = "Pro"
        color = "orange"
    elif drain_rate >= 3.0:
        tier = "Standard"
        color = "blue"
    else:
        tier = "Economy"
        color = "green"
    
    return {
        "model": model,
        "drain_rate": drain_rate,
        "tier": tier,
        "color": color,
        "description": f"{drain_rate}x credit consumption"
    }


def get_all_models_info() -> Dict[str, Dict]:
    """Get display info for all supported models."""
    return {
        model: get_model_display_info(model)
        for model in MODEL_DRAIN_RATES.keys()
        if model != "default"
    }
