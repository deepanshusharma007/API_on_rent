"""Application configuration management."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "AI API Rental SaaS"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    USE_FAKE_REDIS: bool = False
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Admin
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    
    # API Provider Keys (comma-separated)
    OPENAI_API_KEYS: str = ""
    GEMINI_API_KEYS: str = ""
    ANTHROPIC_API_KEYS: str = ""
    
    # URLs (set in production to actual deployed URLs)
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Cashfree Payment Gateway
    CASHFREE_CLIENT_ID: str = ""
    CASHFREE_CLIENT_SECRET: str = ""
    CASHFREE_ENVIRONMENT: str = "sandbox"  # "sandbox" or "production"
    CASHFREE_WEBHOOK_SECRET: str = ""  # Same as CASHFREE_CLIENT_SECRET for signature verification

    # Email Notifications (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@apirental.dev"
    ADMIN_NOTIFICATION_EMAIL: str = ""  # Admin email for spending alerts
    
    # Cost Estimation
    PRE_REQUEST_COST_CHECK: bool = True
    COST_ESTIMATION_BUFFER: float = 1.2
    
    # Semantic Caching
    SEMANTIC_CACHE_ENABLED: bool = True
    CACHE_SIMILARITY_THRESHOLD: float = 0.95
    CACHE_TTL_SECONDS: int = 300
    
    # Circuit Breaker
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_TIMEOUT_SECONDS: int = 60
    
    # Spending Alerts
    SPENDING_ALERT_THRESHOLD_USD: float = 5.0
    SPENDING_ALERT_WINDOW_MINUTES: int = 10
    
    # Drain Rates
    DRAIN_RATE_GPT4O: int = 10
    DRAIN_RATE_CLAUDE35: int = 8
    DRAIN_RATE_GPT4O_MINI: int = 3
    DRAIN_RATE_GEMINI_FLASH: int = 1
    
    # PII Masking
    PII_MASKING_ENABLED: bool = True
    PII_MASK_EMAILS: bool = True
    PII_MASK_PHONES: bool = True
    PII_MASK_SSNS: bool = True
    PII_MASK_CREDIT_CARDS: bool = True
    
    # Cost Protection
    COST_PROTECTION_THRESHOLD: float = 0.90
    
    # Capacity Management
    OVERBOOKING_RATIO: float = 1.5
    
    class Config:
        import os
        from pathlib import Path
        # Get project root (parent of backend directory)
        backend_dir = Path(__file__).parent
        project_root = backend_dir.parent
        env_file = str(project_root / ".env")
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env
    
    def get_openai_keys(self) -> List[str]:
        """Parse comma-separated OpenAI keys."""
        return [k.strip() for k in self.OPENAI_API_KEYS.split(",") if k.strip()]
    
    def get_gemini_keys(self) -> List[str]:
        """Parse comma-separated Gemini keys."""
        return [k.strip() for k in self.GEMINI_API_KEYS.split(",") if k.strip()]
    
    def get_anthropic_keys(self) -> List[str]:
        """Parse comma-separated Anthropic keys."""
        return [k.strip() for k in self.ANTHROPIC_API_KEYS.split(",") if k.strip()]


# Global settings instance
settings = Settings()
