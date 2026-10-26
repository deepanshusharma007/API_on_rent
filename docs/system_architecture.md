# AIRent - System Architecture

> Full technical reference for the AI API rental platform.
> Keep this in sync when adding services, routes, or DB models.

---

## High-Level Overview

```
+------------------------------------------------------------------+
|                     Frontend (React + Vite)                      |
|   Marketplace  Dashboard  Playground  AdminPanel  StatusPage     |
+---------------------------+--------------------------------------+
                            | HTTPS / REST / WebSocket
+---------------------------v--------------------------------------+
|                      Backend (FastAPI)                           |
|                                                                  |
|   CORS Middleware -> Request Logger                              |
|                                                                  |
|   /auth/*        Auth API         register, login, me           |
|   /api/*         Marketplace API  plans, rentals, providers     |
|   /api/*         Payment API      checkout, webhooks, invoice   |
|   /admin/*       Admin API        users, keys, analytics        |
|   /v1/*          Proxy API        chat/completions, models      |
|   /status/*      Status API       health, provider status       |
|   /ws/*          WebSocket        real-time token usage         |
+------+--------------------+------------------------+------------+
       |                    |                        |
+------v------+   +---------v-------+   +-----------v-----------+
|   Core      |   |   Data Layer    |   |  Background Workers   |
|   Services  |   |                 |   |                       |
|             |   |  PostgreSQL /   |   |  Expiration Monitor   |
|  Key LB     |   |  SQLite         |   |  Spending Monitor     |
|  Capacity   |   |                 |   |  Capacity Reconciler  |
|  Sem Cache  |   |  Redis /        |   |  Cost Protection      |
|  Circuit Br |   |  FakeRedis      |   |                       |
|  Fallback   |   +-----------------+   +-----------------------+
|  PII Masker |
|  Prompt Flt |
|  Cost Est   |
+------+------+
       |
+------v--------------------------------------+
|          External APIs                      |
|  OpenAI . Anthropic . Google Gemini         |
|  Cashfree (payments)                        |
+---------------------------------------------+
```

---

## Directory Structure

```
backend/
├── api/
│   ├── admin.py          # Admin CRUD: users, plans, provider keys, analytics
│   ├── auth.py           # Register, login, /me
│   ├── dependencies.py   # get_current_user, get_admin_user FastAPI deps
│   ├── marketplace.py    # Plans, active-providers, rentals
│   ├── payment.py        # Cashfree checkout, webhook, invoice
│   ├── proxy.py          # /v1/chat/completions - full proxy pipeline
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── status.py         # Health check, provider status
│   └── websocket.py      # WS /ws/usage/{rental_id}
├── database/
│   ├── connection.py     # SQLAlchemy engine + SessionLocal + Base
│   ├── models.py         # All ORM models (see Data Models section)
│   └── redis_manager.py  # RedisManager: virtual keys, rate limit, token balance
├── services/
│   ├── auth_utils.py         # hash_password, verify_password, create_jwt
│   ├── capacity_manager.py   # Token/RPM reservation + overbooking
│   ├── circuit_breaker.py    # Per-provider failure tracking (Redis)
│   ├── cost_estimator.py     # Published per-model prices -> UsageLog.cost_usd
│   ├── cache.py              # Redis response cache (temperature=0 only)
│   ├── router.py             # Model catalogue, provider key pool, fallback chains
│   ├── drain_rate.py         # Per-model token multipliers
│   ├── email_service.py      # SMTP: key delivery, alerts
│   └── virtual_key_service.py  # create_rental: generate vk_xxx, store in Redis+DB
├── workers/
│   ├── capacity_reconciler.py  # Periodically sync Redis capacity vs DB
│   ├── cost_protection.py      # Hard-stop if provider spend exceeds budget
│   ├── expiration_monitor.py   # Expire rentals, release capacity
│   └── spending_monitor.py     # Per-user spend alerts + auto-suspend
├── config.py             # Pydantic Settings (reads .env)
└── main.py               # App entry, lifespan (migrations + workers + seed)

frontend/src/
├── api/client.js         # Axios instance + all API call helpers
├── components/           # Navbar, Footer, TokenProgressBar, CountdownTimer
├── lib/
│   ├── motion.jsx        # Framer Motion animation presets
│   └── providerMeta.jsx  # Provider logos, names, colors
├── pages/                # One file per route
├── store/authStore.js    # Zustand: user, token, login/logout
└── i18n/index.js         # i18n strings
```

