"""Pydantic schemas for API requests and responses."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from backend.database.models import UserRole, RentalStatus


# ==================== Authentication Schemas ====================

class UserRegister(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User information response."""
    id: int
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Plan Schemas ====================

class PlanCreate(BaseModel):
    """Create rental plan request."""
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    token_cap: int
    rpm_limit: int
    drain_rate_multiplier: float = 1.0
    model_id: Optional[str] = None          # e.g. "gpt-4o-mini"; None = all models
    duration_label: Optional[str] = None    # e.g. "1 hour"


class PlanResponse(BaseModel):
    """Rental plan response."""
    id: int
    name: str
    description: Optional[str]
    price: float
    duration_minutes: int
    token_cap: int
    rpm_limit: int
    drain_rate_multiplier: float
    model_id: Optional[str] = None
    duration_label: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Rental Schemas ====================

class RentalPurchase(BaseModel):
    """Purchase rental request."""
    plan_id: int
    payment_method_id: str = "direct"  # legacy field, not used in Cashfree flow


class RentalResponse(BaseModel):
    """Rental information response."""
    id: int
    plan_id: int
    virtual_key: str
    status: RentalStatus
    tokens_used: int
    tokens_remaining: int
    requests_made: int
    started_at: datetime
    expires_at: datetime
    ttl_seconds: Optional[int] = None  # Remaining time in seconds
    
    class Config:
        from_attributes = True


class UsageStats(BaseModel):
    """Usage statistics response."""
    tokens_used: int
    tokens_remaining: int
    requests_made: int
    cache_hit_rate: float
    time_remaining_seconds: int


# ==================== Admin Schemas ====================

class CreditInjection(BaseModel):
    """Admin credit injection request."""
    user_id: int
    credits: int
    reason: str


class SpendingAlertResponse(BaseModel):
    """Spending alert response."""
    id: int
    user_id: int
    amount_usd: float
    window_minutes: int
    was_suspended: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
