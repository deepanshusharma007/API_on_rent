"""OpenAI-compatible gateway proxy — router, middleware pipeline, fallbacks, cache."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import litellm
import json
import asyncio
import logging
from datetime import datetime

from backend.database.connection import get_db
from backend.database.models import Rental, UsageLog, RentalStatus
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.services.circuit_breaker import CircuitBreakerService
from backend.services.router import GatewayRouter, infer_provider, get_all_models
from backend.services.cache import GatewayCache
from backend.services.drain_rate import get_drain_rate
from backend.middleware.guardrails.base import RequestContext, ResponseContext, BlockedResponse
from backend.middleware.guardrails.pipeline import run_input_pipeline, run_output_pipeline
from backend.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_virtual_key(
    request: Request,
    redis_manager: RedisManager = Depends(get_redis_manager),
    db: Session = Depends(get_db),
) -> dict:
    """Verify virtual API key (rental vk_ or internal ik_) and return rental data."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    virtual_key = auth[7:]

    # Internal key path (ik_ prefix)
    if virtual_key.startswith("ik_"):
        from backend.database.models import InternalKey
        import json as _json
        key_row = db.query(InternalKey).filter(
            InternalKey.virtual_key == virtual_key,
            InternalKey.is_active == True,
        ).first()
        if not key_row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Internal key invalid or revoked")
        if key_row.expires_at and key_row.expires_at < __import__('datetime').datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Internal key expired")
        team = key_row.team
        if not team or not team.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Team is inactive")
        allowed_models = _json.loads(team.allowed_models or "[]")
        effective_token_budget = key_row.token_budget or team.token_budget
        effective_rpm = key_row.rpm_limit or team.rpm_limit
        return {
            "rental_id": f"ik_{key_row.id}",
            "user_id": key_row.user_id,
            "team_id": team.id,
            "allowed_models": allowed_models,  # [] = all
            "tokens_remaining": effective_token_budget - key_row.tokens_used if effective_token_budget else 999_999_999,
            "rpm_limit": effective_rpm,
            "key_type": "internal",
            "internal_key_id": key_row.id,
        }

    # Standard rental key path (vk_ prefix)
    rental_data = await redis_manager.get_virtual_key_data(virtual_key)
    if not rental_data:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Virtual key expired or invalid. Please purchase a new plan.",
        )
    return rental_data


