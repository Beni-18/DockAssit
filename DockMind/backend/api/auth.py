"""
Authentication API router.

Handles user registration, login, current-user profile, and logout.
Routes only wire up the request/response schemas and dependencies —
all business logic is delegated to ``AuthService``.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database.session import get_db
from middleware.auth_middleware import get_current_user
from middleware.rate_limit import limiter
from models.user import User
from schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and return an access token."""
    return AuthService.register_user(db, payload.name, payload.email, payload.password)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user with email and password and return an access token."""
    return AuthService.login_user(db, payload.email, payload.password)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Log out the current user. JWTs are stateless, so this only confirms the request was authenticated."""
    return AuthService.logout_user()
