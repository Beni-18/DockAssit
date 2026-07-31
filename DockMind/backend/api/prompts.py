from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.session import get_db
from schemas.prompt_schema import SavePromptRequest, UpdatePromptRequest, PromptResponse
from services.prompt_service import PromptService
from config.security import get_current_user_id

router = APIRouter()


@router.get("/", response_model=List[PromptResponse])
def get_prompts(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all saved prompts for the current user."""
    return PromptService.get_user_prompts(db, user_id)


@router.post("/", response_model=PromptResponse, status_code=201)
def save_prompt(
    payload: SavePromptRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Save a new prompt template."""
    return PromptService.create_prompt(db, user_id, payload.title, payload.content)


@router.put("/{prompt_id}", response_model=PromptResponse)
def update_prompt(
    prompt_id: int,
    payload: UpdatePromptRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update an existing saved prompt."""
    return PromptService.update_prompt(db, prompt_id, user_id, payload)


@router.delete("/{prompt_id}", status_code=204)
def delete_prompt(
    prompt_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a saved prompt."""
    PromptService.delete_prompt(db, prompt_id, user_id)