@router.post(
    "/chat/completions",
    summary="Chat completions (OpenAI-compatible)",
    description="""
Send chat completion requests using your virtual key — works with any supported model.

**Authentication:**
```
Authorization: Bearer vk_your_key_here
```

**Drop-in replacement for OpenAI SDK:**
```python
from openai import OpenAI
client = OpenAI(
    api_key="vk_your_key",
    base_url="https://api-on-rent-backend.onrender.com/v1"
)
response = client.chat.completions.create(
    model="gpt-4o-mini",   # or claude-3-5-sonnet-20241022, gemini-1.5-flash, etc.
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Supported models:** `GET /v1/models`

**Gateway features applied automatically:**
- Smart routing to the best available provider key
- Automatic fallback if a provider is down
- Semantic cache (temperature=0 requests)
- PII detection & redaction
- Prompt injection protection
""",
)
async def chat_completions(
    request: Request,
    rental_data: dict = Depends(verify_virtual_key),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager),
):
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model") or settings.GATEWAY_DEFAULT_MODEL
    stream = body.get("stream", False)
    user_max_tokens = body.get("max_tokens", None)

    # Enforce team model allowlist for internal keys
    allowed_models = rental_data.get("allowed_models", [])
    if allowed_models and model not in allowed_models:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Model '{model}' is not allowed for your team. Allowed: {allowed_models}",
        )

    MAX_TOKENS_BY_MODEL = {
        "gpt-4o": 16384, "gpt-4o-mini": 16384,
        "claude-3-5-sonnet-20241022": 8192, "claude-3-opus-20240229": 4096,
        "gemini-1.5-pro": 8192, "gemini-1.5-flash": 8192, "gemini-2.0-flash": 8192,
    }
    max_tokens = min(user_max_tokens or 4096, MAX_TOKENS_BY_MODEL.get(model, 8192))

    rental_id = rental_data["rental_id"]
    user_id = rental_data["user_id"]
    rpm_limit = rental_data["rpm_limit"]
    tokens_remaining = rental_data.get("tokens_remaining", 0)
    drain_rate = get_drain_rate(model)

    # ── Rate limiting ────────────────────────────────────────────────────
    if not await redis_manager.check_rate_limit(rental_id, rpm_limit):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {rpm_limit} req/min",
            headers={"X-RateLimit-Limit": str(rpm_limit), "X-RateLimit-Remaining": "0", "Retry-After": "60"},
        )
    if not await redis_manager.check_rate_limit("global", settings.GATEWAY_GLOBAL_RPM):
        raise HTTPException(status_code=503, detail="Platform at capacity. Try again shortly.", headers={"Retry-After": "10"})

    # ── IP pinning ───────────────────────────────────────────────────────
    client_ip = request.client.host
    pinned_ip = await redis_manager.get_pinned_ip(rental_id)
    if pinned_ip and pinned_ip != client_ip:
        raise HTTPException(status_code=403, detail="IP address mismatch. This key is locked to another IP.")
    elif not pinned_ip:
        await redis_manager.set_pinned_ip(rental_id, client_ip)

    # ── Middleware: input pipeline ───────────────────────────────────────
    ctx = RequestContext(
        messages=messages,
        model=model,
        rental_id=rental_id,
        user_id=user_id,
        tokens_remaining=tokens_remaining,
        body=body,
    )
    result = await run_input_pipeline(ctx)
    if isinstance(result, BlockedResponse):
        raise HTTPException(status_code=result.status_code, detail=result.detail)
    ctx = result
    messages = ctx.messages  # may have been redacted

    # ── Semantic cache ───────────────────────────────────────────────────
    cache = GatewayCache(redis_manager)
    cached = await cache.get(model, messages, body)
    if cached:
        tokens_used = cached.get("usage", {}).get("total_tokens", 0)
        credits = int(tokens_used * drain_rate)
        await redis_manager.deduct_tokens(rental_id, credits)

        def _log_cache():
            db.add(UsageLog(
                rental_id=rental_id, model=model,
                tokens_used=tokens_used, credits_consumed=credits,
                cost_usd=0.0, was_cached=True,
            ))
            db.commit()
        await asyncio.get_event_loop().run_in_executor(None, _log_cache)
        cached["x_cache"] = "HIT"
        return cached

    # ── Router + fallback chain ──────────────────────────────────────────
    circuit_breaker = CircuitBreakerService(redis_manager)
    gateway_router = GatewayRouter(circuit_breaker, db)
    fallback_list = await gateway_router.resolve(model)

    if not fallback_list:
        raise HTTPException(status_code=503, detail="All providers currently unavailable.")

    last_error = None

    for entry in fallback_list:
        provider = entry["provider"]
        fallback_model = entry["model"]
        api_key = entry["api_key"]

        try:
            extra_params = {k: v for k, v in body.items() if k not in ["model", "messages", "stream", "max_tokens"]}

            if stream:
                async def generate_stream(p=provider, fm=fallback_model, ak=api_key):
                    total_tokens = 0
                    try:
                        response_stream = await litellm.acompletion(
                            model=fm, messages=messages, api_key=ak,
                            stream=True, max_tokens=max_tokens, **extra_params,
                        )
                        async for chunk in response_stream:
                            if await request.is_disconnected():
                                break
                            if hasattr(chunk, "usage") and chunk.usage:
                                total_tokens = chunk.usage.total_tokens
                            chunk_data = chunk.model_dump() if hasattr(chunk, "model_dump") else chunk.dict()
                            yield f"data: {json.dumps(chunk_data)}\n\n"
                        yield "data: [DONE]\n\n"
                        await circuit_breaker.record_success(p)
                        if total_tokens > 0:
                            credits = int(total_tokens * drain_rate)
                            await redis_manager.deduct_tokens(rental_id, credits)

                            def _log_s(_t=total_tokens, _c=credits, _m=fm):
                                db.add(UsageLog(
                                    rental_id=rental_id, model=_m,
                                    tokens_used=_t, credits_consumed=_c,
                                    cost_usd=0.0, was_cached=False,
                                ))
                                db.commit()
                            await asyncio.get_event_loop().run_in_executor(None, _log_s)
                    except Exception as e:
                        await circuit_breaker.record_failure(p, str(e))
                        yield f'data: {{"error": "{str(e)}"}}\n\n'

                return StreamingResponse(
                    generate_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache", "Connection": "keep-alive",
                        "X-Model-Used": fallback_model, "X-Provider": provider,
                        "X-Cache": "MISS",
                    },
                )

            else:
                response = await litellm.acompletion(
                    model=fallback_model, messages=messages, api_key=api_key,
                    stream=False, max_tokens=max_tokens, **extra_params,
                )
                await circuit_breaker.record_success(provider)

                tokens_used = response.usage.total_tokens if hasattr(response, "usage") else 0
                credits = int(tokens_used * drain_rate)
                await redis_manager.deduct_tokens(rental_id, credits)

                def _persist(_t=tokens_used, _c=credits, _m=fallback_model):
                    rental = db.query(Rental).filter(Rental.id == rental_id).first()
                    if rental:
                        rental.tokens_used += _t
                        rental.requests_made += 1
                    db.add(UsageLog(
                        rental_id=rental_id, model=_m,
                        tokens_used=_t, credits_consumed=_c,
                        cost_usd=0.0, was_cached=False,
                    ))
                    db.commit()
                await asyncio.get_event_loop().run_in_executor(None, _persist)

                response_dict = response.model_dump() if hasattr(response, "model_dump") else response.dict()

                # ── Middleware: output pipeline ──────────────────────────
                out_ctx = ResponseContext(
                    response=response_dict, model=fallback_model,
                    rental_id=rental_id, was_cached=False,
                )
                out_ctx = await run_output_pipeline(out_ctx)
                response_dict = out_ctx.response if isinstance(out_ctx.response, dict) else response_dict

                # Cache the response
                await cache.set(model, messages, body, response_dict)

                # Annotate headers via response dict metadata
                response_dict["x_model_used"] = fallback_model
                response_dict["x_provider"] = provider
                response_dict["x_cache"] = "MISS"
                if fallback_model != model:
                    response_dict["x_fallback_used"] = True

                return response_dict

        except Exception as e:
            last_error = str(e)
            await circuit_breaker.record_failure(provider, last_error)
            logger.warning(f"Provider {provider}/{fallback_model} failed: {last_error}")
            continue

    raise HTTPException(status_code=503, detail=f"All providers failed. Last error: {last_error}")


@router.get(
    "/models",
    summary="List available models",
    description="Returns all gateway-supported models in OpenAI-compatible format. Only models with active provider keys are marked available.",
)
async def list_models(db: Session = Depends(get_db)):
    """List all gateway models — active provider keys determine availability."""
    from backend.database.models import ProviderKey, ProviderType

    active_providers = set()
    try:
        keys = db.query(ProviderKey).filter(ProviderKey.is_active == True).all()
        active_providers = {k.provider.value if hasattr(k.provider, "value") else k.provider for k in keys}
    except Exception:
        pass

    data = []
    for m in get_all_models():
        provider_key = infer_provider(m["id"])
        data.append({
            "id": m["id"],
            "object": "model",
            "owned_by": {"openai": "openai", "gemini": "google", "anthropic": "anthropic"}.get(provider_key, provider_key),
            "available": provider_key in active_providers or len(active_providers) == 0,
            "provider": m["provider"],
            "speed": m["speed"],
            "best_for": m["best_for"],
        })

    return {"object": "list", "data": data}
