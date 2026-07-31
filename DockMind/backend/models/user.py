"""
User SQLAlchemy model.

Represents an authenticated user in the system, supporting both
password-based and Google OAuth authentication.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)   # nullable for Google OAuth users
    google_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default="user")          # "user" or "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
