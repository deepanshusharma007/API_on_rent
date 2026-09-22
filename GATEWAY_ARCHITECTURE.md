# AIRent — Gateway Architecture

## Vision

Transform AIRent from a "pick-your-provider" rental model into a **transparent AI gateway** — users buy access by duration/token tier, send requests to a single endpoint, and the gateway handles everything: routing, fallbacks, caching, and guardrails. The experience mirrors LiteLLM Proxy but with a rental/billing layer on top.

---

## What Changes

### Before (current model)
1. User browses providers (OpenAI, Anthropic, Gemini cards)
2. User picks a provider + plan
3. Gets a virtual key locked to that provider
4. Hits `/v1/chat/completions` — proxy forwards to that one provider only

### After (gateway model)
1. User browses **plans** (15 min / 1 hr / 24 hr tiers — no provider choice)
2. Gets a virtual key that works with **any supported model**
3. Hits `/v1/chat/completions` with any `model` field (`gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-pro`)
4. Gateway routes to the right provider, falls back on failure, applies middleware guardrails, serves from cache

---

## Core Components

### 1. Router
**File:** `backend/services/router.py` (new)

Decides which provider + key handles a request:
- Parse `model` from request body
- Map model → provider (`gpt-4o` → `openai`, `claude-*` → `anthropic`, `gemini-*` → `gemini`)
- If model is unknown or omitted → use configured default model
- Select a healthy provider key via round-robin from the pool

```
model field → provider detection → key pool selection → (provider, api_key)
```

### 2. Fallback Chain
**File:** `backend/services/router.py` (part of Router)

When a provider call fails (rate limit, 5xx, timeout):
- Try next key in the same provider's pool
- If all keys exhausted → try the fallback provider for that model family
- Fallback map (configurable in `config.py`):
  ```
  gpt-4o          → gpt-4o-mini → gemini-1.5-pro
  claude-3-5-*    → claude-3-haiku → gpt-4o-mini
  gemini-1.5-pro  → gemini-1.5-flash → gpt-4o-mini
  ```
- If all fallbacks exhausted → return 503 with clear error

### 3. Middleware Guardrail Pipeline
**File:** `backend/middleware/guardrails/` (new directory)

Inspired by LangChain middleware — each guardrail is an independent, chainable class with a standard interface. The pipeline is ordered and each middleware can pass, modify, or block a request.

#### Base Interface
```python
class GuardrailMiddleware(ABC):
    enabled: bool = True
    tier_required: str | None = None   # None = all tiers, "pro" = paid only

    @abstractmethod
    async def process_input(self, ctx: RequestContext) -> RequestContext | BlockedResponse:
        ...

    @abstractmethod
    async def process_output(self, ctx: ResponseContext) -> ResponseContext | BlockedResponse:
        ...
```

#### Input Pipeline (before provider call)
```
[TokenEstimator]      estimate tokens → block if would exceed rental cap
[PIIDetector]         regex scan for SSN, cards, emails, phone → block or redact
[InjectionDetector]   jailbreak / prompt injection patterns → block
[ContentModerator]    AI-based content scan (gemini-flash, optional) → block
[RateLimiter]         per-key RPM + global RPM check → 429 or 503
```

#### Output Pipeline (after provider response)
```
[PIIScrubber]         scrub PII from response text
[ToxicityFilter]      flag/log toxic responses (non-blocking by default)
[ResponseValidator]   ensure response is valid JSON / OpenAI-compatible shape
```

#### Why middleware pattern (vs monolithic prompt_filter.py)
- Each guardrail is independently testable and deployable
- Admin can toggle each on/off via config flags without touching code
- New guardrails (e.g. Llama Guard, AWS Comprehend, custom rules) added by dropping a new class
- Conditional execution: e.g. run AI scan only for free-tier users, skip for pro
- Request context (`RequestContext`) flows through the chain — middleware can annotate it (e.g. add `pii_detected: true`) for logging

#### Config flags (`config.py`)
```
GUARDRAIL_TOKEN_ESTIMATOR=true
GUARDRAIL_PII_BLOCK=true
GUARDRAIL_INJECTION_BLOCK=true
GUARDRAIL_AI_SCAN=false          # off by default (costs tokens)
GUARDRAIL_OUTPUT_SCRUB=false
GUARDRAIL_TOXICITY_LOG=true
```

### 4. Semantic Cache
**File:** `backend/services/cache.py` (extracted from `proxy.py`)

