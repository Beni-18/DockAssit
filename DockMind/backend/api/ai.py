"""
AI API router.

Exposes endpoints for translating natural language instructions into
structured Docker operations via the AI service. Does not execute the
operations directly.
"""

from fastapi import APIRouter, Depends

from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.ai_schema import DockerIntent, InterpretRequest
from services.ai_service import interpret_prompt

router = APIRouter()


@router.post("/interpret", response_model=DockerIntent)
async def interpret_ai_command(
    payload: InterpretRequest,
    current_user: User = Depends(get_current_user),
) -> DockerIntent:
    """
    Process a natural language instruction and extract the Docker intent.
    
    This endpoint calls the configured AI model (Ollama) to parse
    the user's request and returns a structured JSON intent representing the
    desired Docker action. It does NOT execute the action.
    """
    return await interpret_prompt(payload.prompt)
