"""OpenAI-compatible gateway proxy — router, middleware pipeline, fallbacks, cache."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from typing import Optional
import anyio
import litellm
import json
import asyncio
import functools
import logging
from datetime import datetime

from backend.database.connection import get_db
from backend.database.models import Rental, UsageLog, RentalStatus
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.services.circuit_breaker import CircuitBreakerService
from backend.services.router import GatewayRouter, infer_provider, get_all_models, normalize_model_id
from backend.services.cache import GatewayCache
from backend.services.drain_rate import get_drain_rate
from backend.middleware.guardrails.base import RequestContext, ResponseContext, BlockedResponse
from backend.middleware.guardrails.pipeline import run_input_pipeline, run_output_pipeline
from backend.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _litellm_model(provider: str, model: str) -> str:
    """Provider-qualified model id for LiteLLM (e.g. "anthropic/claude-..."), so it
    never has to guess the provider from a bare name. Already-qualified ids pass through."""
    return model if "/" in model else f"{provider}/{model}"


# OpenAI chat parameters forwarded to LiteLLM. Anything else (base_url, api_base,
# extra_headers, mock_response, stream_options, max_completion_tokens, n, ...) is dropped
# so a client can never redirect the call or override gateway limits.
ALLOWED_PARAMS = frozenset({
    "temperature", "top_p", "stop", "presence_penalty", "frequency_penalty", "seed",
    "response_format", "tools", "tool_choice", "parallel_tool_calls", "user",
    "logit_bias", "logprobs", "top_logprobs",
})
SUPPORTED_PROVIDERS = ("openai", "anthropic", "gemini")


# ==================== Streaming billing ====================
#
# A stream is charged once, after it ends however it ends: completion, client disconnect
# (Starlette cancels the stream) or provider error. Exact provider-reported usage is used
# only for a stream that completed; anything else is an ESTIMATE (prompt + output received
# from the provider so far) and is logged as such.

def _chunk_output_text(chunk_data) -> str:
    """Generated text in one stream chunk (content and tool-call arguments), for estimates."""
    if not isinstance(chunk_data, dict):
        return ""
    parts = []
    for choice in chunk_data.get("choices") or []:
        delta = choice.get("delta") if isinstance(choice, dict) else None
        if not isinstance(delta, dict):
            continue
        if isinstance(delta.get("content"), str):
            parts.append(delta["content"])
        for call in delta.get("tool_calls") or []:
            function = call.get("function") if isinstance(call, dict) else None
            if isinstance(function, dict) and isinstance(function.get("arguments"), str):
                parts.append(function["arguments"])
    return "".join(parts)


def _estimate_stream_tokens(model: str, messages: list, tools, output_text: str) -> int:
    """ESTIMATED tokens for prompt + output text (not provider-reported usage).

    LiteLLM's token counter runs offline here; for non-OpenAI models it approximates with
    an OpenAI tokenizer. Falls back to the gateway's 4-chars-per-token heuristic."""
    try:
        prompt = litellm.token_counter(model=model, messages=messages, tools=tools or None)
        output = litellm.token_counter(model=model, text=output_text) if output_text else 0
        return int(prompt) + int(output)
    except Exception as e:
        logger.warning(f"Token counter unavailable for {model}, using 4-chars-per-token heuristic: {e}")
        chars = sum(len(m.get("content")) for m in messages
                    if isinstance(m, dict) and isinstance(m.get("content"), str))
        return (chars + len(output_text)) // 4


def _stream_billable_tokens(state: dict, model: str, messages: list, tools) -> tuple:
    """(tokens, "exact" | "estimated" | "none") for one streamed request."""
    if state["completed"] and state["reported_total"] > 0:
        return state["reported_total"], "exact"
    if not state["opened"]:
        return 0, "none"                      # the provider never accepted the request
    output_text = "".join(state["text_parts"])
    if state["failed"] and not output_text:
        return 0, "none"                      # provider error before any output
    estimate = _estimate_stream_tokens(model, messages, tools, output_text)
    # Never charge less than usage the provider already reported part-way through
    return max(estimate, state["reported_total"]), "estimated"