---

## Data Models

```
User
  id, email, hashed_password
  role: USER | ADMIN
  is_active, created_at, updated_at
  -> Rental (1:many)
  -> Transaction (1:many)
  -> SpendingAlert (1:many)

Plan
  id, name, description
  price (INR, float)
  duration_minutes, token_cap, rpm_limit
  drain_rate_multiplier
  model_id (nullable - NULL = all models for this provider)
  duration_label (e.g. "1 hour"), is_active
  -> Rental (1:many)

Rental
  id, user_id -> User, plan_id -> Plan
  virtual_key (vk_xxx, unique)
  status: ACTIVE | EXPIRED | PAUSED | SUSPENDED
  tokens_used, tokens_remaining, requests_made
  ip_address (locked after first use)
  started_at, expires_at
  -> UsageLog (1:many)

ProviderKey
  id
  provider: openai | gemini | anthropic
  api_key, is_active
  token_budget      <- admin-set monthly token limit (0 = unlimited)
  tokens_consumed   <- actual tokens used; load balancer routes to key with most remaining
  usage_count, last_used_at

Transaction
  id, user_id -> User, rental_id -> Rental
  amount (INR), description
  cashfree_order_id  <- idempotency key (unique) for webhook dedup

UsageLog
  id, rental_id -> Rental
  model, tokens_used, credits_consumed, cost_usd, was_cached

CacheHit
  id, rental_id -> Rental
  prompt_hash, similarity_score, tokens_saved, cost_saved_usd

SpendingAlert
  id, user_id -> User
  amount_usd, window_minutes, was_suspended

CircuitBreakerEvent
  id, provider, event_type (trip | recover | failure), error_message
```

---

## API Routes

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login -> JWT |
| GET | `/api/plans` | List active plans |
| GET | `/api/active-providers` | Providers with at least one active key |
| POST | `/api/webhooks/cashfree` | Cashfree payment webhook |
| GET | `/status/` | Platform health |

### Authenticated (JWT Bearer)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current user info |
| POST | `/api/checkout/session` | Create Cashfree payment order |
| GET | `/api/checkout/verify/{order_id}` | Verify payment status after redirect |
| GET | `/api/rentals/active` | Active rentals |
| GET | `/api/rentals/history` | Rental history |
| GET | `/api/invoice/{rental_id}` | JSON invoice |
| GET | `/api/invoice/{rental_id}/html` | Printable HTML receipt |
| POST | `/v1/chat/completions` | LLM proxy (uses virtual key as Bearer, not JWT) |
| GET | `/v1/models` | Available models list |
| WS | `/ws/usage/{rental_id}` | Real-time token balance updates |

### Admin (ADMIN role required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | All users |
| GET/POST/PUT/DELETE | `/admin/plans` | Manage plans |
| GET/POST/PUT/DELETE | `/admin/provider-keys` | Manage provider API keys + budgets |
| GET | `/admin/stats` | Platform analytics |
| GET | `/admin/rentals` | All rentals |

---

## Proxy Pipeline (Step-by-Step)

