import json
import httpx
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException

from config.config import settings
from services.docker_service import DockerService
from services.history_service import HistoryService
from utils.logger import logger


class AIService:
    """Orchestrates Ollama prompting → intent parsing → Docker execution → history logging."""

    PROMPT_DIR = Path(__file__).parent.parent / "prompts"

    @classmethod
    def _load_system_prompt(cls) -> str:
        path = cls.PROMPT_DIR / "system_prompt.txt"
        if path.exists():
            return path.read_text()
        return (
            "You are DockMind, an AI that converts natural language Docker management "
            "requests into structured JSON. Always respond with ONLY valid JSON in the format: "
            '{"action": "<action>", "target": "<container_name>", "explanation": "<brief explanation>"}'
        )

    @classmethod
    async def process_prompt(cls, prompt: str, user_id: int, db: Session) -> dict:
        system_prompt = cls._load_system_prompt()

        # 1. Call Ollama
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "stream": False,
                    },
                )
                response.raise_for_status()
                raw_content = response.json()["message"]["content"]
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Ollama is not running. Start it with: ollama serve")
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise HTTPException(status_code=500, detail="AI inference failed")

        # 2. Parse JSON intent from model response
        try:
            intent = json.loads(raw_content)
            action = intent.get("action", "").lower()
            target = intent.get("target", "")
            explanation = intent.get("explanation", "")
        except (json.JSONDecodeError, KeyError):
            logger.warning(f"Could not parse AI response: {raw_content}")
            # Save failed attempt
            HistoryService.save(db, user_id, prompt, None, None, False, "Failed to parse AI response")
            return {
                "intent": None,
                "explanation": raw_content,
                "result": None,
                "model": settings.OLLAMA_MODEL,
                "success": False,
                "error": "Could not parse AI intent",
            }

        # 3. Execute Docker action
        result = None
        success = False
        error_msg = None
        try:
            docker_result = DockerService.execute_action(action, target, user_id)
            result = docker_result.get("message")
            success = True
        except HTTPException as e:
            error_msg = e.detail
            logger.error(f"Docker execution failed: {e.detail}")

        # 4. Save to history
        HistoryService.save(db, user_id, prompt, action, target, success, error_msg)

        return {
            "intent": {"action": action, "target": target},
            "explanation": explanation,
            "result": result,
            "model": settings.OLLAMA_MODEL,
            "success": success,
            "error": error_msg,
        }
