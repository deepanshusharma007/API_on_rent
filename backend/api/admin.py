"""Admin API endpoints for platform management."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
import time
from datetime import datetime, timedelta
from pydantic import BaseModel

from backend.database.connection import get_db
from backend.database.models import (
    User, Rental, Plan, Transaction, UsageLog, ProviderKey,
    SpendingAlert, RentalStatus, ProviderType, UserRole
)
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.api.dependencies import get_current_admin
from backend.api.schemas import PlanCreate, PlanResponse, CreditInjection

router = APIRouter()


# ==================== Schemas ====================

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    token_cap: Optional[int] = None
    rpm_limit: Optional[int] = None
    drain_rate_multiplier: Optional[float] = None
    model_id: Optional[str] = None
    duration_label: Optional[str] = None
    is_active: Optional[bool] = None


class ProviderKeyCreate(BaseModel):
    provider: str  # "openai", "gemini", "anthropic"
    api_key: str


class ProviderKeyUpdate(BaseModel):
    provider: Optional[str] = None
    is_active: Optional[bool] = None


class CapacityConfig(BaseModel):
    provider: str
    monthly_budget_usd: float
    max_rpm: int
    max_tpm: int
    overbooking_ratio: float = 1.5


# ==================== User Management ====================

@router.get("/users", summary="List all users", description="Returns all registered users with account status and rental count. Admin only.")
async def list_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all users."""
    loop = asyncio.get_event_loop()
    users = await loop.run_in_executor(
        None, lambda: db.query(User).options(joinedload(User.rentals)).all()
    )
    return {
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
                "rental_count": len(u.rentals) if u.rentals else 0
            }
            for u in users
        ]
    }


@router.post("/users/{user_id}/suspend", summary="Suspend user", description="Deactivates a user account and suspends all their active rentals. Admin only.")
async def suspend_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend a user account."""
    loop = asyncio.get_event_loop()

    def _suspend():
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, None
        if user.role == UserRole.ADMIN:
            return user, "admin"
        user.is_active = False
        active_rentals = db.query(Rental).filter(
            Rental.user_id == user_id,
            Rental.status == RentalStatus.ACTIVE
        ).all()
        for rental in active_rentals:
            rental.status = RentalStatus.SUSPENDED
        db.commit()
        return user, len(active_rentals)

    user, result = await loop.run_in_executor(None, _suspend)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if result == "admin":
        raise HTTPException(status_code=400, detail="Cannot suspend admin users")
    return {"message": f"User {user.email} suspended", "rentals_suspended": result}


@router.post("/users/{user_id}/activate", summary="Activate user", description="Reactivates a previously suspended user account. Admin only.")
async def activate_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reactivate a suspended user account."""
    loop = asyncio.get_event_loop()

    def _activate():
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        user.is_active = True
        db.commit()
        return user

    user = await loop.run_in_executor(None, _activate)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {user.email} activated"}


# ==================== Credit Injection ====================

