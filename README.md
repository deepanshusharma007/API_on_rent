# AIRent — AI API Rental Platform

Rent time-limited virtual API keys for top AI models — no provider accounts needed.
Pay once, get a key, start building.

**Owner:** Deepanshu Sharma — deepanshu2210sharma@gmail.com
**Live:** [api-on-rent.pages.dev](https://api-on-rent.pages.dev)

---

## What It Does

Users visit the Marketplace, pick an AI provider and a duration (15 min → 24 hours), pay once via Cashfree (UPI/cards/wallets), and instantly receive a `vk_xxx` virtual key by email and on their dashboard. The key is OpenAI-compatible and works with any existing SDK or HTTP client. When the rental expires (time or token cap hit), the key stops working automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.10+) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Cache / Rate limit | Redis (FakeRedis in dev) |
| AI proxy | LiteLLM |
| Payments | Cashfree |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT (HS256) + bcrypt |

---

## Project Structure

```
API_on_rent/
├── backend/
│   ├── api/             # Route handlers: auth, marketplace, payment, proxy, admin, status, websocket
│   ├── database/        # SQLAlchemy models, Redis manager, DB connection
│   ├── services/        # Business logic: key load balancer, capacity, semantic cache, PII, prompt filter
│   ├── workers/         # Background tasks: expiration monitor, spending monitor, cost protection
│   ├── config.py        # Pydantic settings (reads .env)
│   └── main.py          # App entry point, router mounts, DB migrations
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # All Axios API helpers
│   │   ├── lib/providerMeta.jsx # Provider branding (logos, labels)
│   │   ├── pages/               # Marketplace, Dashboard, Playground, Admin, etc.
│   │   └── store/authStore.js   # Zustand auth + JWT
│   └── index.html               # Cashfree JS SDK CDN tag
├── docs/
│   ├── system_architecture.md   # Full system architecture reference
│   ├── user_guide.md            # End-user guide
│   └── security_checklist.md   # Security hardening checklist
├── tests/test_core_flow.py      # Integration test suite
├── scripts/                     # Admin/seed helper scripts
├── docker-compose.yml           # PostgreSQL + Redis + Backend + Frontend
├── .env.example                 # Environment variable template
└── CLAUDE.md                    # Architecture reference for AI agents
```

---

## Local Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd API_on_rent
cp .env.example .env
# Edit .env with your credentials
```

### 2. Backend

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

API live at `http://localhost:8000` — Swagger docs at `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### 4. Run tests

```bash
python tests/test_core_flow.py
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
# Database
DATABASE_URL=sqlite:///./airent.db

# Redis (FakeRedis used automatically in dev when REDIS_URL is unset)
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your-secret-key-here

# Cashfree
CASHFREE_CLIENT_ID=your-client-id
CASHFREE_CLIENT_SECRET=your-client-secret
CASHFREE_ENVIRONMENT=sandbox           # or "production"
CASHFREE_WEBHOOK_SECRET=your-webhook-secret

# Email (for virtual key delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your-app-password

# Admin account (auto-seeded on first startup)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-admin-password
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com

# URLs (used by Cashfree for redirects and webhooks)
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# Frontend (Vite)
VITE_API_URL=http://localhost:8000
VITE_CASHFREE_ENV=sandbox              # or "production"
```

---

## First-Run Admin Setup

The admin account is auto-seeded on startup using `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env`.

Log in at `http://localhost:5173/login` — the Admin link appears in the navbar automatically.

### Add Provider Keys (with token budget)

In Admin Panel -> **API Keys** tab:
- Select provider: `openai`, `gemini`, or `anthropic`
- Enter the provider API key
- Set **Token Budget** — monthly token allowance for this key (e.g. `2000000`). Set `0` for unlimited.

You can add multiple keys per provider. The load balancer automatically routes traffic to the key with the most remaining token budget.

### Create Plans

In Admin Panel -> **Plans** tab. Recommended tiers:

| Duration | Token cap |
|---|---|
| 15 min | 20K |
| 30 min | 40K |
| 1 hour | 80K |
| 24 hours | 1.2M |

---

## API Reference

### Authentication

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'

# Login - returns JWT
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
```

### Get Plans & Providers

```bash
curl http://localhost:8000/api/plans
curl http://localhost:8000/api/active-providers
```

### Create Checkout Session

```bash
curl -X POST http://localhost:8000/api/checkout/session \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"plan_id": 1, "provider": "openai"}'
# Returns: { "payment_session_id": "...", "order_id": "..." }
```

Use `payment_session_id` with the Cashfree JS SDK to open the payment sheet.

### Use Your Virtual Key

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer vk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello!"}]}'
```

**Python (OpenAI SDK):**
```python
from openai import OpenAI

client = OpenAI(api_key="vk_your_key_here", base_url="http://localhost:8000/v1")
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

**Node.js:**
```javascript
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: 'vk_your_key_here', baseURL: 'http://localhost:8000/v1' });
const res = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

**Streaming:**
```python
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

---

## Proxy Pipeline

```
POST /v1/chat/completions  (Bearer vk_xxx)
  1.  Validate virtual key        Redis -> 402 if expired/invalid
  2.  Provider validation         key must match rented provider -> 403
  3.  Per-user rate limit         RPM cap -> 429
  4.  Global rate limit           500 RPM platform cap -> 503
  5.  IP pinning                  locks to first-use IP -> 403 on mismatch
  6.  PII filter                  auto-redacts emails, phones, SSNs, cards
  7.  AI safety pre-scan          Gemini Flash - blocks jailbreaks/abuse
  8.  Semantic cache              95% cosine similarity -> return cached, skip provider
  9.  Load-balanced key select    picks provider key with most remaining token budget
  10. Circuit breaker + fallback  auto-failover across provider keys/models
  11. Forward via LiteLLM
  12. Deduct tokens (rental balance + provider key budget)
  13. Log to UsageLog
  14. Cache response for future hits
```

---

## Error Codes

| HTTP | Meaning |
|---|---|
| `401` | Missing or invalid JWT / virtual key |
| `402` | Rental expired or token cap reached |
| `403` | IP address mismatch or wrong provider for this key |
| `429` | RPM limit exceeded or duplicate checkout in progress |
| `503` | Provider API error or all providers down |

---

## Drain Rates

Tokens deducted = `actual_tokens x drain_rate`. Expensive models drain the cap faster.

| Model | Multiplier |
|---|---|
| `gemini-1.5-flash` | 1x |
| `gpt-4o-mini` | 3x |
| `gemini-1.5-pro` | 5x |
| `claude-3-5-sonnet-20241022` | 8x |
| `gpt-4o` | 10x |

---

## Running Tests

```bash
# Full integration test (backend must be running on :8000)
python tests/test_core_flow.py

# With a real provider key to test live proxy
TEST_OPENAI_KEY=sk-... python tests/test_core_flow.py
```

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions:
- SQLite -> PostgreSQL
- Real Redis instance
- `CASHFREE_ENVIRONMENT=production`
- CORS config for your domain
- Gunicorn + nginx or Render/Railway

---

## Further Reading

- [docs/system_architecture.md](docs/system_architecture.md) - full architecture, data models, proxy pipeline, design decisions
- [docs/user_guide.md](docs/user_guide.md) - end-user guide
- [docs/security_checklist.md](docs/security_checklist.md) - security hardening checklist
- [DEPLOYMENT.md](DEPLOYMENT.md) - production deployment guide
