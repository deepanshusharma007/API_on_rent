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
    remember_me: bool = False


class SignupOtpRequest(BaseModel):
    """Start email signup: send a verification code."""
    email: EmailStr


class SignupOtpVerify(BaseModel):
    """Check the emailed verification code."""
    email: EmailStr
    otp: str = Field(..., pattern=r"^\d{6}$")


class SignupComplete(BaseModel):
    """Finish email signup with the token from verify-otp and a new password."""
    signup_token: str = Field(..., min_length=20, max_length=200)
    password: str


class PasswordForgotRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)
    password: str


class GoogleLoginRequest(BaseModel):
    """ID token (credential) from Google Identity Services."""
    credential: str = Field(..., min_length=20, max_length=8192)
    remember_me: bool = False


class OtpSentResponse(BaseModel):
    message: str
    expires_in: int
    resend_after: int


class SignupVerifiedResponse(BaseModel):
    signup_token: str
    expires_in: int


class MessageResponse(BaseModel):
    message: str


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
    provider: Optional[str] = None        # e.g. "openai", "gemini", "anthropic"
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
