"""Cashfree payment integration endpoints."""
import hmac
import hashlib
import base64
import logging
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import Plan, Transaction, User
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.api.dependencies import get_current_user
from backend.services.virtual_key_service import create_rental
from backend.services.capacity_manager import CapacityManager
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

CASHFREE_API_VERSION = "2023-08-01"


def _cashfree_base_url() -> str:
    if settings.CASHFREE_ENVIRONMENT == "production":
        return "https://api.cashfree.com/pg"
    return "https://sandbox.cashfree.com/pg"


def _cashfree_headers() -> dict:
    return {
        "x-client-id": settings.CASHFREE_CLIENT_ID,
        "x-client-secret": settings.CASHFREE_CLIENT_SECRET,
        "x-api-version": CASHFREE_API_VERSION,
        "Content-Type": "application/json",
    }


def _verify_cashfree_webhook(payload: bytes, timestamp: str, signature: str) -> bool:
    """Verify Cashfree webhook HMAC-SHA256 signature."""
    secret = settings.CASHFREE_CLIENT_SECRET or settings.CASHFREE_WEBHOOK_SECRET
    if not secret:
        logger.warning("No Cashfree secret configured — skipping webhook verification")
        return True

    message = timestamp + payload.decode("utf-8")
    expected = base64.b64encode(
        hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)


def _make_order_id(plan_id: int, user_id: int, provider: str = "openai") -> str:
    """Encode plan_id, user_id and provider into order_id for webhook retrieval."""
    ts = int(time.time())
    return f"order_{plan_id}_{user_id}_{provider}_{ts}"


def _parse_order_id(order_id: str) -> tuple:
    """Parse plan_id, user_id, and provider from order_id.
    Supports both old format (order_pid_uid_ts) and new format (order_pid_uid_provider_ts).
    """
    parts = order_id.split("_")
    plan_id = int(parts[1])
    user_id = int(parts[2])
    # New format has provider at index 3, old format has timestamp at index 3
    if len(parts) >= 5:
        provider = parts[3]
    else:
        provider = "openai"  # legacy fallback
    return plan_id, user_id, provider


class CheckoutRequest(BaseModel):
    plan_id: int
    provider: str = "openai"            # Which provider the user selected
    customer_phone: str = "9999999999"  # Required by Cashfree; user can update in profile


class CheckoutResponse(BaseModel):
    payment_session_id: str
    order_id: str
    cf_order_id: str


