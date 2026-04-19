# lean-ctx — Context Engineering Layer

PREFER lean-ctx MCP tools over native equivalents for token savings:

| PREFER | OVER | Why |
|--------|------|-----|
| `ctx_read(path)` | Read / cat / head / tail | Session caching, 8 compression modes, re-reads cost ~13 tokens |
| `ctx_shell(command)` | Bash (shell commands) | Pattern-based compression for git, npm, cargo, docker, tsc |
| `ctx_search(pattern, path)` | Grep / rg | Compact context, token-efficient results |
| `ctx_tree(path, depth)` | ls / find | Compact directory maps with file counts |

---

# AIRent — CLAUDE.md (compressed)

## Commands
```
uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev        # :5173
python tests/test_core_flow.py
```

## Critical Patterns

**DB migrations** — `create_all()` won't alter existing tables. New columns → add to migration list in `backend/main.py` lifespan:
```python
for col, col_type, tbl in [("col", "TYPE", "table")]:
    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type}"))
```

**Auth role** — populate via `authAPI.getMe()` after login. Check `user?.role === 'admin'`, never from JWT directly.

**Active providers** — query full ORM objects, not just column:
```python
keys = db.query(ProviderKey).filter(ProviderKey.is_active == True).all()
providers = list({k.provider.value if hasattr(k.provider, 'value') else k.provider for k in keys})
```

**Buy flow** — only `/marketplace` triggers purchase. All other pages link there.

**Windows terminal** — ASCII only in Python scripts (no →, ✓, box chars). Add `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` if needed.

## Structure
```
backend/api/         admin.py auth.py marketplace.py payment.py proxy.py
backend/database/    models.py connection.py redis_manager.py
backend/services/    virtual_key_service.py capacity_manager.py email_service.py prompt_filter.py
backend/config.py    backend/main.py
frontend/src/api/    client.js
frontend/src/pages/  Marketplace.jsx AdminPanel.jsx Dashboard.jsx Playground.jsx
frontend/src/lib/    providerMeta.jsx motion.js
frontend/src/store/  authStore.js
```

## Env Vars
`DATABASE_URL` `REDIS_URL` `SECRET_KEY`
`CASHFREE_CLIENT_ID` `CASHFREE_CLIENT_SECRET` `CASHFREE_ENVIRONMENT` `CASHFREE_WEBHOOK_SECRET`
`SMTP_HOST/PORT/USER/PASSWORD` `ADMIN_NOTIFICATION_EMAIL`
`VITE_API_URL` `VITE_CASHFREE_ENV`

## DB Models (key fields only)

**Plan:** `price` `duration_minutes` `token_cap` `rpm_limit` `model_id(nullable)` `duration_label(nullable)` `is_active`
**Rental:** `virtual_key` `status` `tokens_used/remaining` `ip_address` `started_at` `expires_at`
**ProviderKey:** `provider(ProviderType)` `api_key` `is_active`
**Enums:** `UserRole(USER|ADMIN)` `RentalStatus(ACTIVE|EXPIRED|PAUSED|SUSPENDED)` `ProviderType(openai|gemini|anthropic)`

## Plans — Universal Duration Tiers (no model_id)
| Duration | Token cap |
|---|---|
| 15 min | 20K |
| 30 min | 40K |
| 1 hour | 80K |
| 24 hours | 1.2M |

## Drain rates (proxy.py `get_drain_rate`)
`gemini-1.5-flash`=1× `gpt-4o-mini`=3× `gemini-1.5-pro`=5× `claude-3-5-sonnet-20241022`=8× `gpt-4o`=10×

## Payment (Cashfree)
order_id format: `order_{plan_id}_{user_id}_{provider}_{unix_ts}`
Flow: `POST /api/checkout/session` → `payment_session_id` → Cashfree SDK → webhook `PAYMENT_SUCCESS_WEBHOOK` → create Rental + email key

## Proxy flow
`POST /v1/chat/completions` Bearer vk_xxx → Redis key lookup → provider validation → rate limit → IP-pin → PII filter → AI pre-scan → semantic cache → LiteLLM → deduct tokens → log

## Marketplace flow (3 steps)
1. GET `/api/active-providers` → show provider cards
2. GET `/api/plans` → show duration plans
3. Review → `POST /api/checkout/session {plan_id, provider}` → Cashfree

## API Routes (key ones)
Public: `GET /api/plans` `GET /api/active-providers` `POST /api/webhooks/cashfree`
Auth: `POST /api/checkout/session` `GET /api/rentals/active` `POST /v1/chat/completions`
Admin: `/admin/*` all behind `role=ADMIN`

## Frontend Design Tokens
bg=`#07070f` primary=`violet-600→fuchsia-600` success=`emerald-400` danger=`rose-400`
`.glass-card` `.gradient-text` `.grid-pattern` `.blob-1/2/3`

## code-review-graph MCP (use BEFORE Grep/Glob/Read)
`semantic_search_nodes` `query_graph` `get_impact_radius` `detect_changes` `get_review_context` `get_affected_flows` `get_architecture_overview`

## Symdex — symbol index (404 symbols, 35 routes)
Repo: `api_on_rent-master-d88f663e` | State: `.symdex/`
```
symdex search <name>                          # find function/class by name
symdex find <name>                            # exact symbol lookup
symdex outline backend/api/proxy.py           # all symbols in a file
symdex callers create_rental                  # who calls this function
symdex callees chat_completions               # what this function calls
symdex routes api_on_rent-master-d88f663e     # all 35 HTTP routes
symdex text <keyword>                         # text search across codebase
symdex invalidate --state-dir .symdex .       # re-index after big changes
```
Re-index when: new files added, functions renamed, routes added.