```
POST /v1/chat/completions
  Authorization: Bearer vk_xxx

  1 - Virtual key validation
      Redis HGETALL -> rental_id, user_id, provider, rpm_limit, expires_at
      Missing/expired -> 402

  2 - Provider validation
      infer_provider(model) must match rental.provider
      Mismatch -> 403

  3 - Per-user rate limit
      Redis sliding window: rental:{id}:rpm_window
      Exceeded -> 429

  4 - Global rate limit
      Redis sliding window: global - 500 RPM platform cap
      Exceeded -> 503

  5 - IP pinning
      First use: SET rental:{id}:ip {client_ip}
      Subsequent: compare -> mismatch -> 403

  6 - Guardrails (middleware/guardrails/)
      Balance check in credits (tokens x drain rate), PII redaction (emails, phones,
      SSNs, Luhn-valid cards, IPs), prompt-injection patterns. List-form content is
      handled like string content. Blocked -> 400 / 402

  7 - Cache lookup (temperature=0 requests only)
      Key = user + model + full request. Hit: deduct credits, skip the provider call

  8 - Route + circuit breaker + fallback
      Key pool: least-recently-used active key whose token budget is not spent
      Breaker trips at 5 provider failures (not caller errors: 400/413/422), 60s recovery
      Fallback chain per model; billing uses the model that actually answered

  9 - LiteLLM call
      Streaming (SSE) or non-streaming
      Client disconnect detection -> cancels upstream call mid-stream

  10 - Accounting
       Redis: deduct rental credit balance (tokens x drain_rate)
       DB: Rental counters (atomic SQL increments) + UsageLog with real cost_usd
       Platform spend tracker (capacity:budget:spent) for the admin budget view

  11 - Cache response (temperature=0 only)
```

---

## Payment Flow

```
1. User selects provider + plan -> clicks "Rent now"
   Frontend guard: if (purchasing) return   <- blocks double-click before state update
   Button: disabled + pointerEvents:none while purchasing=true

2. POST /api/checkout/session {plan_id, provider}
   a. Plan lookup + is_active check
   b. Capacity check: tokens + RPM available?
   c. Redis SET NX checkout_lock:{user_id}:{plan_id}:{provider}  TTL=300s
      Already locked -> 429 "payment already in progress"
   d. Create Cashfree order -> return {payment_session_id, order_id, cf_order_id}

3. Frontend: Cashfree JS SDK opens payment sheet
   User pays via UPI / card / wallet

4. Cashfree fires PAYMENT_SUCCESS_WEBHOOK -> POST /api/webhooks/cashfree
   a. Verify HMAC-SHA256 signature (x-webhook-timestamp + body)
   b. Idempotency: query Transaction WHERE cashfree_order_id = order_id
      Duplicate -> return {status: "already_processed"}
   c. Write Transaction record
   d. create_rental() -> generate vk_xxx, store in Redis + DB
   e. Reserve capacity (tokens + RPM in Redis)
   f. Email virtual key to user (best-effort, non-blocking)

5. User redirected to /dashboard?order_id=...&payment=success
   Frontend: GET /api/checkout/verify/{order_id} to confirm status
```

---

## Provider Key Pool (`router.py`)

Each request uses the active `ProviderKey` for the provider that was used longest ago and
records the pick (`last_used_at`, `usage_count`), so keys rotate. A key with a non-zero
`token_budget` that has been spent (`tokens_consumed >= token_budget`) is skipped. Keys fall
back to the `*_API_KEYS` environment variables when the pool has none.

---

## Capacity Manager (`capacity_manager.py`)

Hybrid reservation to prevent overselling:
- **RPM**: hard-reserved per rental (sum must not exceed provider limit)
- **Tokens**: soft-reserved with 1.5x overbooking (`OVERBOOKING_RATIO`)
- `can_sell_plan()` called before every checkout
- Capacity released on rental expiry or suspension

---

## Response Cache (`cache.py`)

- Only `temperature: 0` requests are cached: an unset temperature means a different answer each time
- Key is scoped to the user and the full request (model, messages, parameters)
- Hit: the user still pays the drain-rate credits, the provider is not called

---

## Circuit Breaker (`circuit_breaker.py`)

- Per-provider failure counter in Redis (5-minute window from the first failure)
- Trips at `CIRCUIT_BREAKER_FAILURE_THRESHOLD` failures -> provider unavailable for `CIRCUIT_BREAKER_TIMEOUT_SECONDS`
- Only provider-side failures count; a request the provider rejected as invalid (400/413/422) does not
- The router consults the breaker to build the list of live providers

---

## Background Workers

| Worker | Interval | Function |
|--------|----------|----------|
| `expiration_monitor` | 60s | Marks expired rentals -> EXPIRED, releases Redis capacity |
| `spending_monitor` | 60s | Per-user spend in rolling window -> suspend + admin alert |
| `capacity_reconciler` | 5min | Reconciles Redis counters vs actual DB active rentals |
| `cost_protection` | 60s | Hard-stop new sales if provider USD spend exceeds budget cap |

