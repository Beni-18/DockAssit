"""
Authentication service.

Implements the business logic for user registration, login, profile
retrieval, and logout. Password hashing and JWT issuance are delegated
to ``config.security``; this module never performs cryptographic
operations directly.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from config.security import create_access_token, hash_password, verify_password
from models.user import User


class AuthService:
    """Encapsulates all authentication use cases."""

    # A precomputed bcrypt hash used only to burn the same CPU time as a real
    # verification when the looked-up email doesn't exist. Without this,
    # `login_user` would short-circuit and return well before a real user's
    # bcrypt.verify() completes — a timing side-channel that lets an attacker
    # tell registered emails apart from unregistered ones purely from
    # response latency, without any error message ever differing.
    _DUMMY_HASH = hash_password("dummy-password-for-constant-time-login")

    @staticmethod
    def register_user(db: Session, name: str, email: str, password: str) -> dict:
        """
        Register a new local user and issue an access token.

        Raises
        ------
        HTTPException (409)
            If the email is already registered.
        """
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": user}

    @staticmethod
    def login_user(db: Session, email: str, password: str) -> dict:
        """
        Authenticate a user by email and password and issue an access token.

        Raises
        ------
        HTTPException (401)
            If the email is unknown, the account has no local password
            (e.g. Google-only account), or the password does not match.
        HTTPException (403)
            If the account has been deactivated.
        """
        user = db.query(User).filter(User.email == email).first()

        # Always run a bcrypt verification, even for an unknown email or a
        # Google-only account with no local password, so response timing is
        # the same either way (see _DUMMY_HASH above).
        hash_to_check = user.hashed_password if (user and user.hashed_password) else AuthService._DUMMY_HASH
        password_matches = verify_password(password, hash_to_check)

        if not user or not user.hashed_password or not password_matches:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

        token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": user}

    @staticmethod
    def logout_user() -> dict:
        """
        Log out the current user.

        JWTs are stateless and carry no server-side session, so there is
        nothing to invalidate here — the client is responsible for
        discarding the token. No token blacklist is implemented.
        """
        return {"message": "Logged out successfully"}
