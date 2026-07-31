"""
Command history service.

Persists and retrieves user command history records,
providing the audit trail for all AI-driven Docker operations.
"""

from sqlalchemy.orm import Session
from typing import Optional, List

from models.command_history import CommandHistory


class HistoryService:

    @staticmethod
    def save(
        db: Session,
        user_id: int,
        prompt: str,
        action: Optional[str],
        target: Optional[str],
        success: bool,
        error_message: Optional[str] = None,
    ) -> CommandHistory:
        entry = CommandHistory(
            user_id=user_id,
            prompt=prompt,
            action=action,
            target=target,
            success=success,
            error_message=error_message,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_user_history(
        db: Session, user_id: int, skip: int = 0, limit: int = 50
    ) -> List[CommandHistory]:
        return (
            db.query(CommandHistory)
            .filter(CommandHistory.user_id == user_id)
            .order_by(CommandHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def delete_entry(db: Session, history_id: int, user_id: int) -> None:
        entry = (
            db.query(CommandHistory)
            .filter(CommandHistory.id == history_id, CommandHistory.user_id == user_id)
            .first()
        )
        if entry:
            db.delete(entry)
            db.commit()
