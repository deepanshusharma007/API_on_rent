"""Cashfree payment integration endpoints."""
import asyncio
import hmac
import hashlib
import base64
import logging
import secrets
import time
import html as html_lib
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from redis.exceptions import WatchError
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import Plan, Rental, Transaction, User
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.api.dependencies import get_current_user
from backend.services.virtual_key_service import create_rental
from backend.services.capacity_manager import CapacityManager
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

CASHFREE_API_VERSION = "2023-08-01"
WEBHOOK_LOCK_SECONDS = 120  # upper bound for processing one webhook delivery
CHECKOUT_LOCK_SECONDS = 60  # blocks a double-click, not a retry after a cancelled payment
ORDER_AMOUNT_TTL_SECONDS = 3 * 86400
PROVIDERS = ("openai", "anthropic", "gemini")


def _order_amount_key(order_id: str) -> str:
    return f"order_amount:{order_id}"


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
    """Verify Cashfree webhook HMAC-SHA256 signature. Fails closed without a secret."""
    secret = settings.CASHFREE_WEBHOOK_SECRET or settings.CASHFREE_CLIENT_SECRET
    if not secret:
        logger.error("No Cashfree webhook secret configured (CASHFREE_WEBHOOK_SECRET) — rejecting webhook")
        return False

    # Cashfree signs: timestamp + rawBody. Computed over the raw bytes, so a body that is
    # not valid UTF-8 just fails verification instead of raising.
    message = timestamp.encode() + payload
    expected = base64.b64encode(
        hmac.new(secret.encode(), message, hashlib.sha256).digest()
    )

    # Cashfree may send comma-separated list of signatures (compared as bytes: constant
    # time, and safe for non-ASCII header values)
    received_sigs = [s.strip().encode() for s in signature.split(",")]
    return any(hmac.compare_digest(expected, sig) for sig in received_sigs)


async def _release_webhook_lock(redis_manager: RedisManager, lock_key: str, lock_token: str):
    """Release the per-order webhook lock only if this request still owns it.

    Atomic compare-and-delete (WATCH/MULTI): if the lock expires and another delivery takes
    it between our read and our delete, EXEC aborts instead of deleting their lock.
    """
    try:
        async with redis_manager.redis.pipeline(transaction=True) as pipe:
            await pipe.watch(lock_key)
            if await pipe.get(lock_key) == lock_token:
                pipe.multi()
                pipe.delete(lock_key)
                await pipe.execute()
    except WatchError:
        logger.info(f"Webhook lock {lock_key} changed owner before release; left in place")
    except Exception as e:
        logger.warning(f"Could not release webhook lock {lock_key} (it expires on its own): {e}")


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


