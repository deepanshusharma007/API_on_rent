"""Provider key load balancer — picks key with most remaining token budget."""
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.models import ProviderKey, ProviderType
from datetime import datetime


# LiteLLM/fallback chain uses "google" but our DB uses "gemini"
PROVIDER_NAME_MAP = {
    "openai": "OPENAI",
    "anthropic": "ANTHROPIC",
    "google": "GEMINI",
    "gemini": "GEMINI",
}


class KeyRotationService:
    """Load-balances provider API keys by remaining token budget.

    Selection logic:
      1. Keys with token_budget > 0  →  pick the one with most (token_budget - tokens_consumed)
      2. Keys with token_budget == 0 →  treated as unlimited; fall back to least-used round-robin
      3. Keys whose budget is fully exhausted are skipped (soft-deactivated for this call)
    """

    def __init__(self, db: Session):
        self.db = db

    def get_next_key(self, provider: str) -> Optional[str]:
        """Return the API key with the most remaining token budget for the provider."""
        try:
            enum_name = PROVIDER_NAME_MAP.get(provider.lower())
            if not enum_name:
                return None

            provider_enum = ProviderType[enum_name]

            keys = self.db.query(ProviderKey).filter(
                ProviderKey.provider == provider_enum,
                ProviderKey.is_active == True,
            ).all()

            if not keys:
                return None

            # Separate budgeted keys from unlimited keys (token_budget == 0 means unlimited)
            budgeted = [k for k in keys if k.token_budget > 0]
            unlimited = [k for k in keys if k.token_budget == 0]

            selected_key = None

            if budgeted:
                # Among budgeted keys, filter out exhausted ones then pick most remaining
                available = [k for k in budgeted if k.tokens_consumed < k.token_budget]
                if available:
                    selected_key = max(available, key=lambda k: k.token_budget - k.tokens_consumed)

            # Fall back to unlimited keys (round-robin by usage_count)
            if selected_key is None and unlimited:
                selected_key = min(unlimited, key=lambda k: k.usage_count)

            if selected_key is None:
                return None

            selected_key.usage_count += 1
            selected_key.last_used_at = datetime.utcnow()
            self.db.commit()

            return selected_key.api_key

        except (KeyError, ValueError):
            return None

    def deduct_tokens(self, api_key: str, tokens: int):
        """Record token consumption against the key that served a request."""
        if tokens <= 0:
            return
        key = self.db.query(ProviderKey).filter(ProviderKey.api_key == api_key).first()
        if key:
            key.tokens_consumed += tokens
            self.db.commit()

    def mark_key_inactive(self, api_key: str):
        """Mark a key as inactive (e.g., if it returns auth errors)."""
        key = self.db.query(ProviderKey).filter(ProviderKey.api_key == api_key).first()
        if key:
            key.is_active = False
            self.db.commit()
