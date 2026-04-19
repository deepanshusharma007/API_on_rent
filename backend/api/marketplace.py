"""Marketplace API endpoints for plans and rentals."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from backend.database.connection import get_db
from backend.database.models import Plan, Rental, User, UsageLog, RentalStatus, Transaction, ProviderKey
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.api.schemas import PlanResponse, RentalPurchase, RentalResponse, UsageStats
from backend.api.dependencies import get_current_user
from backend.services.virtual_key_service import create_rental, get_rental_ttl
from backend.services.capacity_manager import CapacityManager

router = APIRouter()


@router.get("/active-providers")
def get_active_providers(db: Session = Depends(get_db)):
    """Return which providers currently have at least one active key.
    Public endpoint — no auth required, no key data exposed."""
    keys = db.query(ProviderKey).filter(ProviderKey.is_active == True).all()
    providers = list({k.provider.value if hasattr(k.provider, 'value') else k.provider for k in keys})
    return {"providers": providers}


@router.get("/plans", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    """List all active rental plans. Public endpoint."""
    plans = db.query(Plan).filter(Plan.is_active == True).all()
    return plans


@router.post("/rentals/purchase", response_model=RentalResponse, status_code=status.HTTP_201_CREATED)
async def purchase_rental(
    purchase_data: RentalPurchase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Purchase a rental plan."""
    user_id = current_user.id

    # Verify plan exists
    plan = db.query(Plan).filter(Plan.id == purchase_data.plan_id, Plan.is_active == True).first()
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
    transaction = Transaction(
        user_id=user_id,
        amount=plan.price,
        description=f"Direct purchase: {plan.name}",
        cashfree_order_id=f"direct_{user_id}_{plan.id}"
    )
    db.add(transaction)
    db.commit()

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


@router.get("/rentals/active")
async def get_active_rentals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get all active rentals for the current user."""
    user_id = current_user.id

    # Update expired rentals
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

    # Get active rentals
    rentals = db.query(Rental).filter(
        Rental.user_id == user_id,
        Rental.status == RentalStatus.ACTIVE
    ).all()

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


@router.get("/rentals/history", response_model=List[RentalResponse])
async def get_rental_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get user's expired rental history."""
    user_id = current_user.id

    rentals = db.query(Rental).filter(
        Rental.user_id == user_id,
        Rental.status == RentalStatus.EXPIRED
    ).order_by(Rental.created_at.desc()).all()

    response_list = []
    for rental in rentals:
        ttl = await get_rental_ttl(rental, redis_manager)
        rental_response = RentalResponse.model_validate(rental)
        rental_response.ttl_seconds = ttl
        response_list.append(rental_response)

    return response_list


@router.get("/rentals/{rental_id}/usage", response_model=UsageStats)
async def get_usage_stats(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get usage statistics for a rental."""
    rental = db.query(Rental).filter(
        Rental.id == rental_id,
        Rental.user_id == current_user.id
    ).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")

    current_balance = await redis_manager.get_token_balance(rental_id)
    ttl = await get_rental_ttl(rental, redis_manager)

    cache_hit_rate = 0.0
    total_logs = db.query(UsageLog).filter(UsageLog.rental_id == rental_id).count()
    if total_logs > 0:
        cached_logs = db.query(UsageLog).filter(
            UsageLog.rental_id == rental_id,
            UsageLog.was_cached == True
        ).count()
        cache_hit_rate = cached_logs / total_logs

    return UsageStats(
        tokens_used=rental.tokens_used,
        tokens_remaining=current_balance,
        requests_made=rental.requests_made,
        cache_hit_rate=cache_hit_rate,
        time_remaining_seconds=ttl
    )