async def _settle_stream_usage(state: dict, *, rental_id, model: str, messages: list, tools,
                               drain_rate: float, redis_manager: RedisManager, db: Session):
    """Charge one streamed request at most once. Never raises; failures are logged.

    Called from the stream's (shielded) finally and from the response's background task:
    whichever runs first settles, the other returns immediately."""
    if state["settled"]:
        return
    state["settled"] = True   # set before any await, so a second caller can never charge again

    try:
        tokens, source = _stream_billable_tokens(state, model, messages, tools)
    except Exception as e:
        logger.error(f"Stream billing failed for rental {rental_id}: could not determine usage: {e}")
        return
    if tokens <= 0:
        logger.info(f"Stream for rental {rental_id} not charged (no billable usage)")
        return

    credits = int(tokens * drain_rate)
    try:
        await redis_manager.deduct_tokens(rental_id, credits)
    except Exception as e:
        logger.error(
            f"Stream billing failed for rental {rental_id}: could not deduct {credits} credits "
            f"for {tokens} {source} tokens: {e}"
        )
        return
    logger.info(f"Stream billed for rental {rental_id}: {tokens} tokens ({source} usage), {credits} credits")

    def _log_usage():
        try:
            db.add(UsageLog(
                rental_id=rental_id, model=model,
                tokens_used=tokens, credits_consumed=credits,
                cost_usd=0.0, was_cached=False,
            ))
            db.commit()
        except Exception:
            db.rollback()
            raise
    try:
        await asyncio.get_event_loop().run_in_executor(None, _log_usage)
    except Exception as e:
        logger.error(
            f"Usage log write failed for rental {rental_id} ({tokens} {source} tokens, "
            f"{credits} credits already deducted): {e}"
        )


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

    if virtual_key.startswith("ik_"):
        import json as _json
        from backend.database.models import InternalKey
        from datetime import datetime as _dt
        key_row = db.query(InternalKey).filter(
            InternalKey.virtual_key == virtual_key,
            InternalKey.is_active == True,
        ).first()
        if not key_row:
            raise HTTPException(status_code=401, detail="Internal key invalid or revoked")
        if key_row.expires_at and key_row.expires_at < _dt.utcnow():
            raise HTTPException(status_code=401, detail="Internal key expired")
        user = key_row.user
        allowed_models = _json.loads(user.allowed_models or "[]")
        token_budget = user.token_budget or 0
        return {
            "rental_id": f"ik_{key_row.id}",
            "user_id": user.id,
            "allowed_models": allowed_models,
            "tokens_remaining": token_budget - key_row.tokens_used if token_budget else 999_999_999,
            "rpm_limit": user.rpm_limit_override or 60,
            "key_type": "internal",
            "internal_key_id": key_row.id,
        }

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
    model="gpt-4o-mini",   # or claude-sonnet-5-5, gemini-1.5-flash, etc.
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

    # Provider-qualified ids ("gemini/gemini-1.5-flash") are accepted only for a supported
    # provider whose prefix matches the model. The bare id is used from here on, so the
    # router picks that provider's key and billing uses the right drain rate.
    if not isinstance(model, str):
        raise HTTPException(status_code=400, detail="Invalid model")
    if "/" in model:
        prefix, bare = model.split("/", 1)
        if prefix not in SUPPORTED_PROVIDERS or "/" in bare or infer_provider(bare) != prefix:
            raise HTTPException(status_code=400, detail=f"Unsupported model '{model}'")
        model = bare

    # Enforce per-user model allowlist (internal keys only)
    allowed_models = rental_data.get("allowed_models", [])
    if allowed_models and model not in allowed_models:
        raise HTTPException(
            status_code=403,
            detail=f"Model '{model}' is not allowed for your account. Allowed: {allowed_models}",
        )

    MAX_TOKENS_BY_MODEL = {
        "gpt-4o": 16384, "gpt-4o-mini": 16384,
        "claude-3-5-sonnet-20241022": 8192, "claude-3-opus-20240229": 4096,
        "gemini-1.5-pro": 8192, "gemini-1.5-flash": 8192, "gemini-2.0-flash": 8192,
    }
    max_tokens = min(user_max_tokens or 4096, MAX_TOKENS_BY_MODEL.get(model, 8192))

    # Retired IDs are served by their replacement; allowlist, token cap, drain rate
    # and cache key stay on the requested ID so legacy behaviour and billing are unchanged.
    routed_model = normalize_model_id(model)

    rental_id = rental_data["rental_id"]
    user_id = rental_data["user_id"]
    rpm_limit = rental_data["rpm_limit"]
    tokens_remaining = rental_data.get("tokens_remaining")
    if tokens_remaining is None:  # rental (vk_) keys: live credit balance is Redis balance:{rental_id}
        tokens_remaining = await redis_manager.get_token_balance(rental_id)
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
    cached = await cache.get(model, messages, body, user_id=user_id)
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
        try:
            await asyncio.get_event_loop().run_in_executor(None, _log_cache)
        except Exception as e:
            logger.error(f"Usage log write failed for rental {rental_id}: {e}")
        cached["x_cache"] = "HIT"
        return cached

    # ── Router + fallback chain ──────────────────────────────────────────
    circuit_breaker = CircuitBreakerService(redis_manager)
    gateway_router = GatewayRouter(circuit_breaker, db)
    fallback_list = await gateway_router.resolve(routed_model)

    if not fallback_list:
        raise HTTPException(status_code=503, detail="All providers currently unavailable.")

    last_error = None
    extra_params = {k: v for k, v in body.items() if k in ALLOWED_PARAMS}

    for entry in fallback_list:
        provider = entry["provider"]
        fallback_model = entry["model"]
        api_key = entry["api_key"]

        if stream:
            stream_state = {
                "opened": False, "completed": False, "failed": False,
                "reported_total": 0, "text_parts": [], "settled": False,
            }
            settle = functools.partial(
                _settle_stream_usage, stream_state,
                rental_id=rental_id, model=fallback_model, messages=messages,
                tools=extra_params.get("tools"), drain_rate=drain_rate,
                redis_manager=redis_manager, db=db,
            )

            async def generate_stream(p=provider, fm=fallback_model, ak=api_key, state=stream_state):
                try:
                    try:
                        response_stream = await litellm.acompletion(
                            model=_litellm_model(p, fm), messages=messages, api_key=ak,
                            stream=True, stream_options={"include_usage": True},
                            max_tokens=max_tokens, **extra_params,
                        )
                        state["opened"] = True
                        client_gone = False
                        async for chunk in response_stream:
                            if await request.is_disconnected():
                                client_gone = True
                                break
                            if hasattr(chunk, "usage") and chunk.usage:
                                reported = chunk.usage.total_tokens
                                if isinstance(reported, (int, float)) and reported > state["reported_total"]:
                                    state["reported_total"] = int(reported)
                            chunk_data = chunk.model_dump() if hasattr(chunk, "model_dump") else chunk.dict()
                            state["text_parts"].append(_chunk_output_text(chunk_data))
                            yield f"data: {json.dumps(chunk_data)}\n\n"
                        state["completed"] = not client_gone
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        # Provider/stream failure: count it against the provider, but only send
                        # the client a generic message (raw errors can carry internal details).
                        state["failed"] = True
                        logger.warning(f"Provider {p}/{fm} stream failed: {e}")
                        await circuit_breaker.record_failure(p, str(e))
                        yield f"data: {json.dumps({'error': 'The AI provider returned an error. Please try again.'})}\n\n"
                        return

                    # Bookkeeping after a successful stream: a failure here is ours, not the
                    # provider's, so it never trips the breaker or writes after [DONE].
                    try:
                        await circuit_breaker.record_success(p)
                    except Exception as e:
                        logger.error(f"Circuit breaker update failed for provider {p}: {e}")
                finally:
                    # Charge on every exit path. A client disconnect cancels this stream, so
                    # billing is shielded from that cancellation.
                    with anyio.CancelScope(shield=True):
                        await settle()

            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache", "Connection": "keep-alive",
                    "X-Model-Used": fallback_model, "X-Provider": provider,
                    "X-Cache": "MISS",
                },
                # Also settles if the stream is cancelled while paused at a yield (its
                # finally then runs only later); at most one of the two ever charges.
                background=BackgroundTask(settle),
            )

        # Only the provider call decides fallback. Errors after a successful call
        # must not trigger a second (paid) call to the next provider.
        try:
            response = await litellm.acompletion(
                model=_litellm_model(provider, fallback_model), messages=messages, api_key=api_key,
                stream=False, max_tokens=max_tokens, **extra_params,
            )
        except Exception as e:
            last_error = str(e)
            await circuit_breaker.record_failure(provider, last_error)
            logger.warning(f"Provider {provider}/{fallback_model} failed: {last_error}")
            continue
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
        try:
            await asyncio.get_event_loop().run_in_executor(None, _persist)
        except Exception as e:
            logger.error(f"Usage log write failed for rental {rental_id}: {e}")

        response_dict = response.model_dump() if hasattr(response, "model_dump") else response.dict()

        # ── Middleware: output pipeline ──────────────────────────
        out_ctx = ResponseContext(
            response=response_dict, model=fallback_model,
            rental_id=rental_id, was_cached=False,
        )
        out_ctx = await run_output_pipeline(out_ctx)
        response_dict = out_ctx.response if isinstance(out_ctx.response, dict) else response_dict

        # Cache the response
        await cache.set(model, messages, body, response_dict, user_id=user_id)

        # Annotate headers via response dict metadata
        response_dict["x_model_used"] = fallback_model
        response_dict["x_provider"] = provider
        response_dict["x_cache"] = "MISS"
        if fallback_model != routed_model:
            response_dict["x_fallback_used"] = True

        return response_dict

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
