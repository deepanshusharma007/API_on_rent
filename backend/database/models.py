"""Database models for AI API Rental SaaS."""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.database.connection import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""
    USER = "user"
    ADMIN = "admin"


class RentalStatus(str, enum.Enum):
    """Rental status enumeration."""
    ACTIVE = "active"
    EXPIRED = "expired"
    PAUSED = "paused"
    SUSPENDED = "suspended"


class ProviderType(str, enum.Enum):
    """AI provider enumeration."""
    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


class User(Base):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    rentals = relationship("Rental", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    spending_alerts = relationship("SpendingAlert", back_populates="user", cascade="all, delete-orphan")


class Plan(Base):
    """Rental plan model."""
    __tablename__ = "plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)  # USD
    duration_minutes = Column(Integer, nullable=False)  # Duration in minutes
    token_cap = Column(Integer, nullable=False)  # Maximum tokens
    rpm_limit = Column(Integer, nullable=False)  # Requests per minute
    drain_rate_multiplier = Column(Float, default=1.0, nullable=False)  # Credit consumption rate
    model_id = Column(String(100), nullable=True)          # e.g. "gpt-4o-mini"; NULL = all models
    duration_label = Column(String(50), nullable=True)     # e.g. "15 min" | "1 hour" | "6 hours" | "24 hours"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    rentals = relationship("Rental", back_populates="plan")


class Rental(Base):
    """User rental model."""
    __tablename__ = "rentals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    virtual_key = Column(String(255), unique=True, index=True, nullable=False)
    status = Column(SQLEnum(RentalStatus), default=RentalStatus.ACTIVE, nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    tokens_remaining = Column(Integer, nullable=False)
    requests_made = Column(Integer, default=0, nullable=False)
    ip_address = Column(String(45))  # IPv6 max length
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="rentals")
    plan = relationship("Plan", back_populates="rentals")
    usage_logs = relationship("UsageLog", back_populates="rental", cascade="all, delete-orphan")


class VirtualKey(Base):
    """Virtual API key model (legacy - now merged with Rental)."""
    __tablename__ = "virtual_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)
    rental_id = Column(Integer, ForeignKey("rentals.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProviderKey(Base):
    """Master API key pool for providers."""
    __tablename__ = "provider_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(SQLEnum(ProviderType), nullable=False)
    api_key = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    usage_count = Column(Integer, default=0, nullable=False)  # For round-robin tracking
    last_used_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Transaction(Base):
    """Payment and usage transaction model."""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rental_id = Column(Integer, ForeignKey("rentals.id"))
    amount = Column(Float, nullable=False)  # USD
    description = Column(Text)
    cashfree_order_id = Column(String(255), index=True)  # Cashfree order_id for idempotency
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="transactions")


class UsageLog(Base):
    """Token usage log model."""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    rental_id = Column(Integer, ForeignKey("rentals.id"), nullable=False)
    model = Column(String(100), nullable=False)  # e.g., "gpt-4o", "claude-3.5-sonnet"
    tokens_used = Column(Integer, nullable=False)
    credits_consumed = Column(Float, nullable=False)  # With drain rate applied
    cost_usd = Column(Float, default=0.0, nullable=False)  # Actual provider cost
    was_cached = Column(Boolean, default=False, nullable=False)  # Semantic cache hit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    rental = relationship("Rental", back_populates="usage_logs")


class CacheHit(Base):
    """Semantic cache analytics model."""
    __tablename__ = "cache_hits"
    
    id = Column(Integer, primary_key=True, index=True)
    rental_id = Column(Integer, ForeignKey("rentals.id"))
    prompt_hash = Column(String(64), nullable=False)  # SHA256 of prompt
    similarity_score = Column(Float, nullable=False)  # Cosine similarity
    tokens_saved = Column(Integer, nullable=False)
    cost_saved_usd = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SpendingAlert(Base):
    """Per-user spending alert model."""
    __tablename__ = "spending_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount_usd = Column(Float, nullable=False)
    window_minutes = Column(Integer, nullable=False)
    was_suspended = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="spending_alerts")


class CircuitBreakerEvent(Base):
    """Circuit breaker event log."""
    __tablename__ = "circuit_breaker_events"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(SQLEnum(ProviderType), nullable=False)
    event_type = Column(String(50), nullable=False)  # "trip", "recover", "failure"
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
