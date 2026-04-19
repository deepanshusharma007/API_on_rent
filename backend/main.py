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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("🚀 Starting application...")
    
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
        ]:
            try:
                existing_cols = [c["name"] for c in inspector.get_columns(tbl)]
                if col not in existing_cols:
                    conn.execute(text(f'ALTER TABLE "{tbl}" ADD COLUMN "{col}" {col_type}'))
                    conn.commit()
                    logger.info(f"Migrated: {tbl}.{col} added")
            except Exception:
                pass  # Table may not exist yet — create_all handles it
    
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
    
    # Start spending monitor background worker
    asyncio.create_task(start_spending_monitor())
    logger.info("✅ Spending monitor started")
    
    # Start expiration monitor background worker
    asyncio.create_task(expiration_monitor.start())
    logger.info("✅ Expiration monitor started")
    
    # Start capacity reconciler
    asyncio.create_task(capacity_reconciler.start())
    logger.info("✅ Capacity reconciler started")
    
    # Start cost protection worker
    asyncio.create_task(cost_protection_worker.start())
    logger.info("✅ Cost protection worker started")
    
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
    title="AI API Rental SaaS",
    description="Rent OpenAI, Gemini, and Claude API access by the minute or day",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
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


@app.get("/health")
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
