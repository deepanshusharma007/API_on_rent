"""Marketplace API endpoints for plans and rentals."""
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from backend.database.connection import get_db
from backend.database.models import Plan, Rental, User, UsageLog, RentalStatus, Transaction, ProviderKey
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.api.schemas import PlanResponse, RentalPurchase, RentalResponse, UsageStats
from backend.api.dependencies import get_current_user
from backend.services.virtual_key_service import create_rental, get_rental_ttl
from backend.services.capacity_manager import CapacityManager

router = APIRouter()


@router.get("/active-providers", summary="List active providers", description="Returns providers that have at least one active API key configured. Only these providers are available for rental. Public endpoint — no auth required.")
async def get_active_providers(db: Session = Depends(get_db)):
    """Return which providers currently have at least one active key.
    Public endpoint — no auth required, no key data exposed."""
    loop = asyncio.get_event_loop()
    keys = await loop.run_in_executor(
        None, lambda: db.query(ProviderKey).filter(ProviderKey.is_active == True).all()
    )
    providers = list({k.provider.value if hasattr(k.provider, 'value') else k.provider for k in keys})
    return {"providers": providers}


@router.get("/plans", response_model=List[PlanResponse], summary="List rental plans", description="Returns all active rental plans with duration, token cap, rate limit, and price. Public endpoint — no auth required.")
async def list_plans(db: Session = Depends(get_db)):
    """List all active rental plans. Public endpoint."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, lambda: db.query(Plan).filter(Plan.is_active == True).all()
    )


@router.post("/rentals/purchase", response_model=RentalResponse, status_code=status.HTTP_201_CREATED, summary="Direct purchase (legacy)", description="Purchase a rental plan directly without a payment gateway. Use POST /api/checkout/session for the Cashfree-based checkout flow instead.")
async def purchase_rental(
    purchase_data: RentalPurchase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Purchase a rental plan."""
    user_id = current_user.id
    loop = asyncio.get_event_loop()

    # Verify plan exists
    plan = await loop.run_in_executor(
        None, lambda: db.query(Plan).filter(Plan.id == purchase_data.plan_id, Plan.is_active == True).first()
    )
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    # ==================== CAPACITY CHECK ====================
    capacity_mgr = CapacityManager(redis_manager)
    capacity_check = await capacity_mgr.can_sell_plan(
        token_cap=plan.token_cap,
        rpm_limit=plan.rpm_limit,
        estimated_cost=plan.price * 0.4  # Estimate ~40% of price goes to provider costs
    )
    if not capacity_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"This plan is temporarily sold out. {capacity_check['reason']}"
        )

    # Direct purchase (no payment gateway) — use POST /api/checkout/session for Cashfree flow.
    def _record_purchase():
        transaction = Transaction(
            user_id=user_id,
            amount=plan.price,
            description=f"Direct purchase: {plan.name}",
            cashfree_order_id=f"direct_{user_id}_{plan.id}"
        )
        db.add(transaction)
        db.commit()

    await loop.run_in_executor(None, _record_purchase)

    # Create rental
    try:
        rental = await create_rental(user_id, plan.id, db, redis_manager)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # ==================== RESERVE CAPACITY ====================
    await capacity_mgr.reserve_capacity(plan.token_cap, plan.rpm_limit)

    # Get TTL
    ttl = await get_rental_ttl(rental, redis_manager)

    response = RentalResponse.model_validate(rental)
    response.ttl_seconds = ttl

    return response


