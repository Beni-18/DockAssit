"""
Authentication request and response schemas.

Pydantic v2 models for registration, login, token issuance,
and the current-user profile response.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    """Payload for creating a new local account."""

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    # bcrypt only hashes the first 72 bytes of a password; capping the
    # input length avoids silently truncating longer passwords. Minimum
    # bumped from the common-but-weak 8 to 10 — current guidance (NIST
    # 800-63B) favors length over forced complexity classes, so this is
    # a length floor rather than an uppercase/digit/symbol requirement.
    password: str = Field(min_length=10, max_length=72)

    @model_validator(mode="after")
    def _reject_trivial_password(self) -> "RegisterRequest":
        """Block the single most common weak-password pattern: reusing your
        own name or email as the password."""
        pw = self.password.strip().lower()
        email_local = self.email.split("@", 1)[0].strip().lower()
        if pw == self.name.strip().lower() or pw == email_local or pw == self.email.strip().lower():
            raise ValueError("Password cannot be the same as your name or email.")
        return self


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
