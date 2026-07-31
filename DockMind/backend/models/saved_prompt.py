"""
SavedPrompt SQLAlchemy model.

Stores user-defined reusable AI prompt templates that can be
retrieved and replayed from the DockAssist interface.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database.database import Base


class SavedPrompt(Base):
    """Stores user-saved reusable AI prompt templates."""
    __tablename__ = "saved_prompts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<SavedPrompt id={self.id} title={self.title}>"
