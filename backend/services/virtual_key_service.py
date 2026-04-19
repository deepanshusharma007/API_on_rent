"""Virtual key generation and management."""
import secrets
import string
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.models import Rental, Plan, User, RentalStatus
from backend.database.redis_manager import RedisManager

logger = logging.getLogger(__name__)


def generate_virtual_key(prefix: str = "vk") -> str:
    """Generate a secure virtual API key."""
    # Generate 32 character random string
    alphabet = string.ascii_letters + string.digits
    random_part = ''.join(secrets.choice(alphabet) for _ in range(32))
    return f"{prefix}_{random_part}"


async def create_rental(
    user_id: int,
    plan_id: int,
    db: Session,
    redis_manager: RedisManager,
    provider: Optional[str] = None
) -> Rental:
    """Create a new rental with virtual key and Redis TTL."""
    # Get plan details
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.is_active == True).first()
    if not plan:
        raise ValueError("Plan not found or inactive")
    
    # Generate virtual key
    virtual_key = generate_virtual_key()
    
    # Calculate expiration
    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(minutes=plan.duration_minutes)
    
    # Create rental record
    rental = Rental(
        user_id=user_id,
        plan_id=plan_id,
        virtual_key=virtual_key,
        status=RentalStatus.ACTIVE,
        tokens_used=0,
        tokens_remaining=plan.token_cap,
        requests_made=0,
        started_at=started_at,
        expires_at=expires_at
    )
    
    db.add(rental)
    db.commit()
    db.refresh(rental)
    
    # Set Redis TTL and rental data
    rental_data = {
        "rental_id": rental.id,
        "user_id": user_id,
        "plan_id": plan_id,
        "model_id": plan.model_id,          # None = universal plan (any model allowed)
        "provider": provider,               # Which provider the user selected
        "token_cap": plan.token_cap,
        "rpm_limit": plan.rpm_limit,
        "drain_rate_multiplier": plan.drain_rate_multiplier
    }
    
    await redis_manager.set_virtual_key_ttl(virtual_key, expires_at, rental_data)
    await redis_manager.set_token_balance(rental.id, plan.token_cap)

    # Send rental activation email (best-effort)
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            from backend.services.email_service import email_service
            email_service.send_rental_activated(
                email=user.email,
                plan_name=plan.name,
                virtual_key=virtual_key,
                expires_at=expires_at.isoformat(),
                token_cap=plan.token_cap
            )
    except Exception as e:
        logger.debug(f"Rental activation email failed (non-fatal): {e}")

    return rental


async def get_rental_ttl(rental: Rental, redis_manager: RedisManager) -> int:
    """Get remaining TTL for rental in seconds."""
    ttl = await redis_manager.get_virtual_key_ttl(rental.virtual_key)
    return max(0, ttl)  # Return 0 if expired
