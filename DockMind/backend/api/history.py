"""
Command history API router.

Provides paginated access to a user's executed command history
and allows deletion of individual history entries.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from database.database import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.history_schema import CommandHistoryResponse
from services.history_service import HistoryService

router = APIRouter()


@router.get("/", response_model=list[CommandHistoryResponse])
def get_history(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the authenticated user's command history.
    
    Results are returned in descending chronological order (newest first).
    """
    return HistoryService.get_user_history(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_entry(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a specific history entry.
    
    This will also cascade delete the associated ExecutionLog.
    """
    HistoryService.delete_entry(
        db=db,
        history_id=history_id,
        user_id=current_user.id,
    )
