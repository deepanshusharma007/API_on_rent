# AIRent — AI API Rental Platform

Rent time-limited virtual API keys for top AI models — no provider accounts needed.
Pay once, get a key, start building.

**Owner:** Deepanshu Sharma — deepanshu2210sharma@gmail.com

---

## What It Does

Users visit the Marketplace, pick an AI model and a duration (15 min → 24 hours), pay once via Cashfree, and instantly receive a `vk_xxx` virtual key by email and on their dashboard. The key is OpenAI-compatible and works with any existing SDK or HTTP client. When the rental expires (time or token cap hit), the key stops working automatically.

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
│   ├── api/            # Route handlers (auth, marketplace, payment, proxy, admin)
│   ├── database/       # SQLAlchemy models + Redis helpers
│   ├── services/       # Business logic (virtual keys, email, spending monitor)
│   ├── config.py       # Pydantic settings (reads .env)
│   └── main.py         # App entry point, router mounts, DB migrations
├── frontend/
│   ├── src/
│   │   ├── api/client.js       # All Axios API helpers
│   │   ├── lib/providerMeta.jsx # Provider/model branding (logos, colors, labels)
│   │   ├── pages/              # Marketplace, Dashboard, Playground, Admin, etc.
│   │   └── store/authStore.js  # Zustand auth + JWT
│   └── index.html              # Cashfree JS SDK CDN tag
├── tests/test_core_flow.py     # Full integration test suite
├── .env.example                # Environment variable template
└── CLAUDE.md                   # Full architecture reference for AI agents
```

---

## Local Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd API_on_rent
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section below)
```

### 2. Backend

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start the dev server (auto-reloads on file changes)
uvicorn backend.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`.
Interactive Swagger docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # starts Vite dev server at http://localhost:5173
```

### 4. Verify everything works

```bash
# Run the full integration test suite (backend must be running on :8000)
python tests/test_core_flow.py
```

Expected: 63/64 tests pass. The 1 skipped test requires a real provider key with credits.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in each value:

```env
# Database
DATABASE_URL=sqlite:///./airent.db

# Redis (leave as-is for local dev — FakeRedis is used automatically)
REDIS_URL=redis://localhost:6379

# JWT secret (use a long random string in production)
SECRET_KEY=your-secret-key-here

# Cashfree payment gateway
CASHFREE_CLIENT_ID=your-client-id
CASHFREE_SECRET=your-secret
CASHFREE_ENVIRONMENT=sandbox           # or "production"
CASHFREE_WEBHOOK_SECRET=your-webhook-secret

# Transactional email (for virtual key delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your-app-password

# Admin alerts
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com

# Frontend (used by Vite)
VITE_API_URL=http://localhost:8000
VITE_CASHFREE_ENV=sandbox              # or "production"
```

---

## Admin Setup (first run)

After starting the backend for the first time:

1. **Register an account** at `http://localhost:5173/register`
2. **Promote to admin** — open a Python shell:
   ```python
   from backend.database.connection import SessionLocal
   from backend.database.models import User, UserRole
   db = SessionLocal()
   user = db.query(User).filter(User.email == "your@email.com").first()
   user.role = UserRole.ADMIN
   db.commit()
   ```
3. **Log in** — the Admin panel link appears in the navbar automatically.

### Add Provider API Keys

In Admin Panel → **API Keys** tab:
- Click **Add New Key**
- Select provider: `openai`, `gemini`, or `anthropic`
- Enter the real provider API key
- Optionally enter the model name this key is intended for (e.g. `gpt-4o-mini`)
- Click **Add Key**

Once at least one key is active, models appear in the Marketplace.

### Create Plans

In Admin Panel → **Plans** tab:
- Click **Add Plan**
- Select model + duration — token cap and price are auto-suggested
- Adjust as needed and save

Each `model × duration` combination is its own plan. Create one for each combination you want to offer.

---

## API Reference

### Authentication

All user endpoints require a `Bearer` JWT token in the `Authorization` header.
Get a token by calling `POST /auth/login`.

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
# Response: { "access_token": "eyJ...", "token_type": "bearer" }
```

### Get Available Plans

```bash
curl http://localhost:8000/api/plans
```

Response:
```json
[
  {
    "id": 1,
    "name": "GPT-4o Mini · 1 Hour",
    "model_id": "gpt-4o-mini",
    "duration_minutes": 60,
    "duration_label": "1 hour",
    "token_cap": 26666,
    "rpm_limit": 40,
    "price": 4.99,
    "is_active": true
  }
]
```

### Get Active Providers

```bash
curl http://localhost:8000/api/active-providers
# Response: { "providers": ["openai", "gemini"] }
```

Only providers with at least one active API key are returned.
This is the same endpoint the frontend uses to decide which models to show.

### Create Checkout Session

```bash
curl -X POST http://localhost:8000/api/checkout/session \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"plan_id": 1}'
# Response: { "payment_session_id": "session_...", "order_id": "order_..." }
```

Use `payment_session_id` with the Cashfree JS SDK to open the payment sheet.

### Use Your Virtual Key

Once payment is complete, you receive a `vk_xxx` key via email and dashboard.
Use it exactly like an OpenAI API key — just point the base URL at this proxy:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer vk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 500
  }'
```

**Python (OpenAI SDK):**
```python
from openai import OpenAI

client = OpenAI(
    api_key="vk_your_key_here",
    base_url="http://localhost:8000/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=500
)
print(response.choices[0].message.content)
```

**Node.js (OpenAI SDK):**
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'vk_your_key_here',
  baseURL: 'http://localhost:8000/v1',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 500,
});
console.log(response.choices[0].message.content);
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

## How the Proxy Works

```
POST /v1/chat/completions  (Authorization: Bearer vk_xxx)
  1. Validate virtual key (Redis cache → DB fallback)
  2. Check rental: ACTIVE status + tokens_remaining > 0 + not expired
  3. IP-pin check (key locks to first IP that uses it)
  4. PII filter — auto-redacts emails, phones, SSNs, card numbers
  5. AI safety pre-scan (Gemini Flash)
  6. Semantic cache lookup (95% similarity threshold)
  7. Forward to provider via LiteLLM
  8. Deduct tokens, log to UsageLog
  9. Return / stream response
```

---

## Error Codes

| HTTP | Meaning |
|---|---|
| `401` | Missing or invalid JWT / virtual key |
| `402` | Rental expired or token cap reached |
| `403` | IP address mismatch (key used from different IP) |
| `429` | RPM limit exceeded |
| `503` | Provider API error or all providers down |

---

## Running Tests

```bash
# Full core flow test (no pytest needed — plain Python)
python tests/test_core_flow.py

# Test with a real provider key to validate live proxy
TEST_OPENAI_KEY=sk-... python tests/test_core_flow.py
```

Tests cover: registration, login, active-providers, plan creation, rental purchase, virtual key format, proxy (valid/invalid/missing key), token deduction, admin stats, and cleanup.

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions including:
- Switching SQLite → PostgreSQL
- Connecting a real Redis instance
- Setting `CASHFREE_ENVIRONMENT=production`
- Configuring CORS for your domain
- Running with `gunicorn` behind nginx

---

## Adding a New AI Model

1. In `backend/database/models.py` — add to `ProviderType` enum if it's a new provider
2. In `frontend/src/lib/providerMeta.jsx` — add an entry to `MODEL_META` with label, emoji, and colors (optional — unknown models auto-format)
3. In Admin Panel → add a ProviderKey for the provider
4. In Admin Panel → create plans for `model × each duration`

The model automatically appears in Marketplace, Playground, and Pricing once plans exist.
