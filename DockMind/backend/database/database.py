"""
Database engine, session factory, and FastAPI session dependency.

Reads ``DATABASE_URL`` from the centralised ``settings`` object and
configures a connection-pooled SQLAlchemy engine suitable for PostgreSQL.

Typical usage inside a route::

    from sqlalchemy.orm import Session
    from fastapi import Depends
    from database.database import get_db

    @router.get("/example")
    def example(db: Session = Depends(get_db)):
        ...
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config.config import settings


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
# ``str()`` converts the Pydantic ``PostgresDsn`` value to a plain string,
# which is what SQLAlchemy's ``create_engine`` expects.
# ``pool_pre_ping=True`` transparently recycles stale connections, avoiding
# the "server closed the connection unexpectedly" error common in long-lived
# deployments.
# ---------------------------------------------------------------------------
engine = create_engine(
    str(settings.DATABASE_URL),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,   # keep ORM objects usable after session.commit()
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session for the duration of a single HTTP request.

    The session is always closed in the ``finally`` block, even if the
    request handler raises an exception, preventing connection leaks.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