- Key: `SHA256(model + last_user_message)` — only for `temperature=0` or unset
- Store in Redis, TTL per model (fast models: 30 min, slow/expensive: 2 hr)
- On hit: return cached response + deduct tokens, skip provider entirely
- Shared across users — safe for deterministic prompts
- Cache key: `cache:v1:{sha256}`

### 5. Virtual Key — Provider-Agnostic
**File:** `backend/database/models.py`

Remove `provider` from Plan. A rental grants access to the whole gateway.

```
Plan:   make  model_id, provider  optional (nullable) — no longer required
        keep  duration_minutes, token_cap, rpm_limit, price
Rental: remove provider field from new rentals
        keep  virtual_key, tokens_used, tokens_remaining, expires_at
```

The `model` called is logged per-request in `UsageLog`, not locked at rental time.

---

## Request Lifecycle (new)

```
POST /v1/chat/completions
  Bearer: vk_xxx
        │
        ▼
[Auth] validate virtual key → Rental → check expiry + tokens
        │
        ▼
[Middleware: Input Pipeline]
  TokenEstimator → PIIDetector → InjectionDetector → ContentModerator → RateLimiter
        │ any middleware can return BlockedResponse here
        ▼
[Cache] check semantic cache
        │ HIT → return cached, deduct tokens, skip to UsageLog
        │ MISS ↓
        ▼
[Router] model → provider → api_key (with fallback chain on failure)
        │
        ▼
[LiteLLM] acompletion(model, messages, api_key)
        │ on failure → fallback chain (next key → next provider)
        ▼
[Middleware: Output Pipeline]
  PIIScrubber → ToxicityFilter → ResponseValidator
        │
        ▼
[Token Drain] deduct actual tokens from Rental
        │
        ▼
[Cache Write] store if cacheable (temp=0)
        │
        ▼
[UsageLog] write: model_used, provider, tokens, latency, guardrails_triggered
        │
        ▼
Return response
```

---

## UI Changes

### Landing Page
**Goal:** position AIRent as "LiteLLM-compatible AI gateway" — developers should immediately recognize the pattern.

- **Hero headline:** Change from "Rent AI APIs" → "Your AI Gateway. Pay per use."
- **Sub-headline:** "OpenAI-compatible endpoint. Any model. Automatic fallbacks."
- **Feature grid** (replace current provider logos with gateway features):
  | Icon | Feature |
  |---|---|
  | Route | Smart Routing — requests go to the best available model |
  | Shield | Guardrails — PII protection, injection detection built-in |
  | Zap | Semantic Cache — identical prompts served instantly |
  | RefreshCw | Automatic Fallbacks — never a dead end |
  | Key | Universal Key — one key, all models |
  | Clock | Pay by Time — 15 min to 24 hr plans |
- **Code snippet section** (NEW — like LiteLLM docs): show that it's a drop-in replacement
  ```python
  # Before (OpenAI SDK)
  client = OpenAI(api_key="sk-...")

  # After (AIRent gateway — zero other changes)
  client = OpenAI(
      api_key="vk_your_rental_key",
      base_url="https://api-on-rent.pages.dev/v1"
  )
  ```
- **Supported models table** (NEW): show all models available through the gateway

### Marketplace (3-step → 2-step)
**Before:** Step 1 Provider → Step 2 Plan → Step 3 Checkout
**After:** Step 1 Plan → Step 2 Checkout

**Step 1 — Plan Selection:**
- Remove provider cards entirely
- Show plan cards (15 min / 1 hr / 24 hr) with token caps
- Below the plan cards: collapsible "Supported Models" section
  - Table: Model name | Provider | Speed | Best for | Status (live/degraded)
  - Derived from active `ProviderKey` records — shows only what's actually available
  - Makes it clear users get access to ALL these models with any plan

**Step 2 — Checkout:**
- Remove provider field from order summary
- Show: Plan tier + duration + token cap + price
- Add: "Access to N models" line item

### Dashboard
**Active Rentals tab:**
- Remove "Provider" column
- Add "Models Used" column — show distinct models called with this key (from UsageLog)
- Add "Last Model" badge showing most recently used model

**Usage History tab:**
- Add "Model" column (currently missing)
- Add "Provider" column (auto-derived, for info)
- Add "Cache Hit" indicator (⚡ icon when request was served from cache)
- Add "Guardrail" indicator (🛡 icon when a guardrail was triggered)

**NEW: Gateway Status card** (in the stats row at top of Dashboard):
- Cache hit rate (last 24hr)
- Guardrails triggered (last 24hr)
- Active fallbacks (any degraded providers right now)

