"""
Saved prompt request and response schemas.

Pydantic v2 models for creating, updating, and returning
user-saved AI prompt templates.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SavePromptRequest(BaseModel):
    title: str
    content: str


class UpdatePromptRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class PromptResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
