# AIRent — Gateway Architecture

## Vision

Transform AIRent from a "pick-your-provider" rental model into a **transparent AI gateway** — users buy access by duration/token tier, send requests to a single endpoint, and the gateway handles everything: routing, fallbacks, caching, and guardrails. The experience mirrors LiteLLM Proxy but with a rental/billing layer on top.

---

## What Changes

### Before (current model)
1. User browses providers (OpenAI, Anthropic, Gemini)
2. User picks a provider + plan
3. Gets a virtual key locked to that provider
4. Hits `/v1/chat/completions` — proxy forwards to that one provider only

### After (gateway model)
1. User browses **plans** (15 min / 1 hr / 24 hr tiers — no provider choice)
2. Gets a virtual key that works with **any supported model**
3. Hits `/v1/chat/completions` with any `model` field (e.g. `gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-pro`)
4. Gateway routes to the right provider, falls back on failure, applies guardrails, serves from cache

---

## Core Components

### 1. Router
**File:** `backend/services/router.py` (new)

Decides which provider+key handles a request:
- Parse `model` from request body
- Map model → provider (e.g. `gpt-4o` → `openai`, `claude-*` → `anthropic`)
- If model is unknown or omitted → use a **default model** (configured per plan tier or globally)
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
  gpt-4o        → gpt-4o-mini → gemini-1.5-pro
  claude-3-5-*  → claude-3-haiku → gpt-4o-mini
  gemini-1.5-pro → gemini-1.5-flash → gpt-4o-mini
  ```
- If all fallbacks fail → return 503 with clear error

### 3. Guardrails
**File:** `backend/services/guardrails.py` (refactor of `prompt_filter.py`)

Two layers:

**Input guardrails** (before sending to provider):
- PII detection (regex: emails, phone numbers, SSNs, credit cards)
- Prompt injection detection (jailbreak patterns)
- Content policy check (using a fast/cheap model as judge — `gemini-1.5-flash`)
- Token pre-check (estimate tokens, reject if would exceed rental cap)

**Output guardrails** (after receiving from provider):
- PII scrubbing from responses
- Toxic content flagging (log, don't block by default)

Config flags in `config.py`:
```
GUARDRAILS_PII_BLOCK=true
GUARDRAILS_INJECTION_BLOCK=true
GUARDRAILS_AI_SCAN=false        # off by default (costs tokens)
GUARDRAILS_OUTPUT_SCRUB=false   # off by default
```

### 4. Semantic Cache
**File:** `backend/services/cache.py` (refactor of existing cache in `proxy.py`)

- Hash: `(model, messages[-1].content, temperature==0)` → SHA256
- Store in Redis with TTL (default 1 hour, configurable)
- On cache hit: return cached response, deduct tokens from rental, skip provider call
- Cache is **per-platform** (shared across all users) — safe because it only caches deterministic requests (temp=0 or not set)
- Cache invalidation: TTL-based only

Cache key format: `cache:v1:{sha256_of_model_plus_last_message}`

### 5. Virtual Key — Provider-Agnostic
**File:** `backend/database/models.py` (update `Rental` + `Plan`)

Remove `provider` from Plan. A rental now grants access to the whole gateway.

Schema changes:
```
Plan:   drop  model_id, provider fields (or keep as optional hint)
        keep  duration_minutes, token_cap, rpm_limit, price
Rental: drop  provider field
        keep  virtual_key, tokens_used, tokens_remaining, expires_at
```

The `model` the user calls with is logged per-request in `UsageLog`, not locked at rental time.

---

## Request Lifecycle (new)

```
POST /v1/chat/completions
  Bearer: vk_xxx
        │
        ▼
[Auth] validate virtual key → get Rental → check expiry + tokens
        │
        ▼
[Rate Limit] per-key RPM (Redis) + global RPM
        │
        ▼
[Guardrails: Input] PII / injection / content scan
        │
        ▼
[Cache] check semantic cache → HIT: return cached, deduct tokens, done
        │ MISS
        ▼
[Router] model → provider → select api_key from pool
        │
        ▼
