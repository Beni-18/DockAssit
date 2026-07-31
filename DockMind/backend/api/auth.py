"""
Authentication API router.

Handles user registration, login, and current-user profile endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.session import get_db
from schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from services.auth_service import AuthService
from config.security import get_current_user_id

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password → returns JWT."""
    return AuthService.login(db, payload.email, payload.password)


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user → returns JWT."""
    return AuthService.register(db, payload.name, payload.email, payload.password)


@router.get("/me", response_model=UserResponse)
def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get the current authenticated user's profile."""
    return AuthService.get_user_by_id(db, user_id)
