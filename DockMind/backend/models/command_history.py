"""
CommandHistory SQLAlchemy model.

Persists a log of every AI-interpreted Docker command executed by users,
including the parsed action, target, outcome, and any error message.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database.database import Base


class CommandHistory(Base):
    """Records every AI command executed by the user."""
    __tablename__ = "command_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prompt = Column(Text, nullable=False)         # Original natural language prompt
    action = Column(String(50), nullable=True)    # Interpreted Docker action (start, stop, etc.)
    target = Column(String(255), nullable=True)   # Target container or image name
    success = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CommandHistory id={self.id} action={self.action} target={self.target}>"
