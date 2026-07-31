from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from schemas.ai_schema import AIExecuteRequest, AIExecuteResponse
from services.ai_service import AIService
from services.history_service import HistoryService
from config.security import get_current_user_id

router = APIRouter()


@router.post("/execute", response_model=AIExecuteResponse)
async def execute_ai_command(
    payload: AIExecuteRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Process a natural language prompt through Ollama → parse Docker intent → execute → save history.
    """
    result = await AIService.process_prompt(payload.prompt, user_id, db)
    return result