[LiteLLM] acompletion(model, messages, api_key)
        │ on failure → [Fallback] try next key / provider
        ▼
[Guardrails: Output] PII scrub (if enabled)
        │
        ▼
[Token Drain] deduct actual tokens from Rental
        │
        ▼
[Cache Write] store response if cacheable
        │
        ▼
[Usage Log] write to UsageLog (model used, tokens, latency, provider)
        │
        ▼
Return response to user
```

---

## Marketplace — What Changes

### Before
Step 1: Choose provider (OpenAI / Anthropic / Gemini cards)
Step 2: Choose plan for that provider
Step 3: Checkout

### After
Step 1: Choose plan (15 min / 1 hr / 24 hr — show supported models list)
Step 2: Checkout (no provider selection)

The "supported models" section replaces provider cards — show a table:
| Model | Provider | Speed | Best for |
|---|---|---|---|
| gpt-4o | OpenAI | Fast | General |
| claude-3-5-sonnet | Anthropic | Medium | Reasoning |
| gemini-1.5-flash | Google | Fastest | High volume |
| ... | | | |

This is derived from active `ProviderKey` records in the DB — if admin has no Anthropic keys, Anthropic models don't show.

---

## Admin Panel — What Changes

- Remove "provider" from plan creation form
- Add **Fallback Config** section: drag-and-drop priority order per model family
- Add **Guardrails Config** section: toggle PII/injection/AI-scan on/off
- Add **Cache Stats** section: hit rate, saved tokens, top cached prompts
- Routing health: show per-provider key pool status (active keys, last used, error rate)

---

## Implementation Phases

### Phase 1 — Router + Fallbacks (backend only)
1. `backend/services/router.py` — model→provider mapping + key pool + fallback chain
2. Update `backend/api/proxy.py` — use Router instead of hardcoded provider logic
3. Update `backend/config.py` — add fallback map, default model config
4. DB migration — make `Plan.model_id` and `Plan.provider` optional (already nullable?)

### Phase 2 — Guardrails cleanup
5. Refactor `prompt_filter.py` → `guardrails.py` with input + output layers
6. Add config flags to enable/disable each guardrail
7. Wire into proxy request lifecycle

### Phase 3 — Cache improvement
8. Extract cache logic from `proxy.py` into `cache.py`
9. Add per-model TTL config
10. Add cache stats endpoint for admin

### Phase 4 — Marketplace UI
11. Remove provider selection step
12. Add "Supported Models" table to plan selection page
13. Update checkout flow (no provider field)

### Phase 5 — Admin UI
14. Fallback config UI
15. Guardrails toggle UI
16. Cache stats dashboard

---

## Files Touched

| File | Change |
|---|---|
| `backend/services/router.py` | NEW — routing + fallback engine |
| `backend/services/guardrails.py` | NEW (refactor prompt_filter.py) |
| `backend/services/cache.py` | NEW (extract from proxy.py) |
| `backend/api/proxy.py` | REFACTOR — use router + guardrails + cache services |
| `backend/config.py` | ADD fallback map, guardrail flags, cache TTL |
| `backend/database/models.py` | MIGRATE — make provider/model_id optional on Plan |
| `backend/main.py` | DB migration additions |
| `frontend/src/pages/Marketplace.jsx` | REDESIGN — remove provider step |
| `frontend/src/pages/AdminPanel.jsx` | ADD fallback/guardrail/cache sections |

---

## Key Decisions

**Why remove provider choice from users?**
Gateway abstraction is the point — users shouldn't need to know or care which provider runs their request. They buy tokens; we route optimally.

**Why keep model choice?**
Model choice is a legitimate UX need — a user building a coding assistant may specifically want Claude, while another wants GPT-4o. We support `model` in the request body (OpenAI-compatible) so existing integrations just work.

**Why shared cache and not per-user?**
Semantic caching is only applied to deterministic prompts (temperature=0). The same question asked by two users should return the same answer — caching it once saves provider cost for everyone. No privacy risk for temperature=0 prompts.

**Backward compatibility**
Existing virtual keys continue to work. The proxy accepts requests without a `model` field and falls back to a default. Existing rentals are not migrated — they expire naturally.