---

## Redis Key Schema

```
vk:{virtual_key}                  HASH    rental_id, user_id, provider, rpm_limit, expires_at, tokens_remaining
rental:{id}:ip                    STRING  pinned IP
rental:{id}:rpm_window            ZSET    sliding window for per-user rate limit
global:rpm_window                 ZSET    platform-wide 500 RPM rate limit
checkout_lock:{uid}:{pid}:{prov}  STRING  "1", TTL=300s - duplicate order guard
capacity:tokens:reserved          STRING  int - total tokens sold
capacity:rpm:reserved             STRING  int - total RPM sold
capacity:budget:spent             STRING  float - total provider USD spent
capacity:config:{provider}        STRING  JSON {monthly_budget_usd, max_rpm, max_tokens}
cache:{prompt_hash}               STRING  JSON cached LLM response
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Virtual keys, not forwarded real keys | Users never see provider keys; we control access, billing, revocation |
| Redis for real-time data | TTLs, rate counters, token balances need sub-ms latency |
| LiteLLM for multi-provider | Single API surface for OpenAI/Anthropic/Gemini - simplifies fallback and key rotation |
| Least-recently-used key pool | Spreads load across provider keys; spent keys are skipped |
| Hybrid capacity reservation | Hard-reserve RPM (cannot overcommit), soft-reserve tokens with 1.5x overbooking |
| Per-model drain rates | GPT-4o costs 10x more than Gemini Flash - drain tokens proportionally to actual cost |
| Cashfree webhook idempotency | `cashfree_order_id` unique check prevents double-rentals from Cashfree retry storms |
| Redis SET NX checkout lock | 60s TTL stops duplicate Cashfree orders from rapid double-clicks; released if the attempt fails |
| IP pinning | Prevents key sharing - key locks to first-use IP after first request |
| Exact-match cache (temperature=0) | Repeat deterministic requests skip the provider; reduces provider API cost |
| Disconnect detection in streaming | Cancels upstream LiteLLM call if client drops mid-stream - saves tokens |

---

## Drain Rates

`credits_deducted = actual_tokens x drain_rate`

| Model | Drain Rate |
|-------|-----------|
| `gemini-1.5-flash` | 1x |
| `gpt-4o-mini` | 3x |
| `gemini-1.5-pro` | 5x |
| `claude-3-5-sonnet-20241022` | 8x |
| `gpt-4o` | 10x |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite or PostgreSQL connection string |
| `REDIS_URL` | No | Redis URL (FakeRedis used if unset) |
| `USE_FAKE_REDIS` | No | Force FakeRedis (true/false) |
| `SECRET_KEY` | Yes | JWT signing secret (long random string) |
| `ADMIN_EMAIL` | Yes | Auto-seeded admin account email |
| `ADMIN_PASSWORD` | Yes | Auto-seeded admin account password |
| `CASHFREE_CLIENT_ID` | Yes | Cashfree API client ID |
| `CASHFREE_CLIENT_SECRET` | Yes | Cashfree API secret |
| `CASHFREE_ENVIRONMENT` | Yes | sandbox or production |
| `CASHFREE_WEBHOOK_SECRET` | Yes | HMAC webhook signature verification |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (usually 587) |
| `SMTP_USER` | Yes | SMTP login email |
| `SMTP_PASSWORD` | Yes | SMTP app password |
| `ADMIN_NOTIFICATION_EMAIL` | No | Where spending alerts are sent |
| `FRONTEND_URL` | Yes | Cashfree return URL base |
| `BACKEND_URL` | Yes | Cashfree webhook notify URL |
| `VITE_API_URL` | Yes | Frontend to backend base URL |
| `VITE_CASHFREE_ENV` | Yes | sandbox or production |
| `OVERBOOKING_RATIO` | No | Token overbooking multiplier (default 1.5) |
| `PRE_REQUEST_COST_CHECK` | No | Enable pre-request token balance check (true/false) |
