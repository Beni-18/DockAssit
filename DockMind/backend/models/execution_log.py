"""
ExecutionLog SQLAlchemy model.

Records low-level Docker SDK execution results, linking each
operation back to a user and optionally to a CommandHistory entry.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database.database import Base


class ExecutionLog(Base):
    """Low-level Docker SDK execution logs."""
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    history_id = Column(Integer, ForeignKey("command_history.id"), nullable=True)
    container_id = Column(String(100), nullable=True)
    container_name = Column(String(255), nullable=True)
    action = Column(String(50), nullable=False)
    output = Column(Text, nullable=True)           # Raw Docker SDK response
    exit_code = Column(Integer, nullable=True)
    success = Column(Boolean, default=False)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ExecutionLog id={self.id} action={self.action} success={self.success}>"
