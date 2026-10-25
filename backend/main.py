"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.middleware.logging_middleware import RequestLoggingMiddleware
import logging

from backend.database.connection import engine, Base, SessionLocal
from backend.config import settings
from backend.database.redis_manager import init_redis, close_redis
from backend.api import auth, marketplace, admin, proxy, status, payment, websocket
from backend.workers.spending_monitor import start_spending_monitor, stop_spending_monitor
from backend.workers.expiration_monitor import expiration_monitor
from backend.workers.capacity_reconciler import capacity_reconciler
from backend.workers.cost_protection import cost_protection_worker
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


WEAK_JWT_SECRETS = {"change-me-in-production", "secret", "test-secret-key", "test-jwt-secret"}


def _check_jwt_secret() -> None:
    """A guessable JWT secret lets anyone mint an admin token. Refuse to start in production
    with one; elsewhere just warn."""
    secret = settings.JWT_SECRET
    if len(secret) >= 32 and secret.lower() not in WEAK_JWT_SECRETS:
        return
    message = "JWT_SECRET is weak (use at least 32 random characters, e.g. `openssl rand -hex 32`)"
    if settings.ENVIRONMENT == "production":
        raise RuntimeError(message)
    logger.warning(message)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("🚀 Starting application...")
    
    _check_jwt_secret()

    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")

    # Apply safe column migrations (idempotent — skips columns that already exist)
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        for col, col_type, tbl in [
            ("model_id",          "VARCHAR(100)", "plans"),
            ("duration_label",    "VARCHAR(50)",  "plans"),
            ("cashfree_order_id", "VARCHAR(200)", "transactions"),
            ("token_budget",      "INTEGER DEFAULT 0", "provider_keys"),
            ("tokens_consumed",   "INTEGER DEFAULT 0", "provider_keys"),
            # Gateway additions
            # Per-user gateway config
            ("allowed_models",       "TEXT DEFAULT '[]'", "users"),
            ("rpm_limit_override",   "INTEGER",           "users"),
            ("token_budget",         "INTEGER DEFAULT 0", "users"),
        ]:
            try:
                existing_cols = [c["name"] for c in inspector.get_columns(tbl)]
                if col not in existing_cols:
                    conn.execute(text(f'ALTER TABLE "{tbl}" ADD COLUMN "{col}" {col_type}'))
                    conn.commit()
                    logger.info(f"Migrated: {tbl}.{col} added")
            except Exception as e:
                logger.warning(f"Migration of {tbl}.{col} skipped: {e}")  # table may not exist yet

        # Indexes: the first makes a paid order unique at the database level (the webhook's
        # lock + lookup is the first line of defence); the rest serve the monitors' queries.
        for name, ddl in [
            ("uq_transactions_cashfree_order_id", "CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_cashfree_order_id ON transactions (cashfree_order_id)"),
            ("ix_usage_logs_rental_created", "CREATE INDEX IF NOT EXISTS ix_usage_logs_rental_created ON usage_logs (rental_id, created_at)"),
            ("ix_usage_logs_created_at", "CREATE INDEX IF NOT EXISTS ix_usage_logs_created_at ON usage_logs (created_at)"),
            ("ix_rentals_status_expires", "CREATE INDEX IF NOT EXISTS ix_rentals_status_expires ON rentals (status, expires_at)"),
        ]:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception as e:
                logger.warning(f"Index {name} not created: {e}")
    
    # Seed admin user (idempotent — skips if already exists)
    from backend.database.models import User, UserRole
    from backend.services.auth_utils import hash_password
    with SessionLocal() as db:
        if not db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")
        else:
            logger.info(f"Admin user already exists: {settings.ADMIN_EMAIL}")

    # Initialize Redis
    await init_redis()
    logger.info("✅ Redis initialized")

    # Report which sign-in features are configured (setting names only, never values)
    auth.log_auth_setup_status()
    
    # Background workers. The task handles are kept: the event loop only holds weak
    # references, so an unreferenced task can be garbage-collected mid-run.
    app.state.worker_tasks = [
        asyncio.create_task(start_spending_monitor()),
        asyncio.create_task(expiration_monitor.start()),
        asyncio.create_task(capacity_reconciler.start()),
        asyncio.create_task(cost_protection_worker.start()),
    ]
    logger.info("✅ Workers started: spending, expiration, capacity reconciler, cost protection")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down application...")
    await stop_spending_monitor()
    await expiration_monitor.stop()
    await capacity_reconciler.stop()
    await cost_protection_worker.stop()
    await close_redis()
    logger.info("✅ Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="AIRent — AI API Rental",
    description="""
## Rent AI API access by the minute or day

AIRent gives you an **OpenAI-compatible virtual key** that works with GPT-4o, Gemini, and Claude — no long-term contracts, no setup fees.

### How it works
1. **Register** → create an account
2. **Buy a plan** → choose a provider + duration, pay with Cashfree
3. **Get your virtual key** → use it like a normal OpenAI API key
4. **Build** → point any OpenAI-compatible SDK at our endpoint

### Base URL
```
https://api-on-rent-backend.onrender.com
```

### Authentication
Most endpoints require a **JWT Bearer token** (from `/auth/login`).
The proxy endpoint `/v1/chat/completions` uses your **virtual key** (`vk_...`) as the Bearer token.

### Supported Models
| Model | Provider | Drain Rate |
|---|---|---|
| `gpt-4o-mini` | OpenAI | 3× |
| `gpt-4o` | OpenAI | 10× |
| `gemini-1.5-flash` | Google | 1× |
| `gemini-1.5-pro` | Google | 5× |
| `claude-sonnet-5-5` | Anthropic | 8× |
""",
    version="1.0.0",
    contact={"name": "AIRent Support", "url": "https://api-on-rent.pages.dev/contact"},
    license_info={"name": "Proprietary"},
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Authentication", "description": "Register, login, and get user info."},
        {"name": "Marketplace", "description": "Browse plans, providers, and manage your rentals."},
        {"name": "Payment", "description": "Create Cashfree checkout sessions and handle webhooks."},
        {"name": "Proxy", "description": "OpenAI-compatible chat completions endpoint — use your virtual key here."},
        {"name": "Status", "description": "System health and provider status."},
        {"name": "Admin", "description": "Admin-only endpoints for managing users, plans, and analytics."},
    ],
)

# CORS middleware
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://api-on-rent.pages.dev",
    # Add your Cloudflare Pages URL once deployed, e.g.:
    # "https://your-project.pages.dev",
    # "https://yourdomain.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/response logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(marketplace.router, prefix="/api", tags=["Marketplace"])
app.include_router(payment.router, prefix="/api", tags=["Payment"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(proxy.router, prefix="/v1", tags=["Proxy"])
app.include_router(status.router, prefix="/status", tags=["Status"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI API Rental SaaS",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Health check endpoint with Redis status."""
    redis_status = "unknown"
    try:
        from backend.database.redis_manager import redis_client
        if redis_client:
            await redis_client.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    return {
        "status": "healthy",
        "redis": redis_status,
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
