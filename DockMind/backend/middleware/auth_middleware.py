"""
Authentication middleware and dependencies.

Provides dependency injection for FastAPI routes to easily retrieve
the fully authenticated User object, leveraging the JWT utilities
from ``config.security``.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from config.security import get_current_user_id
from database.database import get_db
from models.user import User


def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that returns the authenticated User instance.

    Reads and validates the JWT using ``get_current_user_id``, then queries
    the database for the corresponding user.

    Raises
    ------
    HTTPException (401)
        If the token is invalid, expired, or the user no longer exists in the DB.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The user belonging to this token no longer exists.",
        )
    return user
