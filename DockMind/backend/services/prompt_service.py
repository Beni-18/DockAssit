"""
Saved prompt service.

Manages the lifecycle of reusable AI prompt templates, and orchestrates
the full execution pipeline (AI Interpretation → Docker SDK → History Logging)
for any given natural language prompt.
"""

import time
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.saved_prompt import SavedPrompt
from schemas.prompt_schema import SavePromptRequest, UpdatePromptRequest
from services import ai_service, docker_service
from services.history_service import HistoryService
from utils.logger import logger


class PromptService:
    """Manages saved prompts and coordinates the end-to-end execution flow."""

    @staticmethod
    def get_user_prompts(db: Session, user_id: int) -> Sequence[SavedPrompt]:
        """Fetch all saved prompts for a given user."""
        return (
            db.query(SavedPrompt)
            .filter(SavedPrompt.user_id == user_id)
            .order_by(SavedPrompt.created_at.desc())
            .all()
        )

    @staticmethod
    def create_prompt(
        db: Session, user_id: int, payload: SavePromptRequest
    ) -> SavedPrompt:
        """Save a new reusable prompt template."""
        prompt = SavedPrompt(
            user_id=user_id,
            title=payload.title,
            content=payload.content,
        )
        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        logger.info("User %s created saved prompt: %s", user_id, prompt.id)
        return prompt

    @staticmethod
    def update_prompt(
        db: Session, prompt_id: int, user_id: int, payload: UpdatePromptRequest
    ) -> SavedPrompt:
        """Update an existing saved prompt template."""
        prompt = (
            db.query(SavedPrompt)
            .filter(SavedPrompt.id == prompt_id, SavedPrompt.user_id == user_id)
            .first()
        )
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved prompt not found.",
            )

        if payload.title is not None:
            prompt.title = payload.title
        if payload.content is not None:
            prompt.content = payload.content

        db.commit()
        db.refresh(prompt)
        return prompt

    @staticmethod
    def delete_prompt(db: Session, prompt_id: int, user_id: int) -> None:
        """Delete a saved prompt template."""
        prompt = (
            db.query(SavedPrompt)
            .filter(SavedPrompt.id == prompt_id, SavedPrompt.user_id == user_id)
            .first()
        )
        if prompt:
            db.delete(prompt)
            db.commit()
            logger.info("User %s deleted saved prompt: %s", user_id, prompt_id)

    @staticmethod
    async def execute_prompt(db: Session, user_id: int, prompt_text: str) -> dict:
        """
        Orchestrate the complete DockAssist execution pipeline.
        Flow:
        1. AI Service parses natural language into structured DockerIntent.
        2. Docker Service executes the corresponding action.
        3. History Service logs the action, outcome, and duration.
        """
        start_time = time.perf_counter()
        action = resource = target = None
        success = False
        error_message = None
        docker_result = None

        try:
            # 1. Interpret Intent
            intent = await ai_service.interpret_prompt(prompt_text)
            action = intent.action
            resource = intent.resource
            target = intent.target

            # 2. Execute Docker Action
            # Safely route the parsed action to the appropriate docker_service method
            if resource == "container":
                if action == "start":
                    docker_result = docker_service.start_container(target)
                elif action == "stop":
                    docker_result = docker_service.stop_container(target)
                elif action == "restart":
                    docker_result = docker_service.restart_container(target)
                elif action == "remove":
                    docker_result = docker_service.remove_container(target)
                else:
                    raise ValueError(f"Unsupported container action: {action}")
            else:
                raise ValueError(f"Execution not yet supported for resource: {resource}")

            success = True

        except HTTPException as exc:
            # Catch expected API/Docker errors
            error_message = exc.detail
            logger.warning("Execution pipeline failed (HTTP %s): %s", exc.status_code, exc.detail)
            raise
        except Exception as exc:
            # Catch unexpected errors (e.g. ValueError from unsupported action)
            error_message = str(exc)
            logger.error("Execution pipeline failed unexpectedly: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Execution failed: {error_message}",
            ) from exc
        finally:
            # 3. Always log to History (whether success or failure)
            execution_duration = time.perf_counter() - start_time
            HistoryService.save_history_and_log(
                db=db,
                user_id=user_id,
                prompt=prompt_text,
                action=action,
                resource=resource,
                target=target,
                success=success,
                error_message=error_message,
                execution_duration=execution_duration,
            )

        return {
            "intent": {
                "action": action,
                "resource": resource,
                "target": target,
            },
            "result": docker_result,
            "success": success,
            "execution_duration": execution_duration,
        }

    @staticmethod
    async def execute_saved_prompt(db: Session, prompt_id: int, user_id: int) -> dict:
        """Retrieve a saved prompt by ID and execute it through the full pipeline."""
        prompt = (
            db.query(SavedPrompt)
            .filter(SavedPrompt.id == prompt_id, SavedPrompt.user_id == user_id)
            .first()
        )
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved prompt not found.",
            )

        logger.info("User %s executing saved prompt %s", user_id, prompt_id)
        return await PromptService.execute_prompt(db, user_id, prompt.content)
