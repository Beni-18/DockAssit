"""
Saved prompt service.

Manages the full lifecycle of user-saved AI prompt templates —
create, read, update, and delete — scoped to the owning user.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from models.saved_prompt import SavedPrompt


class PromptService:

    @staticmethod
    def get_user_prompts(db: Session, user_id: int) -> List[SavedPrompt]:
        return (
            db.query(SavedPrompt)
            .filter(SavedPrompt.user_id == user_id)
            .order_by(SavedPrompt.created_at.desc())
            .all()
        )

    @staticmethod
    def create_prompt(db: Session, user_id: int, title: str, content: str) -> SavedPrompt:
        prompt = SavedPrompt(user_id=user_id, title=title, content=content)
        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        return prompt

    @staticmethod
    def update_prompt(db: Session, prompt_id: int, user_id: int, payload) -> SavedPrompt:
        prompt = db.query(SavedPrompt).filter(
            SavedPrompt.id == prompt_id,
            SavedPrompt.user_id == user_id,
        ).first()
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        if payload.title is not None:
            prompt.title = payload.title
        if payload.content is not None:
            prompt.content = payload.content
        db.commit()
        db.refresh(prompt)
        return prompt

    @staticmethod
    def delete_prompt(db: Session, prompt_id: int, user_id: int) -> None:
        prompt = db.query(SavedPrompt).filter(
            SavedPrompt.id == prompt_id,
            SavedPrompt.user_id == user_id,
        ).first()
        if prompt:
            db.delete(prompt)
            db.commit()
