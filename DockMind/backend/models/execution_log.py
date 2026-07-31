"""
ExecutionLog SQLAlchemy model.

Records detailed low-level Docker execution results, linking each
operation back to the CommandHistory entry that triggered it.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.database import Base


class ExecutionLog(Base):
    """Detailed logs for Docker actions."""

    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    history_id = Column(
        Integer, ForeignKey("command_history.id", ondelete="CASCADE"), nullable=False
    )
    
    success = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    execution_time = Column(Float, nullable=True)  # Seconds spent in Docker SDK
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to the parent command history
    history = relationship("CommandHistory", back_populates="execution_logs")

    def __repr__(self):
        return f"<ExecutionLog id={self.id} history_id={self.history_id} success={self.success}>"
