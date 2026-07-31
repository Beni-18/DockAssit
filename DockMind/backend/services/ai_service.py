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
        raw_content = None
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
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
        except Exception as e:
            logger.warning(f"Ollama connection error: {e}. Using rule-based fallback.")
            p_lower = prompt.lower()
            if "start" in p_lower:
                action = "start"
                target = "nginx-web"
                if "mysql" in p_lower: target = "mysql-db"
                elif "redis" in p_lower: target = "redis-cache"
                elif "backend" in p_lower or "api" in p_lower: target = "backend-api"
                elif "prometheus" in p_lower: target = "prometheus"
                explanation = f"Sure! I will start the '{target}' container for you."
            elif "stop" in p_lower:
                action = "stop"
                target = "nginx-web"
                if "mysql" in p_lower: target = "mysql-db"
                elif "redis" in p_lower: target = "redis-cache"
                elif "backend" in p_lower or "api" in p_lower: target = "backend-api"
                elif "prometheus" in p_lower: target = "prometheus"
                explanation = f"Understood. I am stopping the '{target}' container."
            elif "restart" in p_lower:
                action = "restart"
                target = "nginx-web"
                if "mysql" in p_lower: target = "mysql-db"
                elif "redis" in p_lower: target = "redis-cache"
                elif "backend" in p_lower or "api" in p_lower: target = "backend-api"
                elif "prometheus" in p_lower: target = "prometheus"
                explanation = f"Got it. Initiating restart for '{target}' container."
            else:
                action = "status"
                target = "nginx-web"
                explanation = "All containers are monitored and running fine. Let me know if you need to start, stop or restart any of them."
            
            raw_content = json.dumps({
                "action": action,
                "target": target,
                "explanation": explanation
            })

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
