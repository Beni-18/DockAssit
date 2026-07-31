"""
AI API router.

Exposes endpoints for translating natural language instructions into
structured Docker operations, and for general-purpose AI chat, via the
AI service. Does not execute Docker operations directly.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.ai_schema import ChatRequest, ChatResponse, DockerIntent, InterpretRequest
from services.ai_service import (
    AIInvalidResponseError,
    AIProvider,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    AIServiceError,
    generate_chat_response,
    get_ai_provider,
    interpret_prompt,
)

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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    provider: AIProvider = Depends(get_ai_provider),
) -> ChatResponse:
    """
    Send a free-form prompt to the configured AI model and return its reply.

    Validates the request, delegates generation to the AI service, and
    translates any provider failure into the appropriate HTTP error.
    """
    try:
        reply = await generate_chat_response(payload.prompt, provider)
    except AIProviderUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except AIProviderTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc)) from exc
    except AIInvalidResponseError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except AIServiceError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return ChatResponse(response=reply)
