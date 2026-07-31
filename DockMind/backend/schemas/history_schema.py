"""
Command history request and response schemas.
"""

from datetime import datetime

from pydantic import BaseModel


class CommandHistoryResponse(BaseModel):
    """Representation of a command history record."""

    id: int
    user_id: int
    prompt: str
    action: str | None = None
    resource: str | None = None
    target: str | None = None
    success: bool
    error_message: str | None = None
    duration: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
