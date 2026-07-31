from pydantic import BaseModel
from typing import Optional


class AIExecuteRequest(BaseModel):
    prompt: str   # Natural language user input


class AIIntent(BaseModel):
    action: str   # Parsed Docker action
    target: str   # Parsed container/image name


class AIExecuteResponse(BaseModel):
    intent: Optional[AIIntent] = None
    explanation: Optional[str] = None
    result: Optional[str] = None
    model: str = "llama3"
    success: bool = True
    error: Optional[str] = None
