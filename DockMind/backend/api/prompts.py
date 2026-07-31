"""
Saved prompts API router.

Exposes CRUD endpoints for managing a user's reusable prompt templates,
as well as a dedicated endpoint to execute a saved prompt through the
full AI → Docker pipeline.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.database import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.prompt_schema import PromptResponse, SavePromptRequest, UpdatePromptRequest
from services.prompt_service import PromptService

router = APIRouter()


@router.get("/", response_model=list[PromptResponse])
def get_prompts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all saved prompts for the currently authenticated user."""
    return PromptService.get_user_prompts(db, user_id=current_user.id)


@router.post("/", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
def save_prompt(
    payload: SavePromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a new reusable prompt template."""
    return PromptService.create_prompt(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )


@router.put("/{prompt_id}", response_model=PromptResponse)
def update_prompt(
    prompt_id: int,
    payload: UpdatePromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing saved prompt."""
    return PromptService.update_prompt(
        db=db,
        prompt_id=prompt_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt(
    prompt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved prompt."""
    PromptService.delete_prompt(
        db=db,
        prompt_id=prompt_id,
        user_id=current_user.id,
    )


@router.post("/{prompt_id}/execute")
async def execute_saved_prompt(
    prompt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Execute a saved prompt.
    
    This triggers the complete DockAssist pipeline:
    1. Fetches the saved prompt text.
    2. Sends the text to Gemini to parse the Docker intent.
    3. Executes the corresponding Docker SDK action.
    4. Logs the command and execution details to the database history.
    """
    return await PromptService.execute_saved_prompt(
        db=db,
        prompt_id=prompt_id,
        user_id=current_user.id,
    )
