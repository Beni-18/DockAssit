"""
Command history request and response schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CommandHistoryResponse(BaseModel):
    """Representation of a command history record."""

    id: int
    user_id: int
    prompt: str
    action: Optional[str] = None
    resource: Optional[str] = None
    target: Optional[str] = None
    success: bool
    error_message: Optional[str] = None
    duration: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}
