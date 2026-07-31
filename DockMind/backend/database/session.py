"""
Database session dependency.

Provides the `get_db` generator used as a FastAPI dependency to inject
a scoped SQLAlchemy session into route handlers.
"""

from typing import Generator
from database.database import SessionLocal


def get_db() -> Generator:
    """
    FastAPI dependency — provides a database session per request.
    Automatically closes the session after the request completes.
    
    Usage:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
