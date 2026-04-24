"""OpenAI-compatible proxy endpoint with all production features."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import litellm
import json
import asyncio
from datetime import datetime

from backend.database.connection import get_db
from backend.database.models import Rental, UsageLog, RentalStatus, ProviderKey, ProviderType
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.services.circuit_breaker import CircuitBreakerService
from backend.services.cost_estimator import CostEstimator
from backend.services.semantic_cache import SemanticCache
from backend.services.key_rotation import KeyRotationService
from backend.services.fallback_chain import FallbackChain
from backend.services.drain_rate import get_drain_rate
from backend.config import settings

router = APIRouter()

# Initialize services
cost_estimator = CostEstimator()

# Global RPM limit across all users (based on provider limits)
GLOBAL_RPM_LIMIT = 500  # Total RPM across all users


async def verify_virtual_key(
    request: Request,
    redis_manager: RedisManager = Depends(get_redis_manager)
) -> dict:
    """Verify virtual API key and get rental data."""
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )

    virtual_key = authorization.replace("Bearer ", "")

    # Get rental data from Redis
    rental_data = await redis_manager.get_virtual_key_data(virtual_key)
    if not rental_data:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Virtual key expired or invalid. Please purchase a new plan."
        )

    return rental_data


@router.post(
    "/chat/completions",
    summary="Chat completions (OpenAI-compatible)",
    description="""
Send chat completion requests using your virtual key.

**Authentication:** Use your virtual key as the Bearer token:
```
Authorization: Bearer vk_your_key_here
```

**Supported models:**
- `gpt-4o-mini`, `gpt-4o` (OpenAI)
- `gemini-1.5-flash`, `gemini-1.5-pro` (Google)
- `claude-3-5-sonnet-20241022` (Anthropic)

