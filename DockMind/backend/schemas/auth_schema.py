"""
Authentication request and response schemas.

Pydantic v2 models for registration, login, token issuance,
and the current-user profile response.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for creating a new local account."""

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    # bcrypt only hashes the first 72 bytes of a password; capping the
    # input length avoids silently truncating longer passwords.
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    """Payload for authenticating with email and password."""

    email: EmailStr
    password: str = Field(min_length=1)


class GoogleLoginRequest(BaseModel):
    token: str  # Google ID token


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