@router.post("/users/{user_id}/credit", summary="Inject credits", description="Add tokens to a user's most recent active rental. Use for support compensation or manual top-ups. Admin only.")
async def inject_credits(
    user_id: int,
    injection: CreditInjection,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Add time or tokens to a user's active rental."""
    loop = asyncio.get_event_loop()

    user, rental = await loop.run_in_executor(None, lambda: (
        db.query(User).filter(User.id == user_id).first(),
        db.query(Rental).filter(
            Rental.user_id == user_id,
            Rental.status == RentalStatus.ACTIVE
        ).order_by(Rental.created_at.desc()).first()
    ))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not rental:
        raise HTTPException(status_code=404, detail="No active rental found for user")

    # Add tokens
    rental.tokens_remaining += injection.credits
    current_balance = await redis_manager.get_token_balance(rental.id)
    new_balance = current_balance + injection.credits
    await redis_manager.set_token_balance(rental.id, new_balance)

    # Log as transaction
    def _commit_credit():
        transaction = Transaction(
            user_id=user_id,
            rental_id=rental.id,
            amount=0.0,
            description=f"Credit injection: {injection.credits} tokens. Reason: {injection.reason}"
        )
        db.add(transaction)
        db.commit()

    await loop.run_in_executor(None, _commit_credit)

    return {
        "message": f"Injected {injection.credits} tokens to user {user.email}",
        "rental_id": rental.id,
        "new_balance": new_balance,
        "reason": injection.reason
    }


# ==================== Plan Management ====================

@router.get("/plans", response_model=List[PlanResponse], summary="List all plans (admin)", description="Returns all plans including inactive ones. Admin only.")
async def list_all_plans(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all plans (including inactive)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: db.query(Plan).all())


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_data: PlanCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new rental plan."""
    loop = asyncio.get_event_loop()

    def _create():
        plan = Plan(
            name=plan_data.name,
            description=plan_data.description,
            price=plan_data.price,
            duration_minutes=plan_data.duration_minutes,
            token_cap=plan_data.token_cap,
            rpm_limit=plan_data.rpm_limit,
            drain_rate_multiplier=plan_data.drain_rate_multiplier,
            model_id=plan_data.model_id,
            duration_label=plan_data.duration_label,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan

    return await loop.run_in_executor(None, _create)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: int,
    plan_data: PlanUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update an existing plan."""
    loop = asyncio.get_event_loop()

    def _update():
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            return None
        update_data = plan_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(plan, field, value)
        db.commit()
        db.refresh(plan)
        return plan

    plan = await loop.run_in_executor(None, _update)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deactivate a plan (soft delete)."""
    loop = asyncio.get_event_loop()

    def _delete():
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            return None
        plan.is_active = False
        db.commit()
        return plan

    plan = await loop.run_in_executor(None, _delete)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": f"Plan '{plan.name}' deactivated"}


# ==================== Provider Key Management ====================

@router.get("/provider-keys")
async def list_provider_keys(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all provider API keys (masked)."""
    loop = asyncio.get_event_loop()
    keys = await loop.run_in_executor(None, lambda: db.query(ProviderKey).all())
    return {
        "total": len(keys),
        "keys": [
            {
                "id": k.id,
                "provider": k.provider.value if hasattr(k.provider, 'value') else k.provider,
                "key_preview": k.api_key[:8] + "..." + k.api_key[-4:] if len(k.api_key) > 12 else "***",
                "is_active": k.is_active,
                "usage_count": k.usage_count,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "created_at": k.created_at.isoformat()
            }
            for k in keys
        ]
    }


@router.post("/provider-keys", status_code=status.HTTP_201_CREATED)
async def add_provider_key(
    key_data: ProviderKeyCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Add a provider API key to the pool."""
    try:
        provider_enum = ProviderType(key_data.provider.lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Must be one of: {[p.value for p in ProviderType]}"
        )

    loop = asyncio.get_event_loop()

    def _add_key():
        existing = db.query(ProviderKey).filter(ProviderKey.api_key == key_data.api_key).first()
        if existing:
            return None
        provider_key = ProviderKey(provider=provider_enum, api_key=key_data.api_key, is_active=True)
        db.add(provider_key)
        db.commit()
        db.refresh(provider_key)
        return provider_key

    provider_key = await loop.run_in_executor(None, _add_key)
    if provider_key is None:
        raise HTTPException(status_code=400, detail="This API key already exists")

    return {
        "message": f"Added {provider_enum.value} API key",
        "id": provider_key.id,
        "provider": provider_enum.value
    }


@router.put("/provider-keys/{key_id}")
async def update_provider_key(
    key_id: int,
    key_data: ProviderKeyUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Edit a provider API key's metadata (provider, model_name, active status)."""
    # Validate provider value before hitting the DB
    new_provider = None
    if key_data.provider is not None:
        try:
            new_provider = ProviderType(key_data.provider.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {[p.value for p in ProviderType]}")

    loop = asyncio.get_event_loop()

    def _update():
        key = db.query(ProviderKey).filter(ProviderKey.id == key_id).first()
        if not key:
            return None
        if new_provider is not None:
            key.provider = new_provider
        if key_data.is_active is not None:
            key.is_active = key_data.is_active
        db.commit()
        db.refresh(key)
        return key

    key = await loop.run_in_executor(None, _update)
    if not key:
        raise HTTPException(status_code=404, detail="Provider key not found")
    return {
        "message": "Provider key updated",
        "id": key.id,
        "provider": key.provider.value if hasattr(key.provider, 'value') else key.provider,
        "is_active": key.is_active,
    }


@router.delete("/provider-keys/{key_id}")
async def remove_provider_key(
    key_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Remove a provider API key."""
    loop = asyncio.get_event_loop()

    def _remove():
        key = db.query(ProviderKey).filter(ProviderKey.id == key_id).first()
        if not key:
            return None
        provider_val = key.provider.value
        db.delete(key)
        db.commit()
        return provider_val

    provider_val = await loop.run_in_executor(None, _remove)
    if provider_val is None:
        raise HTTPException(status_code=404, detail="Provider key not found")
    return {"message": f"Removed {provider_val} API key"}


# ==================== Rental Management ====================

@router.get("/rentals")
async def list_all_rentals(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all rentals across all users."""
    loop = asyncio.get_event_loop()
    rentals = await loop.run_in_executor(
        None, lambda: db.query(Rental).options(joinedload(Rental.user), joinedload(Rental.plan)).all()
    )
    return {
        "total": len(rentals),
        "rentals": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "user_email": r.user.email if r.user else "Unknown",
                "plan_id": r.plan_id,
                "plan_name": r.plan.name if r.plan else "Unknown",
                "status": r.status.value,
                "virtual_key": r.virtual_key[:12] + "...",
                "expires_at": r.expires_at.isoformat(),
                "tokens_used": r.tokens_used,
                "tokens_remaining": r.tokens_remaining,
                "requests_made": r.requests_made
            }
            for r in rentals
        ]
    }


@router.post("/rentals/{rental_id}/pause")
async def pause_rental(
    rental_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Pause an active rental."""
    loop = asyncio.get_event_loop()
    rental = await loop.run_in_executor(
        None, lambda: db.query(Rental).filter(Rental.id == rental_id).first()
    )
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    if rental.status != RentalStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Rental is already {rental.status.value}")

    rental.status = RentalStatus.PAUSED
    await redis_manager.delete_virtual_key(rental.virtual_key)
    await loop.run_in_executor(None, db.commit)

    return {"message": f"Rental {rental_id} paused", "rental_id": rental_id}


@router.delete("/rentals/{rental_id}")
async def suspend_rental(
    rental_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Suspend a rental."""
    loop = asyncio.get_event_loop()
    rental = await loop.run_in_executor(
        None, lambda: db.query(Rental).filter(Rental.id == rental_id).first()
    )
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    rental.status = RentalStatus.SUSPENDED
    await redis_manager.delete_virtual_key(rental.virtual_key)
    await loop.run_in_executor(None, db.commit)

    return {"message": "Rental suspended", "rental_id": rental_id}


# ==================== Analytics ====================

@router.get("/stats", summary="Platform statistics", description="Returns high-level platform metrics: total users, active rentals, total revenue. Admin only.")
async def get_platform_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get platform-wide statistics."""
    loop = asyncio.get_event_loop()

    def _stats():
        total_users = db.query(User).count()
        active_rentals = db.query(Rental).filter(Rental.status == RentalStatus.ACTIVE).count()
        total_rentals = db.query(Rental).count()
        total_revenue = db.query(func.sum(Transaction.amount)).scalar() or 0
        return total_users, active_rentals, total_rentals, total_revenue

    total_users, active_rentals, total_rentals, total_revenue = await loop.run_in_executor(None, _stats)
    return {
        "total_users": total_users,
        "active_rentals": active_rentals,
        "total_rentals": total_rentals,
        "total_revenue": float(total_revenue),
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/analytics", summary="Profit analytics", description="Revenue vs provider cost breakdown for the given time window (default 24h). Includes per-model and per-plan stats, cache hit rate. Admin only.")
async def get_profit_analytics(
    hours: int = 24,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Profit analytics: cost vs revenue comparison."""
    loop = asyncio.get_event_loop()
    since = datetime.utcnow() - timedelta(hours=hours)

    def _analytics():
        revenue = db.query(func.sum(Transaction.amount)).filter(Transaction.created_at >= since).scalar() or 0
        provider_cost = db.query(func.sum(UsageLog.cost_usd)).filter(UsageLog.created_at >= since).scalar() or 0
        total_tokens = db.query(func.sum(UsageLog.tokens_used)).filter(UsageLog.created_at >= since).scalar() or 0
        cached_requests = db.query(UsageLog).filter(UsageLog.created_at >= since, UsageLog.was_cached == True).count()
        total_requests = db.query(UsageLog).filter(UsageLog.created_at >= since).count()
        tokens_saved = db.query(func.sum(UsageLog.tokens_used)).filter(
            UsageLog.created_at >= since, UsageLog.was_cached == True
        ).scalar() or 0
        model_stats = db.query(
            UsageLog.model,
            func.count(UsageLog.id).label("requests"),
            func.sum(UsageLog.tokens_used).label("tokens"),
            func.sum(UsageLog.cost_usd).label("cost")
        ).filter(UsageLog.created_at >= since).group_by(UsageLog.model).all()
        plan_stats = db.query(
            Plan.name,
            func.count(Rental.id).label("rentals_sold"),
            func.sum(Transaction.amount).label("revenue")
        ).join(Rental, Rental.plan_id == Plan.id).outerjoin(
            Transaction, Transaction.rental_id == Rental.id
        ).filter(Rental.created_at >= since).group_by(Plan.name).all()
        return revenue, provider_cost, total_tokens, cached_requests, total_requests, tokens_saved, model_stats, plan_stats

    revenue, provider_cost, total_tokens, cached_requests, total_requests, tokens_saved, model_stats, plan_stats = \
        await loop.run_in_executor(None, _analytics)

    profit = float(revenue) - float(provider_cost)
    margin = (profit / float(revenue) * 100) if revenue > 0 else 0

    return {
        "period_hours": hours,
        "revenue_usd": float(revenue),
        "provider_cost_usd": float(provider_cost),
        "profit_usd": profit,
        "profit_margin_pct": round(margin, 2),
        "total_tokens_used": int(total_tokens),
        "total_requests": total_requests,
        "cached_requests": cached_requests,
        "cache_hit_rate": round(cached_requests / total_requests * 100, 2) if total_requests > 0 else 0,
        "tokens_saved_by_cache": int(tokens_saved),
        "per_model": [
            {
                "model": row.model,
                "requests": row.requests,
                "tokens": int(row.tokens or 0),
                "cost_usd": float(row.cost or 0)
            }
            for row in model_stats
        ],
        "per_plan": [
            {
                "plan_name": row.name,
                "rentals_sold": row.rentals_sold,
                "revenue_usd": float(row.revenue or 0)
            }
            for row in plan_stats
        ]
    }


# ==================== Spending Alerts ====================

@router.get("/spending-alerts", summary="Spending alerts", description="Returns the 50 most recent spending alerts triggered by the anomaly detection worker. Admin only.")
async def get_spending_alerts(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get recent spending alerts."""
    loop = asyncio.get_event_loop()
    alerts = await loop.run_in_executor(
        None,
        lambda: db.query(SpendingAlert).options(joinedload(SpendingAlert.user)).order_by(
            SpendingAlert.created_at.desc()
        ).limit(50).all()
    )

    return {
        "total": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "user_email": a.user.email if a.user else "Unknown",
                "amount_usd": a.amount_usd,
                "window_minutes": a.window_minutes,
                "was_suspended": a.was_suspended,
                "created_at": a.created_at.isoformat()
            }
            for a in alerts
        ]
    }


# ==================== Capacity Management ====================

@router.get("/capacity", summary="Capacity dashboard", description="Returns current token and RPM capacity utilization across all providers. Admin only.")
async def get_capacity_dashboard(
    admin: User = Depends(get_current_admin),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Get capacity utilization dashboard."""
    from backend.services.capacity_manager import CapacityManager
    capacity_mgr = CapacityManager(redis_manager)
    return await capacity_mgr.get_capacity_dashboard()


@router.post("/capacity")
async def set_capacity_config(
    config: CapacityConfig,
    admin: User = Depends(get_current_admin),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Set capacity limits for a provider."""
    from backend.services.capacity_manager import CapacityManager
    capacity_mgr = CapacityManager(redis_manager)
    await capacity_mgr.set_capacity(
        provider=config.provider,
        monthly_budget_usd=config.monthly_budget_usd,
        max_rpm=config.max_rpm,
        max_tokens=config.max_tpm,
    )
    return {"message": f"Capacity configured for {config.provider}", "config": config.model_dump()}


# ==================== Refund ====================

class RefundRequest(BaseModel):
    reason: str = "Admin initiated refund"

@router.post("/refund/{transaction_id}")
async def refund_transaction(
    transaction_id: int,
    refund_req: RefundRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Issue a refund for a transaction. Suspends the rental if still active."""
    loop = asyncio.get_event_loop()

    def _fetch_txn_rental():
        txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if not txn:
            return None, None
        rental = db.query(Rental).filter(
            Rental.user_id == txn.user_id,
            Rental.plan_id != None
        ).order_by(Rental.created_at.desc()).first()
        return txn, rental

    transaction, rental = await loop.run_in_executor(None, _fetch_txn_rental)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Attempt Cashfree refund if order ID exists
    cashfree_refund_id = None
    if transaction.cashfree_order_id and not transaction.cashfree_order_id.startswith("refund_"):
        try:
            import httpx
            from backend.config import settings
            async with httpx.AsyncClient(timeout=10.0) as client:
                refund_payload = {
                    "refund_amount": float(transaction.amount),
                    "refund_id": f"ref_{transaction_id}_{int(time.time())}",
                    "refund_note": refund_req.reason,
                }
                resp = await client.post(
                    f"{'https://api.cashfree.com/pg' if settings.CASHFREE_ENVIRONMENT == 'production' else 'https://sandbox.cashfree.com/pg'}/orders/{transaction.cashfree_order_id}/refunds",
                    headers={
                        "x-client-id": settings.CASHFREE_CLIENT_ID,
                        "x-client-secret": settings.CASHFREE_CLIENT_SECRET,
                        "x-api-version": "2023-08-01",
                        "Content-Type": "application/json",
                    },
                    json=refund_payload,
                )
                if resp.status_code in (200, 201):
                    cashfree_refund_id = resp.json().get("refund_id")
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Cashfree refund API call failed: {e}")

    # Suspend the rental if active
    if rental and rental.status == RentalStatus.ACTIVE:
        rental.status = RentalStatus.SUSPENDED
        await redis_manager.delete_virtual_key(rental.virtual_key)

        # Release capacity
        plan = await loop.run_in_executor(
            None, lambda: db.query(Plan).filter(Plan.id == rental.plan_id).first()
        )
        if plan:
            from backend.services.capacity_manager import CapacityManager
            capacity_mgr = CapacityManager(redis_manager)
            await capacity_mgr.release_capacity(plan.token_cap, plan.rpm_limit)

    # Record refund transaction
    def _commit_refund():
        refund_txn = Transaction(
            user_id=transaction.user_id,
            amount=-transaction.amount,
            description=f"Refund: {refund_req.reason}",
            cashfree_order_id=cashfree_refund_id or f"refund_{transaction_id}"
        )
        db.add(refund_txn)
        db.commit()

    await loop.run_in_executor(None, _commit_refund)

    return {
        "message": "Refund processed",
        "original_transaction_id": transaction_id,
        "refund_amount": transaction.amount,
        "rental_suspended": rental.id if rental and rental.status == RentalStatus.SUSPENDED else None,
        "cashfree_refund_id": cashfree_refund_id,
    }


# ==================== User Impersonation ====================

@router.get("/impersonate/{user_id}", summary="Impersonate user", description="View the platform as a specific user — returns their rentals, transactions, and usage summary. Read-only. Admin only.")
async def impersonate_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """View platform as a specific user — returns their rentals, transactions, usage."""
    loop = asyncio.get_event_loop()

    def _fetch():
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, None, None
        rentals = db.query(Rental).options(joinedload(Rental.plan)).filter(Rental.user_id == user_id).all()
        transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
        return user, rentals, transactions

    user, rentals, transactions = await loop.run_in_executor(None, _fetch)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat()
        },
        "rentals": [
            {
                "id": r.id,
                "plan_name": r.plan.name if r.plan else "Unknown",
                "status": r.status.value,
                "virtual_key": r.virtual_key[:12] + "...",
                "tokens_used": r.tokens_used,
                "tokens_remaining": r.tokens_remaining,
                "requests_made": r.requests_made,
                "started_at": r.started_at.isoformat(),
                "expires_at": r.expires_at.isoformat()
            }
            for r in rentals
        ],
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "description": t.description,
                "created_at": t.created_at.isoformat()
            }
            for t in transactions
        ],
        "summary": {
            "total_rentals": len(rentals),
            "active_rentals": sum(1 for r in rentals if r.status == RentalStatus.ACTIVE),
            "total_spent": sum(t.amount for t in transactions if t.amount > 0),
            "total_tokens_used": sum(r.tokens_used for r in rentals)
        }
    }


# ==================== CSV Export ====================

@router.get("/export/csv", summary="Export analytics CSV", description="Downloads usage log data as a CSV file for the given time window (default 24h). Admin only.")
async def export_analytics_csv(
    hours: int = 24,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Export analytics data as CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    since = datetime.utcnow() - timedelta(hours=hours)

    loop = asyncio.get_event_loop()
    logs = await loop.run_in_executor(
        None,
        lambda: db.query(UsageLog).filter(UsageLog.created_at >= since).order_by(UsageLog.created_at.desc()).limit(10000).all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Rental ID", "Model", "Tokens Used", "Credits Consumed",
                      "Cost USD", "Was Cached", "Created At"])

    for log in logs:
        writer.writerow([
            log.id, log.rental_id, log.model, log.tokens_used,
            log.credits_consumed, f"{log.cost_usd:.4f}", log.was_cached,
            log.created_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analytics_{hours}h.csv"}
    )


# ==================== Dynamic Plan Availability ====================

@router.get("/plans/availability")
async def get_plan_availability(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Show plans with real-time capacity availability. Suggests reduced plans when capacity is low."""
    from backend.services.capacity_manager import CapacityManager
    capacity_mgr = CapacityManager(redis_manager)

    plans = db.query(Plan).filter(Plan.is_active == True).all()
    result = []

    for plan in plans:
        check = await capacity_mgr.can_sell_plan(
            token_cap=plan.token_cap,
            rpm_limit=plan.rpm_limit,
            estimated_cost=plan.price * 0.4
        )

        entry = {
            "plan_id": plan.id,
            "plan_name": plan.name,
            "price": plan.price,
            "token_cap": plan.token_cap,
            "rpm_limit": plan.rpm_limit,
            "available": check["allowed"],
        }

        if not check["allowed"]:
            avail = check.get("available", {})
            avail_tokens = avail.get("available_tokens", 0)
            avail_rpm = avail.get("available_rpm", 0)

            # Suggest a reduced plan
            if avail_tokens > 0 and avail_rpm > 0:
                entry["suggested_token_cap"] = min(plan.token_cap, max(avail_tokens, 1000))
                entry["suggested_rpm_limit"] = min(plan.rpm_limit, max(avail_rpm, 5))
                entry["suggested_price"] = round(plan.price * (entry["suggested_token_cap"] / plan.token_cap), 2)
                entry["suggestion"] = "Reduced plan available"
            else:
                entry["suggestion"] = "Fully sold out"
        else:
            entry["suggestion"] = "Full capacity available"

        result.append(entry)

    return {"plans": result}
