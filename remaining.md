# ❌ What's Still Remaining

Items that cannot be completed without external accounts/resources.

---

## 1. Stripe — Needs Real Account

| Item | Severity | Details |
|------|----------|---------|
| Replace mock keys with real Stripe test keys | 🔴 Critical | `.env` has mock keys. Need real Stripe account to test payments end-to-end. |
| Stripe Customer creation on registration | 🟠 Low | Create `stripe.Customer` per user for payment history. |
| Invoice/receipt generation | 🟠 Low | Auto-generate receipts via Stripe Billing. |

## 2. FakeRedis → Real Redis Migration

| Item | Severity | Details |
|------|----------|---------|
| Install & run real Redis | 🔴 Critical | Docker Compose is ready (`docker compose up`), but needs Docker installed. |
| Set `USE_FAKE_REDIS=false` | 🔴 Critical | Flip flag after Redis is running. |
| Verify all Redis operations | 🔴 Critical | FakeRedis has subtle differences. |

## 3. Database — SQLite → PostgreSQL

| Item | Severity | Details |
|------|----------|---------|
| Switch to PostgreSQL | 🟡 Medium | Docker Compose has PG ready. Update `DATABASE_URL` in `.env`. |

## 4. Advanced Features

| Item | Status |
|------|--------|
| Vector similarity caching (embeddings + cosine) | ❌ Missing — hash-based cache works, no semantic matching |
| AI-powered prompt pre-scan (Gemini Flash) | ❌ Missing — regex-only filtering |
| Admin notification on cost threshold | ❌ Missing — logs warnings but no email/webhook |

## 5. Frontend Enhancements (Low Priority)

| Item | Priority |
|------|----------|
| Model selector in purchase flow | 🟠 Low |
| WebSocket real-time updates | 🟠 Low |
| Email notifications | 🟠 Low |
| Export to CSV (analytics) | 🟠 Low |
| Dark/light mode toggle | 🟠 Low |
| Multi-language (i18n) | 🟠 Low |

## 6. Testing Gaps

| Item | Status |
|------|--------|
| Frontend component tests | ❌ Missing |
| E2E browser tests (Playwright/Cypress) | ❌ Missing |
| Load/performance testing | ❌ Missing |

---

## ✅ Completed in This Session

- Admin refund endpoint (`POST /admin/refund/{transaction_id}`)
- Request/response logging middleware with `X-Request-ID` headers
- Reusable `CountdownTimer` component with per-second updates and urgency indicators
- Reusable `TokenProgressBar` component with color-coded usage levels
- Dashboard uses new components instead of inline logic
- Docker Compose (PostgreSQL + Redis + Backend + Frontend)
- Frontend Dockerfile (multi-stage with Nginx)
- GitHub Actions CI/CD pipeline
- System architecture documentation with Mermaid diagrams
- User guide with code examples
- Security audit checklist (30 items)
- Frontend API client updated with refund/capacity methods
