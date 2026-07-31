from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.session import get_db
from services.history_service import HistoryService
from config.security import get_current_user_id

router = APIRouter()


@router.get("")
def get_history(
    skip: int = 0,
    limit: int = 50,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get the current user's command history (paginated)."""
    return HistoryService.get_user_history(db, user_id, skip=skip, limit=limit)


@router.delete("/{history_id}", status_code=204)
def delete_history_entry(
    history_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a specific history entry."""
    HistoryService.delete_entry(db, history_id, user_id)
