"""
Command history and execution log service.

Persists user command history records and detailed execution logs,
providing the audit trail for all AI-driven Docker operations.
"""

from collections.abc import Sequence
from typing import Optional

from sqlalchemy import func
from sqlalchemy.engine import Row
from sqlalchemy.orm import Session

from models.command_history import CommandHistory
from models.execution_log import ExecutionLog


class HistoryService:
    """Manages command history and execution log persistence."""

    @staticmethod
    def save_history_and_log(
        db: Session,
        user_id: int,
        prompt: str,
        action: Optional[str],
        resource: Optional[str],
        target: Optional[str],
        success: bool,
        error_message: Optional[str] = None,
        execution_duration: Optional[float] = None,
    ) -> CommandHistory:
        """
        Record a command history entry and its corresponding execution log.

        Creates both records atomically within the same database transaction.
        """
        # 1. Create the parent history entry
        history_entry = CommandHistory(
            user_id=user_id,
            prompt=prompt,
            action=action,
            resource=resource,
            target=target,
            success=success,
            error_message=error_message,
            duration=execution_duration,
        )
        db.add(history_entry)
        db.flush()  # flush to generate history_entry.id for the execution log

        # 2. Create the child execution log
        exec_log = ExecutionLog(
            history_id=history_entry.id,
            success=success,
            error_message=error_message,
            execution_time=execution_duration,
        )
        db.add(exec_log)
        
        db.commit()
        db.refresh(history_entry)
        return history_entry

    @staticmethod
    def get_user_history(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[CommandHistory]:
        """Fetch paginated command history for a specific user."""
        return (
            db.query(CommandHistory)
            .filter(CommandHistory.user_id == user_id)
            .order_by(CommandHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_frequent_commands(db: Session, user_id: int, limit: int = 10) -> Sequence[Row]:
        """
        Return the user's most frequently executed commands, aggregated from
        their command history and ranked by how often each distinct
        (action, resource, target) combination has been run.
        """
        return (
            db.query(
                CommandHistory.action,
                CommandHistory.resource,
                CommandHistory.target,
                func.count(CommandHistory.id).label("count"),
                func.max(CommandHistory.created_at).label("last_executed_at"),
            )
            .filter(
                CommandHistory.user_id == user_id,
                CommandHistory.action.isnot(None),
                CommandHistory.resource.isnot(None),
                CommandHistory.target.isnot(None),
            )
            .group_by(CommandHistory.action, CommandHistory.resource, CommandHistory.target)
            .order_by(func.count(CommandHistory.id).desc(), func.max(CommandHistory.created_at).desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def delete_entry(db: Session, history_id: int, user_id: int) -> None:
        """
        Delete a command history entry.
        
        Cascade deletes automatically remove the associated ExecutionLog.
        """
        entry = (
            db.query(CommandHistory)
            .filter(CommandHistory.id == history_id, CommandHistory.user_id == user_id)
            .first()
        )
        if entry:
            db.delete(entry)
            db.commit()
