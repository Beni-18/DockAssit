from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config.config import settings

# For SQLite, check_same_thread=False is required
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine_args = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

# SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    **engine_args
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()
