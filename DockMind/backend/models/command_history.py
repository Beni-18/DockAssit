"""
CommandHistory SQLAlchemy model.

Persists a log of every AI-interpreted Docker command executed by users,
including the parsed AI intent, outcome, and optional execution duration.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.base import Base


class CommandHistory(Base):
    """Records every natural language command processed by the system."""

    __tablename__ = "command_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    prompt = Column(Text, nullable=False)
    
    # Parsed AI Intent
    action = Column(String(50), nullable=True)
    resource = Column(String(50), nullable=True)
    target = Column(String(255), nullable=True)
    
    success = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    duration = Column(Float, nullable=True)  # Execution time in seconds
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to the detailed execution log
    execution_logs = relationship("ExecutionLog", back_populates="history", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CommandHistory id={self.id} action={self.action} target={self.target}>"
