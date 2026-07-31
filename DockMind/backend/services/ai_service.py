"""
AI service — natural language → structured Docker intent via Ollama.

This module communicates exclusively with a local Ollama instance.
It accepts a raw natural language prompt, sends it to Ollama with
a strictly engineered system prompt for JSON output, parses the response,
and returns a validated ``DockerIntent`` object.

It also exposes a general-purpose chat capability (``generate_chat_response``)
behind the ``AIProvider`` interface, so the underlying model runtime
(currently Ollama) can be swapped without touching the API layer.
"""

import json
import time
from abc import ABC, abstractmethod
from functools import lru_cache
from json import JSONDecodeError

import httpx
from fastapi import HTTPException, status
from ollama import AsyncClient, RequestError as OllamaRequestError, ResponseError as OllamaResponseError

from config.config import settings
from schemas.ai_schema import DockerIntent
from utils.logger import logger

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """You are a Docker command parser.

Convert the user's request into JSON.

Return ONLY valid JSON.

Schema:
{
  "action": "",
  "resource": "",
  "target": ""
}

Allowed actions:
start, stop, restart, remove, logs, stats, list

Allowed resources:
container, image, volume, network

Never explain anything.
Never return markdown.
Never return text.
Only JSON."""


def _validate_intent(data: dict) -> DockerIntent:
    """Validate the parsed JSON against the expected schema."""
    try:
        return DockerIntent(**data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI response failed schema validation: {exc}",
        ) from exc


async def interpret_prompt(prompt: str) -> DockerIntent:
    """
    Send a natural language prompt to Ollama and return a validated Docker intent.

    Raises
    ------
    HTTPException (503)
        If the Ollama API is unreachable or returns an error.
    HTTPException (422)
        If the Ollama response cannot be parsed or validated.
    """
    logger.info("Sending prompt to Ollama (%s): %s", settings.OLLAMA_MODEL, prompt[:100])
    
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "system": _SYSTEM_PROMPT,
        "stream": False,
        "format": "json",
    }
    
    url = f"{settings.OLLAMA_URL.rstrip('/')}/api/generate"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to connect to Ollama at %s: %s", url, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI provider (Ollama) is unreachable. Please ensure it is running.",
        ) from exc
    except httpx.HTTPStatusError as exc:
        logger.error("Ollama returned an error status: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The AI provider returned an error: {exc.response.text}",
        ) from exc

    raw_text = result.get("response", "").strip()
    logger.debug("Ollama raw response: %s", raw_text)

    try:
        parsed = json.loads(raw_text)
    except JSONDecodeError as exc:
        logger.error("Ollama returned invalid JSON: %s", raw_text)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI returned a response that could not be parsed as valid JSON.",
        ) from exc

    intent = _validate_intent(parsed)

    logger.info(
        "Intent parsed — action=%s resource=%s target=%s",
        intent.action,
        intent.resource,
        intent.target,
    )
    return intent


# ---------------------------------------------------------------------------
# Chat — general-purpose AI conversation
# ---------------------------------------------------------------------------
# The pieces below are framework-agnostic: no ``fastapi`` import appears past
# this point. Failures are raised as ``AIServiceError`` subclasses; the API
# layer (``api/ai.py``) is responsible for translating them into HTTP
# responses.
# ---------------------------------------------------------------------------


class AIServiceError(Exception):
    """Base exception for all chat-related AI failures."""


class AIProviderUnavailableError(AIServiceError):
    """Raised when the configured AI provider cannot be reached."""


class AIProviderTimeoutError(AIServiceError):
    """Raised when the AI provider does not respond within the time limit."""


class AIInvalidResponseError(AIServiceError):
    """Raised when the AI provider returns an empty or unusable response."""


class AIProvider(ABC):
    """
    Abstract contract for a conversational AI backend.

    Coding against this interface (rather than the Ollama SDK directly)
    means the model runtime can later be replaced — e.g. with a hosted
    LLM API — by adding a new implementation, with no change required to
    the service function or the router.
    """

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Return the model's text completion for ``prompt``."""
        raise NotImplementedError


class OllamaProvider(AIProvider):
    """``AIProvider`` implementation backed by a local Ollama instance."""

    def __init__(self, host: str, model: str, timeout: float = 60.0) -> None:
        self._model = model
        self._client = AsyncClient(host=host, timeout=timeout)

    async def generate(self, prompt: str) -> str:
        """
        Request a chat completion from Ollama for ``prompt``.

        Raises
        ------
        AIProviderUnavailableError
            If Ollama cannot be reached.
        AIProviderTimeoutError
            If the request exceeds the configured timeout.
        AIInvalidResponseError
            If Ollama returns an error status or an empty completion.
        """
        try:
            result = await self._client.chat(
                model=self._model,
                messages=[{"role": "user", "content": prompt}],
            )
        except (OllamaResponseError, OllamaRequestError) as exc:
            raise AIInvalidResponseError(str(exc)) from exc
        except httpx.TimeoutException as exc:
            raise AIProviderTimeoutError("The AI provider timed out.") from exc
        except ConnectionError as exc:
            # ollama's client wraps httpx.ConnectError as a bare ConnectionError.
            raise AIProviderUnavailableError("The AI provider (Ollama) is unreachable.") from exc

        content = (result.message.content or "").strip() if result and result.message else ""
        if not content:
            raise AIInvalidResponseError("The AI provider returned an empty response.")
        return content


@lru_cache
def get_ai_provider() -> AIProvider:
    """
    FastAPI dependency that returns a cached ``AIProvider`` instance.

    ``lru_cache`` ensures a single client is reused across requests instead
    of being reconstructed (and re-injected) on every call.
    """
    return OllamaProvider(host=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL)


async def generate_chat_response(prompt: str, provider: AIProvider) -> str:
    """
    Send ``prompt`` to ``provider`` and return its generated text.

    Parameters
    ----------
    prompt:
        The user's natural language prompt.
    provider:
        The ``AIProvider`` implementation to use, supplied via dependency
        injection so this function stays decoupled from any specific SDK.

    Raises
    ------
    AIServiceError
        Or one of its subclasses, on any failure to obtain a response.
    """
    logger.info("AI chat request received (%d chars)", len(prompt))
    started_at = time.perf_counter()

    try:
        response = await provider.generate(prompt)
    except AIServiceError as exc:
        logger.error("AI chat request failed after %.2fs: %s", time.perf_counter() - started_at, exc)
        raise
    except Exception as exc:
        logger.exception("Unexpected error during AI chat request after %.2fs", time.perf_counter() - started_at)
        raise AIServiceError("An unexpected error occurred while generating the AI response.") from exc

    logger.info("AI chat response generated in %.2fs", time.perf_counter() - started_at)
    return response
