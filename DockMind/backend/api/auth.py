"""
Authentication API router.

Handles user registration, login, current-user profile, and logout.
Routes only wire up the request/response schemas and dependencies —
all business logic is delegated to ``AuthService``.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.security import get_current_user_id
from database.session import get_db
from schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and return an access token."""
    return AuthService.register_user(db, payload.name, payload.email, payload.password)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user with email and password and return an access token."""
    return AuthService.login_user(db, payload.email, payload.password)


@router.get("/me", response_model=UserResponse)
def me(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's profile."""
    return AuthService.get_current_user(db, user_id)


@router.post("/logout")
def logout(user_id: int = Depends(get_current_user_id)):
    """Log out the current user. JWTs are stateless, so this only confirms the request was authenticated."""
    return AuthService.logout_user()
