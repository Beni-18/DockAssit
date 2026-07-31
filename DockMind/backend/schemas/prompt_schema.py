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