### Playground
- Remove "API Key" input field at top — use the user's active rental key automatically (from auth)
- Add **Model Selector** dropdown — list all gateway-supported models (from `/v1/models`)
- Add **Fallback indicator**: small badge showing "Fallback used" if the response came from a fallback model
- Add **Cache indicator**: "⚡ Served from cache" badge when response was cached
- Add **Guardrail log panel** (collapsible): show which guardrails ran and their result

### Admin Panel
**New sections to add:**

**Routing & Fallbacks:**
- Per-model fallback priority table (drag to reorder)
- Provider health status (key pool size, error rate, last success)
- "Test routing" button — enter a model name, see which key/provider would be selected

**Guardrails Config:**
- Toggle each middleware on/off (TokenEstimator, PIIDetector, InjectionDetector, ContentModerator, PIIScrubber, ToxicityFilter)
- ContentModerator: set threshold, set which tiers it applies to
- PII patterns: add/remove custom regex patterns

**Cache Stats:**
- Hit rate graph (24hr)
- Saved tokens counter (tokens served from cache)
- Top cached prompts (anonymized, last_message hash + count)
- "Flush cache" button

---

## Implementation Phases

### Phase 1 — Router + Fallbacks (backend)
1. `backend/services/router.py` — model→provider map + key pool + fallback chain
2. Update `backend/api/proxy.py` — use Router
3. Update `backend/config.py` — fallback map, default model
4. DB migration — `Plan.model_id` and `Plan.provider` nullable

### Phase 2 — Middleware Guardrails
5. `backend/middleware/guardrails/base.py` — `GuardrailMiddleware` ABC + `RequestContext`
6. `backend/middleware/guardrails/token_estimator.py`
7. `backend/middleware/guardrails/pii_detector.py` (refactor from prompt_filter.py)
8. `backend/middleware/guardrails/injection_detector.py`
9. `backend/middleware/guardrails/content_moderator.py`
10. `backend/middleware/guardrails/output/pii_scrubber.py`
11. `backend/middleware/guardrails/output/toxicity_filter.py`
12. `backend/middleware/guardrails/pipeline.py` — runs the chain
13. Wire pipeline into `proxy.py`

### Phase 3 — Cache
14. `backend/services/cache.py` — extract + improve semantic cache
15. Add cache hit metadata to response headers (`X-Cache: HIT`, `X-Cache-Model`)
16. Cache stats endpoint for admin

### Phase 4 — Marketplace UI
17. Remove provider step from Marketplace.jsx
18. Add "Supported Models" collapsible table
19. Update checkout summary

### Phase 5 — Dashboard + Playground UI
20. Dashboard: add Models Used, cache/guardrail indicators
21. Dashboard: Gateway Status card
22. Playground: auto-use rental key, add fallback/cache badges, guardrail log panel

### Phase 6 — Landing Page + Admin UI
23. Landing page: gateway positioning, code snippet, models table
24. Admin: Routing & Fallbacks section
25. Admin: Guardrails config toggles
26. Admin: Cache stats dashboard

---

## Files Touched

| File | Change |
|---|---|
| `backend/services/router.py` | NEW |
| `backend/middleware/guardrails/` | NEW directory (7 files) |
| `backend/services/cache.py` | NEW (extracted) |
| `backend/api/proxy.py` | REFACTOR |
| `backend/config.py` | ADD flags |
| `backend/database/models.py` | MIGRATE |
| `backend/main.py` | DB migration entries |
| `frontend/src/pages/LandingPage.jsx` | REDESIGN hero + features |
| `frontend/src/pages/Marketplace.jsx` | REMOVE provider step |
| `frontend/src/pages/Dashboard.jsx` | ADD gateway stats + model columns |
| `frontend/src/pages/Playground.jsx` | ADD model selector + badges |
| `frontend/src/pages/AdminPanel.jsx` | ADD routing/guardrails/cache sections |

---

## Key Decisions

**Why middleware pattern for guardrails?**
Each guardrail is independently testable, togglable without code changes, and new ones can be added by dropping a class — no modifications to `proxy.py`. LangChain proved this pattern works at scale.

**Why remove provider choice from users?**
Gateway abstraction is the point. Users buy tokens; the gateway routes optimally. Advanced users still control the model via the `model` field — that's enough.

**Why shared semantic cache?**
Only applied to `temperature=0` (deterministic) prompts. Same question = same answer — caching it once is safe and saves cost for everyone.

**Backward compatibility**
Existing virtual keys continue to work. Existing rentals expire naturally. No data migration needed — only schema additions (nullable fields).