@router.post("/checkout/session", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Create a Cashfree payment order and return payment_session_id for checkout."""
    plan = db.query(Plan).filter(Plan.id == request.plan_id, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Capacity check before accepting payment
    capacity_mgr = CapacityManager(redis_manager)
    capacity_check = await capacity_mgr.can_sell_plan(
        token_cap=plan.token_cap,
        rpm_limit=plan.rpm_limit,
        estimated_cost=plan.price * 0.4
    )
    if not capacity_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"This plan is temporarily sold out. {capacity_check['reason']}"
        )

    order_id = _make_order_id(plan.id, current_user.id, request.provider)
    frontend_base = settings.FRONTEND_URL
    backend_base = settings.BACKEND_URL

    payload = {
        "order_id": order_id,
        "order_amount": round(float(plan.price), 2),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": f"user_{current_user.id}",
            "customer_phone": request.customer_phone,
            "customer_email": current_user.email,
        },
        "order_meta": {
            "return_url": f"{frontend_base}/dashboard?order_id={{order_id}}&payment=success",
            "notify_url": f"{backend_base}/api/webhooks/cashfree",
        },
        "order_note": f"AI API Rental - {plan.name}",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{_cashfree_base_url()}/orders",
                headers=_cashfree_headers(),
                json=payload,
            )

        if resp.status_code not in (200, 201):
            logger.error(f"Cashfree order creation failed: {resp.status_code} {resp.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment service error: {resp.text}"
            )

        data = resp.json()
        return CheckoutResponse(
            payment_session_id=data["payment_session_id"],
            order_id=data["order_id"],
            cf_order_id=data["cf_order_id"],
        )

    except httpx.RequestError as e:
        logger.error(f"Cashfree request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment service unavailable"
        )


@router.post("/webhooks/cashfree")
async def cashfree_webhook(
    request: Request,
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Handle Cashfree webhook events. Creates rental AFTER payment is confirmed."""
    payload = await request.body()
    timestamp = request.headers.get("x-webhook-timestamp", "")
    signature = request.headers.get("x-webhook-signature", "")

    # Verify webhook signature
    if timestamp and signature:
        if not _verify_cashfree_webhook(payload, timestamp, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = request.app.state  # unused, parse from payload
        import json
        data = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = data.get("type", "")
    logger.info(f"Cashfree webhook received: {event_type}")

    if event_type != "PAYMENT_SUCCESS_WEBHOOK":
        return {"status": "ignored", "type": event_type}

    order_data = data.get("data", {}).get("order", {})
    payment_data = data.get("data", {}).get("payment", {})

    order_id = order_data.get("order_id", "")
    cf_payment_id = str(payment_data.get("cf_payment_id", ""))
    payment_status = payment_data.get("payment_status", "")

    if payment_status != "SUCCESS":
        logger.info(f"Non-success payment status: {payment_status}")
        return {"status": "ignored", "payment_status": payment_status}

    # Parse plan_id, user_id, and provider from order_id
    try:
        plan_id, user_id, provider = _parse_order_id(order_id)
    except (IndexError, ValueError) as e:
        logger.error(f"Failed to parse order_id '{order_id}': {e}")
        return {"status": "error", "message": "Malformed order_id"}

    # Idempotency: skip if already processed
    existing = db.query(Transaction).filter(
        Transaction.cashfree_order_id == order_id
    ).first()
    if existing:
        logger.info(f"Duplicate webhook for order {order_id}, skipping")
        return {"status": "already_processed"}

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        logger.error(f"Plan {plan_id} not found for webhook order {order_id}")
        return {"status": "error", "message": "Plan not found"}

    # Create transaction record
    transaction = Transaction(
        user_id=user_id,
        amount=plan.price,
        description=f"Cashfree payment: {plan.name}",
        cashfree_order_id=order_id,
    )
    db.add(transaction)
    db.commit()

    # Create rental
    try:
        rental = await create_rental(user_id, plan_id, db, redis_manager, provider=provider)

        capacity_mgr = CapacityManager(redis_manager)
        await capacity_mgr.reserve_capacity(plan.token_cap, plan.rpm_limit)

        # Send activation email (non-blocking, best-effort)
        try:
            from backend.services.email_service import email_service
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                email_service.send_rental_activated(
                    email=user.email,
                    plan_name=plan.name,
                    virtual_key=rental.virtual_key,
                    expires_at=rental.expires_at.strftime("%Y-%m-%d %H:%M UTC"),
                    token_cap=plan.token_cap,
                )
        except Exception as email_err:
            logger.warning(f"Activation email failed (non-critical): {email_err}")

        logger.info(
            f"✅ Rental created via Cashfree webhook: user={user_id}, "
            f"plan={plan.name}, rental_id={rental.id}"
        )
        return {"status": "success", "rental_id": rental.id}

    except Exception as e:
        logger.error(f"Failed to create rental from webhook: {e}")
        return {"status": "error", "message": str(e)}


# ==================== ORDER STATUS VERIFICATION ====================

@router.get("/checkout/verify/{order_id}")
async def verify_order_status(
    order_id: str,
    current_user: User = Depends(get_current_user),
):
    """Verify Cashfree order payment status (called after redirect)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{_cashfree_base_url()}/orders/{order_id}",
                headers=_cashfree_headers(),
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Could not verify order status")

        data = resp.json()
        return {
            "order_id": order_id,
            "order_status": data.get("order_status"),
            "order_amount": data.get("order_amount"),
        }

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Payment service unavailable")


# ==================== INVOICE / RECEIPT GENERATION ====================

class InvoiceResponse(BaseModel):
    invoice_number: str
    date: str
    customer_email: str
    plan_name: str
    plan_description: str
    amount_inr: float
    tokens_included: int
    duration_minutes: int
    rental_id: int
    virtual_key_prefix: str
    status: str


@router.get("/invoice/{rental_id}", response_model=InvoiceResponse)
async def get_invoice(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a JSON invoice/receipt for a rental purchase."""
    from backend.database.models import Rental
    rental = db.query(Rental).filter(
        Rental.id == rental_id,
        Rental.user_id == current_user.id
    ).first()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    plan = db.query(Plan).filter(Plan.id == rental.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    invoice_number = f"INV-{rental.id:06d}"

    return InvoiceResponse(
        invoice_number=invoice_number,
        date=rental.started_at.isoformat(),
        customer_email=current_user.email,
        plan_name=plan.name,
        plan_description=plan.description or f"{plan.duration_minutes} min, {plan.token_cap} tokens",
        amount_inr=plan.price,
        tokens_included=plan.token_cap,
        duration_minutes=plan.duration_minutes,
        rental_id=rental.id,
        virtual_key_prefix=rental.virtual_key[:10] + "...",
        status=rental.status.value
    )


@router.get("/invoice/{rental_id}/html")
async def get_invoice_html(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate an HTML receipt for printing/download."""
    from backend.database.models import Rental
    from fastapi.responses import HTMLResponse

    rental = db.query(Rental).filter(
        Rental.id == rental_id,
        Rental.user_id == current_user.id
    ).first()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    plan = db.query(Plan).filter(Plan.id == rental.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    invoice_number = f"INV-{rental.id:06d}"
    date_str = rental.started_at.strftime("%B %d, %Y at %H:%M UTC")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice {invoice_number}</title>
        <style>
            body {{ font-family: 'Segoe UI', system-ui, sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a2e; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; }}
            .logo {{ font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #7c3aed, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
            .invoice-num {{ font-size: 14px; color: #666; }}
            .section {{ margin: 24px 0; }}
            .section h3 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; margin-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }}
            th {{ background: #f8f7ff; color: #555; font-weight: 600; font-size: 13px; }}
            .total-row td {{ font-weight: 700; font-size: 18px; border-top: 2px solid #7c3aed; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }}
            @media print {{ body {{ margin: 0; }} }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">AI API Rental</div>
            <div>
                <div class="invoice-num">{invoice_number}</div>
                <div style="font-size: 13px; color: #666;">{date_str}</div>
            </div>
        </div>

        <div class="section">
            <h3>Bill To</h3>
            <p>{current_user.email}</p>
        </div>

        <div class="section">
            <h3>Details</h3>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Tokens</th>
                        <th>Duration</th>
                        <th style="text-align:right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{plan.name}</td>
                        <td>{plan.token_cap:,}</td>
                        <td>{plan.duration_minutes} min</td>
                        <td style="text-align:right">${plan.price:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="3">Total</td>
                        <td style="text-align:right">${plan.price:.2f} INR</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h3>Rental Information</h3>
            <table>
                <tr><td><strong>Rental ID</strong></td><td>{rental.id}</td></tr>
                <tr><td><strong>Virtual Key</strong></td><td style="font-family:monospace">{rental.virtual_key[:10]}...</td></tr>
                <tr><td><strong>Status</strong></td><td>{rental.status.value.upper()}</td></tr>
                <tr><td><strong>Started</strong></td><td>{rental.started_at.strftime("%Y-%m-%d %H:%M UTC")}</td></tr>
                <tr><td><strong>Expires</strong></td><td>{rental.expires_at.strftime("%Y-%m-%d %H:%M UTC")}</td></tr>
            </table>
        </div>

        <div class="footer">
            <p>AI API Rental SaaS &mdash; Thank you for your purchase!</p>
            <p>This is an automatically generated receipt. No signature required.</p>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html)