@router.get("/rentals/active", summary="My active rentals", description="Returns all active rentals for the authenticated user, including virtual key, tokens remaining, and expiry time.")
async def get_active_rentals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get all active rentals for the current user."""
    user_id = current_user.id
    loop = asyncio.get_event_loop()

    # Update expired rentals and fetch active ones — all in one thread to avoid round-trips
    def _fetch_active():
        now = datetime.utcnow()
        expired_rentals = db.query(Rental).filter(
            Rental.user_id == user_id,
            Rental.status == RentalStatus.ACTIVE,
            Rental.expires_at <= now
        ).all()
        for rental in expired_rentals:
            rental.status = RentalStatus.EXPIRED
        if expired_rentals:
            db.commit()
        return db.query(Rental).options(joinedload(Rental.plan)).filter(
            Rental.user_id == user_id,
            Rental.status == RentalStatus.ACTIVE
        ).all()

    rentals = await loop.run_in_executor(None, _fetch_active)

    response_data = []
    for r in rentals:
        ttl = await get_rental_ttl(r, redis_manager)

        if ttl == 0 and r.status == RentalStatus.ACTIVE:
            delta = r.expires_at - datetime.utcnow()
            ttl = max(0, int(delta.total_seconds()))

        response_data.append({
            "id": r.id,
            "plan_id": r.plan_id,
            "virtual_key": r.virtual_key,
            "status": r.status.value,
            "tokens_used": r.tokens_used,
            "tokens_remaining": r.tokens_remaining,
            "requests_made": r.requests_made,
            "started_at": r.started_at.isoformat(),
            "expires_at": r.expires_at.isoformat(),
            "plan_name": r.plan.name if r.plan else "Unknown",
            "ttl_seconds": ttl
        })

    return response_data


@router.get("/rentals/history", response_model=List[RentalResponse], summary="Rental history", description="Returns the authenticated user's past (expired) rentals in reverse chronological order.")
async def get_rental_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get user's expired rental history."""
    user_id = current_user.id
    loop = asyncio.get_event_loop()

    rentals = await loop.run_in_executor(
        None,
        lambda: db.query(Rental).filter(
            Rental.user_id == user_id,
            Rental.status == RentalStatus.EXPIRED
        ).order_by(Rental.created_at.desc()).all()
    )

    response_list = []
    for rental in rentals:
        ttl = await get_rental_ttl(rental, redis_manager)
        rental_response = RentalResponse.model_validate(rental)
        rental_response.ttl_seconds = ttl
        response_list.append(rental_response)

    return response_list


@router.get("/rentals/{rental_id}/usage", response_model=UsageStats, summary="Rental usage stats", description="Returns token usage, cache hit rate, and time remaining for a specific rental belonging to the authenticated user.")
async def get_usage_stats(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get usage statistics for a rental."""
    loop = asyncio.get_event_loop()

    def _fetch_rental_stats():
        rental = db.query(Rental).filter(
            Rental.id == rental_id,
            Rental.user_id == current_user.id
        ).first()
        if not rental:
            return None, 0, 0
        total_logs = db.query(UsageLog).filter(UsageLog.rental_id == rental_id).count()
        cached_logs = 0
        if total_logs > 0:
            cached_logs = db.query(UsageLog).filter(
                UsageLog.rental_id == rental_id,
                UsageLog.was_cached == True
            ).count()
        return rental, total_logs, cached_logs

    rental, total_logs, cached_logs = await loop.run_in_executor(None, _fetch_rental_stats)
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")

    current_balance, ttl = await asyncio.gather(
        redis_manager.get_token_balance(rental_id),
        get_rental_ttl(rental, redis_manager)
    )

    cache_hit_rate = cached_logs / total_logs if total_logs > 0 else 0.0

    return UsageStats(
        tokens_used=rental.tokens_used,
        tokens_remaining=current_balance,
        requests_made=rental.requests_made,
        cache_hit_rate=cache_hit_rate,
        time_remaining_seconds=ttl
    )


# ==================== Contact Form ====================

class ContactFormRequest(BaseModel):
    name: str
    email: str
    subject: Optional[str] = ""
    message: str


@router.post("/contact", summary="Contact form", description="Public endpoint — submits the contact form and emails the site owner.")
async def submit_contact_form(payload: ContactFormRequest):
    """Accept a contact form submission and email it to the site owner."""
    # Basic validation
    if not payload.name.strip() or not payload.email.strip() or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Name, email, and message are required.")

    from backend.services.email_service import email_service
    from backend.config import settings

    owner_email = settings.ADMIN_NOTIFICATION_EMAIL or settings.ADMIN_EMAIL

    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: email_service.send_contact_form(
                sender_name=payload.name.strip(),
                sender_email=payload.email.strip(),
                subject=payload.subject.strip() if payload.subject else "",
                message=payload.message.strip(),
                owner_email=owner_email,
            )
        )
    except Exception as e:
        # Don't expose internal errors — just log and return 502
        import logging
        logging.getLogger(__name__).error(f"Contact form email failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to send message. Please try again or email us directly.")

    return {"status": "sent", "message": "Your message has been received. We'll get back to you soon!"}
