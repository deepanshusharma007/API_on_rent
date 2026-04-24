"""Database connection and session management."""
import asyncio
from functools import partial
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator, Callable, TypeVar

from backend.config import settings

T = TypeVar("T")

# Works with both SQLite (dev) and PostgreSQL/Supabase (prod)
_url = settings.DATABASE_URL
_is_sqlite = _url.startswith("sqlite")

# psycopg2 doesn't understand ?pgbouncer=true — strip it before passing to engine
# The pooling is handled by Supabase's PgBouncer on their end, not by this param
_clean_url = _url.split("?")[0] if not _is_sqlite else _url

engine = create_engine(
    _clean_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,  # detects stale connections — essential for Supabase pooler
    **({} if _is_sqlite else {"pool_size": 5, "max_overflow": 10, "pool_timeout": 10, "pool_recycle": 1800}),
    echo=False
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency function to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def run_in_db(fn: Callable[..., T], *args, **kwargs) -> T:
    """Run a synchronous database operation in the default thread-pool executor.

    This prevents blocking SQLAlchemy calls from stalling the async event loop.
    Usage inside an async endpoint:
        result = await run_in_db(lambda: db.query(User).all())
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(fn, *args, **kwargs) if kwargs else fn if not args else partial(fn, *args))