**Example request body:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [{"role": "user", "content": "Hello!"}],
  "max_tokens": 500
}
```

The response follows the OpenAI response format exactly. Streaming (`stream: true`) is supported.
""",
)
async def chat_completions(
    request: Request,
    rental_data: dict = Depends(verify_virtual_key),
    db: Session = Depends(get_db),
    redis_manager: RedisManager = Depends(get_redis_manager)
):
    """OpenAI-compatible chat completions endpoint with all production features."""

    # Parse request body
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model", "gpt-4o-mini")
    stream = body.get("stream", False)
    user_max_tokens = body.get("max_tokens", None)

    # Per-provider max_tokens caps (provider hard limits)
    MAX_TOKENS_BY_MODEL = {
        "gpt-4o": 16384,
        "gpt-4o-mini": 16384,
        "claude-3-5-sonnet-20241022": 8192,
        "claude-3-opus": 4096,
        "gemini-1.5-pro": 8192,
        "gemini-1.5-flash": 8192,
    }
    provider_cap = MAX_TOKENS_BY_MODEL.get(model, 8192)
    max_tokens = min(user_max_tokens or 4096, provider_cap)

    rental_id = rental_data["rental_id"]
    user_id = rental_data["user_id"]
    rpm_limit = rental_data["rpm_limit"]
    rented_provider = rental_data.get("provider")  # e.g. "openai", "gemini", "anthropic"

    # ==================== PROVIDER VALIDATION ====================
    if rented_provider:
        from backend.services.fallback_chain import infer_provider
        requested_provider = infer_provider(model)
        if requested_provider != rented_provider:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This key is rented for {rented_provider}. "
                       f"Model '{model}' belongs to {requested_provider}. "
                       f"Please use a {rented_provider} model."
            )

    # Use per-model drain rate instead of plan multiplier
    drain_rate = get_drain_rate(model)

    # ==================== RATE LIMITING (per-user) ====================
    is_allowed = await redis_manager.check_rate_limit(rental_id, rpm_limit)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {rpm_limit} requests per minute",
            headers={
                "X-RateLimit-Limit": str(rpm_limit),
                "X-RateLimit-Remaining": "0",
                "Retry-After": "60"
            }
        )

    # ==================== GLOBAL RPM CHECK ====================
    global_allowed = await redis_manager.check_rate_limit("global", GLOBAL_RPM_LIMIT)
    if not global_allowed:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Platform is at maximum capacity. Please try again shortly.",
            headers={"Retry-After": "10"}
        )

    # ==================== IP PINNING ====================
    client_ip = request.client.host
    pinned_ip = await redis_manager.get_pinned_ip(rental_id)
    if pinned_ip and pinned_ip != client_ip:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP address mismatch. This key is locked to another IP."
        )
    elif not pinned_ip:
        await redis_manager.set_pinned_ip(rental_id, client_ip)

    # ==================== PROMPT INJECTION FILTER ====================
    from backend.services.prompt_filter import is_safe_prompt, ai_prescan_prompt

    full_prompt_text = ""
    for message in messages:
        content = message.get("content", "")
        full_prompt_text += content + "\n"
        is_safe, error_msg = is_safe_prompt(content, strict=True)
        if not is_safe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prompt blocked: potential security violation detected"
            )

    # AI pre-scan (Gemini Flash) — runs for all prompts, best-effort, never blocks on error
    ai_safe, ai_reason = await ai_prescan_prompt(full_prompt_text.strip())
    if not ai_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prompt blocked by AI safety filter: {ai_reason}"
        )

    # ==================== COST ESTIMATION ====================
    cost_estimate = cost_estimator.estimate_request_cost(messages, model, max_tokens)

    if settings.PRE_REQUEST_COST_CHECK:
        current_balance = await redis_manager.get_token_balance(rental_id)
        estimated_tokens = cost_estimate["total_tokens"]
        if estimated_tokens > current_balance:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient token balance. Required: ~{estimated_tokens}, Available: {current_balance}"
            )

    # ==================== SEMANTIC CACHING ====================
    semantic_cache = SemanticCache(redis_manager)
    prompt_text = "\n".join([msg.get("content", "") for msg in messages])

    cached_response = await semantic_cache.get_cached_response(prompt_text, model)
    if cached_response:
        tokens_used = cached_response.get("usage", {}).get("total_tokens", 0)
        credits = int(tokens_used * drain_rate)
        await redis_manager.deduct_tokens(rental_id, credits)

        def _log_cache_hit():
            usage_log = UsageLog(
                rental_id=rental_id,
                model=model,
                tokens_used=tokens_used,
                credits_consumed=credits,
                cost_usd=0.0,
                was_cached=True
            )
            db.add(usage_log)
            db.commit()

        await asyncio.get_event_loop().run_in_executor(None, _log_cache_hit)
        return cached_response

    # ==================== CIRCUIT BREAKER & FALLBACK ====================
    circuit_breaker = CircuitBreakerService(redis_manager)
    fallback_chain = FallbackChain(circuit_breaker)

    fallback_list = await fallback_chain.get_fallback_chain(model)
    if not fallback_list:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All providers are currently unavailable"
        )

    # ==================== KEY ROTATION & API CALL ====================
    key_rotation = KeyRotationService(db)

    # Also prepare env-based keys as fallback
    env_keys = {
        "openai": settings.get_openai_keys(),
        "anthropic": settings.get_anthropic_keys(),
        "google": settings.get_gemini_keys(),
    }

    response = None
    last_error = None

    for fallback in fallback_list:
        provider = fallback["provider"]
        fallback_model = fallback["model"]

        # Try DB key rotation first (offloaded — sync DB query + commit)
        api_key = await asyncio.get_event_loop().run_in_executor(
            None, lambda: key_rotation.get_next_key(provider)
        )
        if not api_key:
            keys = env_keys.get(provider, [])
            if not keys:
                last_error = f"No API keys configured for {provider}"
                continue
            api_key = keys[0]

        try:
            if stream:
                # ==================== STREAMING WITH DISCONNECT HANDLING ====================
                async def generate_stream():
                    total_tokens = 0
                    try:
                        response_stream = await litellm.acompletion(
                            model=fallback_model,
                            messages=messages,
                            api_key=api_key,
                            stream=True,
                            max_tokens=max_tokens,
                            **{k: v for k, v in body.items()
                               if k not in ["model", "messages", "stream", "max_tokens"]}
                        )

                        async for chunk in response_stream:
                            # Check if client disconnected
                            if await request.is_disconnected():
                                # Kill upstream connection to save money
                                break

                            if hasattr(chunk, 'usage') and chunk.usage:
                                total_tokens = chunk.usage.total_tokens

                            chunk_data = chunk.model_dump() if hasattr(chunk, 'model_dump') else chunk.dict()
                            yield f"data: {json.dumps(chunk_data)}\n\n"

                        yield "data: [DONE]\n\n"

                        # Record success
                        await circuit_breaker.record_success(provider)

                        # Deduct tokens
                        if total_tokens > 0:
                            credits = int(total_tokens * drain_rate)
                            await redis_manager.deduct_tokens(rental_id, credits)

                            def _log_stream(_total_tokens=total_tokens, _credits=credits, _model=fallback_model):
                                usage_log = UsageLog(
                                    rental_id=rental_id,
                                    model=_model,
                                    tokens_used=_total_tokens,
                                    credits_consumed=_credits,
                                    cost_usd=cost_estimate.get("total_cost_usd", 0.0),
                                    was_cached=False
                                )
                                db.add(usage_log)
                                db.commit()

                            await asyncio.get_event_loop().run_in_executor(None, _log_stream)

                    except Exception as e:
                        await circuit_breaker.record_failure(provider, str(e))
                        yield f'data: {{"error": "{str(e)}"}}\n\n'

                return StreamingResponse(
                    generate_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Model-Used": fallback_model,
                        "X-Provider": provider
                    }
                )

            else:
                # ==================== NON-STREAMING ====================
                response = await litellm.acompletion(
                    model=fallback_model,
                    messages=messages,
                    api_key=api_key,
                    stream=False,
                    max_tokens=max_tokens,
                    **{k: v for k, v in body.items()
                       if k not in ["model", "messages", "stream", "max_tokens"]}
                )

                await circuit_breaker.record_success(provider)

                tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else 0
                credits = int(tokens_used * drain_rate)

                await redis_manager.deduct_tokens(rental_id, credits)

                # Update rental stats and log usage — offloaded to thread pool
                def _persist_usage(_tokens=tokens_used, _credits=credits, _model=fallback_model):
                    rental = db.query(Rental).filter(Rental.id == rental_id).first()
                    if rental:
                        rental.tokens_used += _tokens
                        rental.requests_made += 1
                    usage_log = UsageLog(
                        rental_id=rental_id,
                        model=_model,
                        tokens_used=_tokens,
                        credits_consumed=_credits,
                        cost_usd=cost_estimate.get("total_cost_usd", 0.0),
                        was_cached=False
                    )
                    db.add(usage_log)
                    db.commit()

                await asyncio.get_event_loop().run_in_executor(None, _persist_usage)

                # Cache response
                response_dict = response.model_dump() if hasattr(response, 'model_dump') else response.dict()
                await semantic_cache.cache_response(prompt_text, model, response_dict)

                return response_dict

        except Exception as e:
            last_error = str(e)
            await circuit_breaker.record_failure(provider, last_error)
            continue

    # All providers failed
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"All providers failed. Last error: {last_error}"
    )


@router.get("/models", summary="List available models", description="Returns the list of AI models available for use, in OpenAI-compatible format. Mirrors the `/v1/models` endpoint convention.")
async def list_models(db: Session = Depends(get_db)):
    """List available models from active plans (OpenAI-compatible)."""
    from backend.database.models import Plan
    from backend.services.fallback_chain import infer_provider

    plans = await asyncio.get_event_loop().run_in_executor(
        None, lambda: db.query(Plan).filter(Plan.is_active == True, Plan.model_id != None).all()
    )
    seen = set()
    data = []
    for plan in plans:
        if plan.model_id and plan.model_id not in seen:
            seen.add(plan.model_id)
            provider = infer_provider(plan.model_id)
            owned_by = {"openai": "openai", "gemini": "google", "anthropic": "anthropic"}.get(provider, provider)
            data.append({
                "id": plan.model_id,
                "object": "model",
                "owned_by": owned_by,
            })

    return {"object": "list", "data": data}