@router.post("/checkout/session", response_model=CheckoutResponse, summary="Create payment session", description="Creates a Cashfree payment order. Returns `payment_session_id` which is used with the Cashfree JS SDK to open the payment modal. Body: `{plan_id, provider, customer_phone}`.")
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Create a Cashfree payment order and return payment_session_id for checkout."""
    # The provider is part of the order id the webhook parses (split on "_"), so only the
    # known names are accepted: anything else could corrupt it.
    if request.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provider must be one of: {', '.join(PROVIDERS)}")

    loop = asyncio.get_event_loop()
    plan = await loop.run_in_executor(
        None, lambda: db.query(Plan).filter(Plan.id == request.plan_id, Plan.is_active == True).first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Idempotency lock: stops a double-click from creating two orders for the same
    # user+plan+provider. Released again if this attempt fails, so the user can retry.
    lock_key = f"checkout_lock:{current_user.id}:{request.plan_id}:{request.provider}"
    lock_held = False
    try:
        lock_held = bool(await redis_manager.redis.set(lock_key, "1", nx=True, ex=CHECKOUT_LOCK_SECONDS))
        if not lock_held:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="A payment for this plan is already being created. Please wait a moment and try again.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Redis lock unavailable, proceeding without idempotency guard: {e}")

    async def _release_lock():
        if lock_held:
            try:
                await redis_manager.redis.delete(lock_key)
            except Exception:
                pass  # it expires on its own

    # Capacity check before accepting payment
    try:
        capacity_mgr = CapacityManager(redis_manager)
        capacity_check = await capacity_mgr.can_sell_plan(
            token_cap=plan.token_cap,
            rpm_limit=plan.rpm_limit,
            estimated_cost=plan.price * 0.4
        )
        if not capacity_check["allowed"]:
            await _release_lock()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"This plan is temporarily sold out. {capacity_check['reason']}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Capacity check failed, proceeding: {e}")

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
            await _release_lock()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The payment service could not create the order. Please try again."
            )

        data = resp.json()
        if "payment_session_id" not in data:
            logger.error(f"Cashfree response missing payment_session_id: {data}")
            await _release_lock()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The payment service returned an unexpected response. Please try again."
            )
        # Remember what this order should cost, so the webhook can verify the paid amount
        # even if the plan's price changes while the customer is paying.
        try:
            await redis_manager.redis.set(
                _order_amount_key(order_id), str(round(float(plan.price), 2)), ex=ORDER_AMOUNT_TTL_SECONDS)
        except Exception as e:
            logger.warning(f"Could not store expected amount for order {order_id}: {e}")
        return CheckoutResponse(
            payment_session_id=data["payment_session_id"],
            order_id=data.get("order_id", order_id),
            cf_order_id=data.get("cf_order_id", ""),
        )

    except HTTPException:
        raise
    except httpx.RequestError as e:
        logger.error(f"Cashfree request error: {e}")
        await _release_lock()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment service unavailable"
        )
    except Exception as e:
        logger.error(f"Unexpected checkout error: {e}", exc_info=True)
        await _release_lock()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkout failed. Please try again."
        )


@router.post("/webhooks/cashfree", include_in_schema=False, summary="Cashfree webhook", description="Internal webhook called by Cashfree after payment. Creates the rental and sends the virtual key by email. Do not call this directly.")
async def cashfree_webhook(
    request: Request,
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """Handle Cashfree webhook events. Creates rental AFTER payment is confirmed."""
    payload = await request.body()
    timestamp = request.headers.get("x-webhook-timestamp", "")
    signature = request.headers.get("x-webhook-signature", "")

    # Authenticate before any side effect. Fail closed: both headers are required and the
    # signature must verify. Signature values are never logged.
    if not timestamp or not signature:
        logger.warning(
            f"Webhook rejected: missing signature headers "
            f"(timestamp present={bool(timestamp)}, signature present={bool(signature)})"
        )
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    if not _verify_cashfree_webhook(payload, timestamp, signature):
        logger.warning("Webhook rejected: signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        import json
        data = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = data.get("type", "")
    logger.info(f"Cashfree webhook received: {event_type}")

    if event_type != "PAYMENT_SUCCESS_WEBHOOK":
        return {"status": "ignored", "type": event_type}

    order_data = data.get("data", {}).get("order", {})
    payment_data = data.get("data", {}).get("payment", {})

    order_id = order_data.get("order_id", "")
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

    loop = asyncio.get_event_loop()

    # Only one delivery of an order is processed at a time: an atomic, owned, expiring
    # Redis lock. A concurrent duplicate gets a retryable 409 and is re-checked later.
    lock_key = f"webhook_lock:{order_id}"
    lock_token = secrets.token_hex(16)
    try:
        acquired = await redis_manager.redis.set(lock_key, lock_token, nx=True, ex=WEBHOOK_LOCK_SECONDS)
    except Exception as e:
        logger.error(f"Webhook lock unavailable for order {order_id}: {e}")
        raise HTTPException(status_code=503, detail="Temporarily unavailable, please retry")
    if not acquired:
        logger.info(f"Webhook for order {order_id} is already being processed")
        raise HTTPException(status_code=409, detail="Order is already being processed")

    try:
        # Idempotency check + plan fetch in one thread
        def _check_and_fetch():
            existing = db.query(Transaction).filter(Transaction.cashfree_order_id == order_id).first()
            if existing:
                return "duplicate", None
            plan = db.query(Plan).filter(Plan.id == plan_id).first()
            return "ok", plan

        check_result, plan = await loop.run_in_executor(None, _check_and_fetch)
        if check_result == "duplicate":
            logger.info(f"Duplicate webhook for order {order_id}, skipping")
            return {"status": "already_processed"}
        if not plan:
            logger.error(f"Plan {plan_id} not found for paid order {order_id}")
            raise HTTPException(status_code=500, detail="Payment processing failed, will retry")

        # The signature proves the webhook is Cashfree's, not that the customer paid the right
        # amount. Check what was paid against what this order was created for.
        paid_amount = order_data.get("order_amount")
        currency = order_data.get("order_currency", "INR")
        if paid_amount is not None:
            try:
                stored = await redis_manager.redis.get(_order_amount_key(order_id))
                expected = float(stored) if stored else round(float(plan.price), 2)
                if currency != "INR" or abs(float(paid_amount) - expected) > 0.01:
                    # Retrying can't fix a wrong amount, so acknowledge it (200) and flag it loudly
                    logger.critical(
                        f"Payment amount mismatch for order {order_id}: paid {paid_amount} {currency}, "
                        f"expected {expected} INR. No rental created; review in Cashfree."
                    )
                    return {"status": "rejected", "message": "Amount mismatch"}
            except (TypeError, ValueError):
                logger.critical(f"Unreadable amount in webhook for order {order_id}: {paid_amount!r}")
                return {"status": "rejected", "message": "Invalid amount"}

        # Activate first; the payment is recorded only once the rental exists, so a failed
        # activation is never mistaken for a completed order when Cashfree redelivers.
        try:
            # Webhook sends its own (human-readable) activation email below,
            # so skip the one create_rental would send — exactly one email per purchase.
            rental = await create_rental(
                user_id, plan_id, db, redis_manager, provider=provider, send_activation_email=False
            )
        except Exception as e:
            logger.error(f"Rental activation failed for paid order {order_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Payment processing failed, will retry")

        # Captured while loaded: a failed commit/rollback expires ORM attributes, and reloading
        # them would need the database that just failed.
        rental_id, virtual_key = rental.id, rental.virtual_key

        def _record_transaction():
            transaction = Transaction(
                user_id=user_id,
                rental_id=rental_id,
                amount=float(paid_amount) if paid_amount is not None else plan.price,
                description=f"Cashfree payment: {plan.name}",
                cashfree_order_id=order_id,
            )
            db.add(transaction)
            db.commit()

        try:
            await loop.run_in_executor(None, _record_transaction)
        except Exception as e:
            # Without a payment record a redelivery would activate again, so withdraw this
            # rental (key first, so it is unusable even if the DB is unavailable).
            logger.error(f"Could not record payment for order {order_id}: {e}", exc_info=True)
            await _withdraw_rental(db, redis_manager, rental, rental_id, virtual_key)
            raise HTTPException(status_code=500, detail="Payment processing failed, will retry")

        try:
            capacity_mgr = CapacityManager(redis_manager)
            await capacity_mgr.reserve_capacity(plan.token_cap, plan.rpm_limit)
        except Exception as e:
            logger.error(f"Capacity reservation failed for order {order_id} (rental is active): {e}")

        # Send activation email (non-blocking, best-effort): runs in a worker
        # thread and is not awaited, so the webhook responds immediately.
        try:
            from backend.services.email_service import email_service
            user = await loop.run_in_executor(
                None, lambda: db.query(User).filter(User.id == user_id).first()
            )
            if user:
                # Capture plain values so the worker thread never touches the DB session
                user_email = user.email
                plan_name, token_cap = plan.name, plan.token_cap
                virtual_key = rental.virtual_key
                expires_str = rental.expires_at.strftime("%Y-%m-%d %H:%M UTC")
                loop.run_in_executor(
                    None,
                    lambda: email_service.send_rental_activated(
                        email=user_email,
                        plan_name=plan_name,
                        virtual_key=virtual_key,
                        expires_at=expires_str,
                        token_cap=token_cap,
                    )
                )
        except Exception as email_err:
            logger.warning(f"Activation email failed (non-critical): {email_err}")

        logger.info(
            f"✅ Rental created via Cashfree webhook: user={user_id}, "
            f"plan={plan.name}, rental_id={rental.id}"
        )
        return {"status": "success", "rental_id": rental.id}

    finally:
        await _release_webhook_lock(redis_manager, lock_key, lock_token)


async def _withdraw_rental(db: Session, redis_manager: RedisManager, rental, rental_id: int, virtual_key: str):
    """Best-effort undo of a rental whose payment could not be recorded.

    Never raises, so the caller still reports the original payment error. Logs use only the
    captured rental_id (no ORM access after rollback, and never the key itself).
    """
    try:
        await redis_manager.delete_virtual_key(virtual_key)
    except Exception as e:
        logger.error(f"Could not revoke key for rental {rental_id}: {type(e).__name__}")
    try:
        await redis_manager.redis.delete(f"balance:{rental_id}")
    except Exception as e:
        logger.error(f"Could not remove token balance for rental {rental_id}: {type(e).__name__}")
    try:
        db.rollback()
        db.delete(rental)
        db.commit()
    except Exception as e:
        logger.error(f"Could not remove rental {rental_id} (key already revoked): {type(e).__name__}")


# ==================== ORDER STATUS VERIFICATION ====================

@router.get("/checkout/verify/{order_id}", summary="Verify order status", description="Verify Cashfree order payment status. Call this after the user is redirected back from Cashfree to confirm payment success before showing a confirmation screen.")
async def verify_order_status(
    order_id: str,
    current_user: User = Depends(get_current_user),
):
    """Verify Cashfree order payment status (called after redirect). Only your own orders."""
    try:
        _plan_id, order_user_id, _provider = _parse_order_id(order_id)
    except (IndexError, ValueError):
        raise HTTPException(status_code=404, detail="Order not found")
    if order_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Order not found")   # same answer as a missing order

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

    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Payment service unavailable")


# ==================== INVOICE / RECEIPT GENERATION ====================

def _paid_amount(db: Session, rental: Rental, plan: Plan) -> float:
    """What the customer actually paid for this rental (the plan's price may have changed
    since); falls back to the plan's price for rentals without a payment record."""
    txn = db.query(Transaction).filter(
        Transaction.rental_id == rental.id, Transaction.amount > 0
    ).order_by(Transaction.id).first()
    return float(txn.amount) if txn else float(plan.price)


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


