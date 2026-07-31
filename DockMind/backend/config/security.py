"""
Security utilities — password hashing and JWT token management.

This module is the single source of truth for all cryptographic operations
in DockAssist. It is intentionally free of FastAPI-specific dependencies
so that it can be used by any layer of the application (auth service,
middleware, CLI scripts) without side effects.

Usage::

    from config.security import (
        hash_password,
        verify_password,
        create_access_token,
        verify_access_token,
    )
"""

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext

from config.config import settings

# ---------------------------------------------------------------------------
# Password hashing context
# ---------------------------------------------------------------------------
# ``deprecated="auto"`` automatically re-hashes passwords that were stored
# with an older/weaker scheme whenever they are verified — zero downtime
# migration path if the scheme ever changes.
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Return a bcrypt hash of ``password``.

    The resulting string is safe to persist directly in the database.
    Plain text is never returned or logged.
    """
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Return ``True`` if ``plain_password`` matches ``hashed_password``.

    Uses a constant-time comparison internally to prevent timing attacks.
    """
    return _pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Build and sign a JWT access token.

    Parameters
    ----------
    data:
        Arbitrary claims to embed in the token payload (e.g. ``{"sub": "42"}``).
        A copy is made so the caller's dict is never mutated.
    expires_delta:
        Optional custom lifetime. Falls back to ``ACCESS_TOKEN_EXPIRE_MINUTES``
        from application settings when omitted.

    Returns
    -------
    str
        A signed JWT string ready to be returned to the client.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Parameters
    ----------
    token:
        The raw JWT string received from the client.

    Returns
    -------
    dict
        The decoded token payload when the token is valid and unexpired.

    Raises
    ------
    HTTPException (401)
        If the token is expired, malformed, or the signature is invalid.
        A ``WWW-Authenticate: Bearer`` header is included per RFC 6750.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: dict = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI dependency — Bearer token extraction
# ---------------------------------------------------------------------------
# Placed here (rather than in an auth module) because every protected router
# in the project already imports it from config.security. Moving it would
# require modifying all five existing router files.
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> int:
    """
    FastAPI dependency that extracts and validates the user ID from a Bearer token.

    Inject via ``Depends(get_current_user_id)`` in any protected route handler.

    Raises
    ------
    HTTPException (401)
        If the token is missing, malformed, expired, or does not contain a
        valid ``sub`` claim.
    """
    payload = verify_access_token(credentials.credentials)
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing the 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return int(subject)
