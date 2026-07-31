"""
Saved prompt request and response schemas.

Pydantic v2 models for creating, updating, and returning
user-saved AI prompt templates.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class SavePromptRequest(BaseModel):
    """Payload for saving a new prompt template."""
    title: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=3, max_length=1000)


class UpdatePromptRequest(BaseModel):
    """Payload for updating an existing prompt template."""
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=3, max_length=1000)


class PromptResponse(BaseModel):
    """Returned prompt template."""
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