@router.get("/invoice/{rental_id}", response_model=InvoiceResponse, summary="Get invoice", description="Returns invoice data for a completed rental. Includes plan name, amount paid, token cap, and duration.")
async def get_invoice(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a JSON invoice/receipt for a rental purchase."""
    from backend.database.models import Rental
    loop = asyncio.get_event_loop()

    def _fetch_rental_plan():
        rental = db.query(Rental).filter(
            Rental.id == rental_id,
            Rental.user_id == current_user.id
        ).first()
        if not rental:
            return None, None, None
        plan = db.query(Plan).filter(Plan.id == rental.plan_id).first()
        return rental, plan, _paid_amount(db, rental, plan)

    rental, plan, paid = await loop.run_in_executor(None, _fetch_rental_plan)
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    invoice_number = f"INV-{rental.id:06d}"

    return InvoiceResponse(
        invoice_number=invoice_number,
        date=rental.started_at.isoformat(),
        customer_email=current_user.email,
        plan_name=plan.name,
        plan_description=plan.description or f"{plan.duration_minutes} min, {plan.token_cap} tokens",
        amount_inr=paid,
        tokens_included=plan.token_cap,
        duration_minutes=plan.duration_minutes,
        rental_id=rental.id,
        virtual_key_prefix=rental.virtual_key[:10] + "...",
        status=rental.status.value
    )


@router.get("/invoice/{rental_id}/html", summary="Get HTML invoice", description="Returns a printable HTML receipt for a rental purchase. Suitable for download or printing.")
async def get_invoice_html(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate an HTML receipt for printing/download."""
    from backend.database.models import Rental
    from fastapi.responses import HTMLResponse

    loop = asyncio.get_event_loop()

    def _fetch_html_data():
        rental = db.query(Rental).filter(
            Rental.id == rental_id,
            Rental.user_id == current_user.id
        ).first()
        if not rental:
            return None, None, None
        plan = db.query(Plan).filter(Plan.id == rental.plan_id).first()
        return rental, plan, _paid_amount(db, rental, plan)

    rental, plan, paid = await loop.run_in_executor(None, _fetch_html_data)
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
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
            <p>{html_lib.escape(current_user.email)}</p>
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
                        <td>{html_lib.escape(plan.name)}</td>
                        <td>{plan.token_cap:,}</td>
                        <td>{plan.duration_minutes} min</td>
                        <td style="text-align:right">&#8377;{paid:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="3">Total</td>
                        <td style="text-align:right">&#8377;{paid:.2f} INR</td>
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
