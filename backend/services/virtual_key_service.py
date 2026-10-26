"""Virtual key generation and management."""
import asyncio
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
    provider: Optional[str] = None,
    send_activation_email: bool = True
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
    
    try:
        await redis_manager.set_virtual_key_ttl(virtual_key, expires_at, rental_data)
        await redis_manager.set_token_balance(rental.id, plan.token_cap)
    except Exception:
        # Don't leave an ACTIVE rental whose key was never activated: undo it, so a
        # retry (e.g. a redelivered payment webhook) creates exactly one rental.
        try:
            await redis_manager.delete_virtual_key(virtual_key)
        except Exception as e:
            logger.error(f"Could not clean up key for failed rental {rental.id}: {e}")
        try:
            db.delete(rental)
            db.commit()
        except Exception as e:
            logger.error(f"Could not remove failed rental {rental.id}: {e}")
        raise

    # Send rental activation email (best-effort, in a worker thread so a slow
    # SMTP server never delays the response or blocks the event loop)
    if send_activation_email:
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                from backend.services.email_service import email_service
                user_email, plan_name, token_cap = user.email, plan.name, plan.token_cap
                asyncio.get_running_loop().run_in_executor(
                    None,
                    lambda: email_service.send_rental_activated(
                        email=user_email,
                        plan_name=plan_name,
                        virtual_key=virtual_key,
                        expires_at=expires_at.isoformat(),
                        token_cap=token_cap
                    )
                )
        except Exception as e:
            logger.debug(f"Rental activation email failed (non-fatal): {e}")

    return rental


async def get_rental_ttl(rental: Rental, redis_manager: RedisManager) -> int:
    """Get remaining TTL for rental in seconds."""
    ttl = await redis_manager.get_virtual_key_ttl(rental.virtual_key)
    return max(0, ttl)  # Return 0 if expired


async def restore_rental_key(rental: Rental, db: Session, redis_manager: RedisManager) -> None:
    """Re-activate a PAUSED or SUSPENDED rental that has not expired yet.

    Rebuilds the Redis key with the time that is left and, if the balance expired from
    Redis, restores it from the database (kept up to date on every request). The provider
    the customer originally picked is only stored in the deleted key, so a restored rental
    is not provider-restricted; its plan limits and model still apply."""
    if rental.status not in (RentalStatus.PAUSED, RentalStatus.SUSPENDED):
        raise ValueError(f"Rental is {rental.status.value}, not paused or suspended")
    if rental.expires_at <= datetime.utcnow():
        raise ValueError("Rental has already expired")
    plan = db.query(Plan).filter(Plan.id == rental.plan_id).first()
    if not plan:
        raise ValueError("The rental's plan no longer exists")

    rental_data = {
        "rental_id": rental.id,
        "user_id": rental.user_id,
        "plan_id": rental.plan_id,
        "model_id": plan.model_id,
        "provider": None,
        "token_cap": plan.token_cap,
        "rpm_limit": plan.rpm_limit,
        "drain_rate_multiplier": plan.drain_rate_multiplier,
    }
    await redis_manager.set_virtual_key_ttl(rental.virtual_key, rental.expires_at, rental_data)
    if not await redis_manager.redis.exists(f"balance:{rental.id}"):
        await redis_manager.set_token_balance(rental.id, max(rental.tokens_remaining, 0))
    rental.status = RentalStatus.ACTIVE
    db.commit()
