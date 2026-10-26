"""OpenAI-compatible gateway proxy — router, middleware pipeline, fallbacks, cache."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
import anyio
import litellm
import json
import asyncio
import functools
import logging
from datetime import datetime, timezone

from backend.database.connection import get_db
from backend.database.models import Rental, UsageLog, InternalKey
from backend.database.redis_manager import get_redis_manager, RedisManager
from backend.services.circuit_breaker import CircuitBreakerService
from backend.services.router import (
    GatewayRouter, infer_provider, get_all_models, normalize_model_id,
    is_supported_model,
)
from backend.services.cache import GatewayCache
from backend.services.cost_estimator import CostEstimator
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


def _is_client_error(exc: Exception) -> bool:
    """True when the provider rejected the request's own content (bad params, too long).
    That is the caller's mistake, so it must not count against the provider's circuit
    breaker. Everything else still does: 401/403 (our key), 404 (a catalogue model the
    provider no longer serves), 408/429 (provider limits) and 5xx."""
    return getattr(exc, "status_code", None) in (400, 413, 422)


def _cost_usd(model: str, prompt_tokens, completion_tokens) -> float:
    """Provider cost of one request in USD from the published price table, or 0.0 when the
    usage split is unknown or the model has no listed price."""
    if not isinstance(prompt_tokens, int) or not isinstance(completion_tokens, int):
        return 0.0
    if model not in CostEstimator.PRICING:
        logger.warning(f"No price listed for {model}: cost recorded as 0")
        return 0.0
    return CostEstimator().estimate_cost(model, prompt_tokens, completion_tokens)


def _write_usage(db: Session, rental_id, model: str, tokens: int, credits: int,
                 cost_usd: float, was_cached: bool) -> None:
    """Record one request (runs in a worker thread). Counters are incremented in SQL, not
    read-modify-write, so parallel requests never lose updates. Internal keys (ik_<id>) have
    no rental row: their usage is counted on the key, which is what enforces token_budget."""
    try:
        if isinstance(rental_id, str):
            key_id = int(rental_id.split("_", 1)[1])
            db.query(InternalKey).filter(InternalKey.id == key_id).update(
                {InternalKey.tokens_used: InternalKey.tokens_used + tokens})
        else:
            db.query(Rental).filter(Rental.id == rental_id).update({
                Rental.tokens_used: Rental.tokens_used + tokens,
                Rental.tokens_remaining: Rental.tokens_remaining - credits,
                Rental.requests_made: Rental.requests_made + 1,
            })
            db.add(UsageLog(
                rental_id=rental_id, model=model, tokens_used=tokens,
                credits_consumed=credits, cost_usd=cost_usd, was_cached=was_cached,
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise


def _billing_rate(requested: str, routed: str, served: str) -> float:
    """Drain rate to charge. A retired ID served by its replacement keeps the rate of the
    ID the client asked for; a real fallback to a different model is charged at that
    model's own rate, so a cheaper fallback never bills the dearer model's price."""
    return get_drain_rate(requested if served == routed else served)


async def _record_spend(redis_manager: RedisManager, cost_usd: float) -> None:
    """Add provider cost to the platform budget tracker (feeds the admin budget view and
    the cost-protection worker). Best effort: never fails the request."""
    if cost_usd <= 0:
        return
    try:
        await redis_manager.redis.incrbyfloat("capacity:budget:spent", cost_usd)
    except Exception as e:
        logger.debug(f"Spend tracking skipped: {e}")


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


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
    if not isinstance(rental_id, str):   # internal keys have no Redis balance
        try:
            await redis_manager.deduct_tokens(rental_id, credits)
        except Exception as e:
            logger.error(
                f"Stream billing failed for rental {rental_id}: could not deduct {credits} credits "
                f"for {tokens} {source} tokens: {e}"
            )
            return
    logger.info(f"Stream billed for rental {rental_id}: {tokens} tokens ({source} usage), {credits} credits")

    # A stream reports one total; price it as prompt tokens unless the split was reported.
    prompt_tokens = state.get("reported_prompt") or tokens
    cost = _cost_usd(model, prompt_tokens, max(tokens - prompt_tokens, 0))
    await _record_spend(redis_manager, cost)
    try:
        await asyncio.get_event_loop().run_in_executor(
            None, _write_usage, db, rental_id, model, tokens, credits, cost, False)
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
        key_row = db.query(InternalKey).filter(
            InternalKey.virtual_key == virtual_key,
            InternalKey.is_active == True,
        ).first()
        if not key_row:
            raise HTTPException(status_code=401, detail="Internal key invalid or revoked")
        expires_at = key_row.expires_at
        if expires_at is not None:
            if expires_at.tzinfo is not None:   # stored values are naive UTC
                expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
            if expires_at < datetime.utcnow():
                raise HTTPException(status_code=401, detail="Internal key expired")
        user = key_row.user
        if not user or not user.is_active or await redis_manager.is_user_blocked(user.id):
            raise HTTPException(status_code=401, detail="Internal key invalid or revoked")
        allowed_models = _json.loads(user.allowed_models or "[]")
        token_budget = user.token_budget or 0
        return {
            "rental_id": f"ik_{key_row.id}",
            "user_id": user.id,
            "allowed_models": allowed_models,
            "tokens_remaining": max(token_budget - key_row.tokens_used, 0) if token_budget else 999_999_999,
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
    if await redis_manager.is_user_blocked(rental_data["user_id"]):
        raise HTTPException(status_code=403, detail="This account is suspended.")
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
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON")
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages or not all(isinstance(m, dict) for m in messages):
        raise HTTPException(status_code=400, detail="'messages' must be a non-empty list of message objects")
    model = body.get("model") or settings.GATEWAY_DEFAULT_MODEL
    stream = bool(body.get("stream", False))
    user_max_tokens = body.get("max_tokens", None)
    if user_max_tokens is not None and (not isinstance(user_max_tokens, int) or user_max_tokens < 1):
        raise HTTPException(status_code=400, detail="'max_tokens' must be a positive integer")

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

    # Only catalogue models are served: anything else would reach the provider and be
    # billed at a guessed drain rate. Admins can also switch a model off.
    if not is_supported_model(model):
        raise HTTPException(status_code=400, detail=f"Unsupported model '{model}'. See GET /v1/models.")
    if model in await redis_manager.get_disabled_models():
        raise HTTPException(status_code=403, detail=f"Model '{model}' is currently disabled.")

    # Enforce what the rental was bought for: a model-specific plan and the chosen provider.
    plan_model = rental_data.get("model_id")
    if plan_model and normalize_model_id(plan_model) != normalize_model_id(model):
        raise HTTPException(status_code=403, detail=f"This plan only includes '{plan_model}'.")
    plan_provider = rental_data.get("provider")
    if plan_provider and infer_provider(normalize_model_id(model)) != plan_provider:
        raise HTTPException(status_code=403, detail=f"This rental only includes {plan_provider} models.")

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
    client_ip = _client_ip(request)
    pinned_ip = await redis_manager.pin_ip(rental_id, client_ip)   # atomic: first request wins
    if pinned_ip != client_ip:
        raise HTTPException(status_code=403, detail="IP address mismatch. This key is locked to another IP.")

    # ── Middleware: input pipeline ───────────────────────────────────────
    ctx = RequestContext(
        messages=messages,
        model=model,
        rental_id=rental_id,
        user_id=user_id,
        tokens_remaining=tokens_remaining,
        body=body,
        # Rental balances are credits (tokens x drain rate); an internal key's budget is raw tokens
        drain_rate=1.0 if isinstance(rental_id, str) else drain_rate,
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
        if not isinstance(rental_id, str):
            await redis_manager.deduct_tokens(rental_id, credits)
        try:
            # A cache hit costs the provider nothing, so cost_usd is 0
            await asyncio.get_event_loop().run_in_executor(
                None, _write_usage, db, rental_id, model, tokens_used, credits, 0.0, True)
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
                "reported_total": 0, "reported_prompt": 0, "text_parts": [], "settled": False,
            }
            settle = functools.partial(
                _settle_stream_usage, stream_state,
                rental_id=rental_id, model=fallback_model, messages=messages,
                tools=extra_params.get("tools"), drain_rate=_billing_rate(model, routed_model, fallback_model),
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
                                    prompt_part = getattr(chunk.usage, "prompt_tokens", None)
                                    if isinstance(prompt_part, int):
                                        state["reported_prompt"] = prompt_part
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
                        if _is_client_error(e):
                            message = "The provider rejected this request. Check the model and parameters."
                        else:
                            await circuit_breaker.record_failure(p, str(e))
                            message = "The AI provider returned an error. Please try again."
                        yield f"data: {json.dumps({'error': message})}\n\n"
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
            logger.warning(f"Provider {provider}/{fallback_model} failed: {e}")
            if _is_client_error(e):
                # The caller's request is at fault: trying another provider or tripping this
                # provider's breaker would only hurt other customers.
                raise HTTPException(status_code=400, detail="The provider rejected this request. Check the model and parameters.")
            last_error = str(e)
            await circuit_breaker.record_failure(provider, last_error)
            continue
        await circuit_breaker.record_success(provider)

        usage = getattr(response, "usage", None)
        tokens_used = usage.total_tokens if usage else 0
        # Bill the model that actually answered (see _billing_rate)
        credits = int(tokens_used * _billing_rate(model, routed_model, fallback_model))
        if not isinstance(rental_id, str):
            await redis_manager.deduct_tokens(rental_id, credits)

        cost = _cost_usd(fallback_model, getattr(usage, "prompt_tokens", None), getattr(usage, "completion_tokens", None))
        await _record_spend(redis_manager, cost)
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, _write_usage, db, rental_id, fallback_model, tokens_used, credits, cost, False)
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

    # last_error stays in the server log (above): provider errors can contain key fragments
    logger.error(f"All providers failed for rental {rental_id}: {last_error}")
    raise HTTPException(status_code=503, detail="All providers are currently failing. Please try again shortly.")


@router.get(
    "/models",
    summary="List available models",
    description="Returns all gateway-supported models in OpenAI-compatible format. Only models with active provider keys are marked available.",
)
async def list_models(db: Session = Depends(get_db)):
    """List all gateway models — active provider keys determine availability."""
    from backend.database.models import ProviderKey

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
