"""Master key rotation service for bypassing RPM/TPM limits."""
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
    """Manages round-robin rotation of provider API keys."""

    def __init__(self, db: Session):
        self.db = db

    def get_next_key(self, provider: str) -> Optional[str]:
        """Get next API key using round-robin rotation."""
        try:
            # Map provider name to enum
            enum_name = PROVIDER_NAME_MAP.get(provider.lower())
            if not enum_name:
                return None

            provider_enum = ProviderType[enum_name]

            # Get all active keys for provider, ordered by usage count (least used first)
            keys = self.db.query(ProviderKey).filter(
                ProviderKey.provider == provider_enum,
                ProviderKey.is_active == True
            ).order_by(ProviderKey.usage_count.asc()).all()

            if not keys:
                return None

            # Get least used key
            selected_key = keys[0]

            # Increment usage count
            selected_key.usage_count += 1
            selected_key.last_used_at = datetime.utcnow()
            self.db.commit()

            return selected_key.api_key

        except (KeyError, ValueError):
            return None

    def mark_key_inactive(self, api_key: str):
        """Mark a key as inactive (e.g., if it's rate limited)."""
        key = self.db.query(ProviderKey).filter(ProviderKey.api_key == api_key).first()
        if key:
            key.is_active = False
            self.db.commit()
