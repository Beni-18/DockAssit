"""
SQLAlchemy declarative base.

All ORM models must inherit from ``Base`` defined here.
Centralising the base in its own module prevents circular-import
issues when ``database.py`` imports models for table registration.

Usage::

    from database.base import Base

    class MyModel(Base):
        __tablename__ = "my_table"
        ...
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Shared declarative base for all SQLAlchemy ORM models.

    Using the class-based ``DeclarativeBase`` pattern (SQLAlchemy 2.x)
    rather than the legacy ``declarative_base()`` function gives full
    type-checker support and is the recommended approach going forward.
    """
