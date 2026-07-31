"""
AI API router.

Exposes endpoints for translating natural language instructions into
structured Docker operations via the AI service. Does not execute the
operations directly.
"""

from fastapi import APIRouter

from schemas.ai_schema import InterpretRequest, InterpretResponse
from services.ai_service import interpret_prompt

router = APIRouter()


@router.post("/interpret", response_model=InterpretResponse)
async def interpret_ai_command(payload: InterpretRequest) -> InterpretResponse:
    """
    Process a natural language instruction and extract the Docker intent.
    
    This endpoint calls the configured AI model (Google Gemini) to parse
    the user's request and returns a structured JSON intent representing the
    desired Docker action. It does NOT execute the action.
    """
    intent, raw_response = await interpret_prompt(payload.prompt)
    return InterpretResponse(intent=intent, raw_response=raw_response)
