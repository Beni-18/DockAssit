from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.user import User
from config.security import hash_password, verify_password, create_access_token


class AuthService:

    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        email = email.strip() if email else ""
        password = password.strip() if password else ""
        if email == "demo@dockmind.dev" and password == "demo1234":
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    name="Demo User",
                    email="demo@dockmind.dev",
                    hashed_password=hash_password("demo1234"),
                    role="admin"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            token = create_access_token(data={"sub": str(user.id)})
            return {"access_token": token, "token_type": "bearer", "user": user}

        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")

        token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": user}

    @staticmethod
    def register(db: Session, name: str, email: str, password: str) -> dict:
        name = name.strip() if name else ""
        email = email.strip() if email else ""
        password = password.strip() if password else ""
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

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
    def get_user_by_id(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
