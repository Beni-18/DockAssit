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
from typing import Optional

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
start, stop, restart, remove, logs, stats, inspect, pull, list, info, version

Allowed resources:
container, image, volume, network, system

Rules:
- "target" is the name or ID of the single resource the action applies to.
  Include it for start, stop, restart, remove, logs, stats, inspect, pull.
- Omit "target" (or set it to null) for actions that apply to every resource
  of a type, not one: list, info, version.
- Use resource "system" with action "info" or "version" for questions about
  the Docker daemon/engine itself (not a specific container/image/etc).

Examples:
"restart the nginx container" -> {"action":"restart","resource":"container","target":"nginx"}
"show me all containers" -> {"action":"list","resource":"container","target":null}
"what images do I have" -> {"action":"list","resource":"image","target":null}
"show logs for redis" -> {"action":"logs","resource":"container","target":"redis"}
"cpu and memory usage of api" -> {"action":"stats","resource":"container","target":"api"}
"docker version" -> {"action":"version","resource":"system","target":null}

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


async def _ollama_generate_json(prompt: str, system_prompt: str) -> dict:
    """
    Send ``prompt`` to Ollama under ``system_prompt`` and return the parsed
    JSON response body. Shared by ``interpret_prompt`` (fixed schema) and
    ``query_json`` (caller-supplied schema/grounding).

    Raises
    ------
    HTTPException (503)
        If the Ollama API is unreachable or returns an error.
    HTTPException (422)
        If the response cannot be parsed as JSON.
    """
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "format": "json",
        # Low temperature: this is a structured-extraction task, not creative
        # writing — the same request should classify the same way every time.
        "options": {"temperature": 0.1, "top_p": 0.9},
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
        return json.loads(raw_text)
    except JSONDecodeError as exc:
        logger.error("Ollama returned invalid JSON: %s", raw_text)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI returned a response that could not be parsed as valid JSON.",
        ) from exc


async def query_json(prompt: str, system_prompt: str) -> dict:
    """
    Low-level entry point for callers that need a custom system prompt and
    schema rather than the fixed ``DockerIntent`` contract — e.g.
    ``chatbot_service``, which grounds the prompt in live Docker state and
    expects a ``targets`` list instead of a single ``target`` string.
    """
    logger.info("Sending grounded prompt to Ollama (%s): %s", settings.OLLAMA_MODEL, prompt[:100])
    return await _ollama_generate_json(prompt, system_prompt)


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

    parsed = await _ollama_generate_json(prompt, _SYSTEM_PROMPT)
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
    async def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Return the model's text completion for ``prompt``, optionally under ``system``."""
        raise NotImplementedError


class OllamaProvider(AIProvider):
    """``AIProvider`` implementation backed by a local Ollama instance."""

    def __init__(self, host: str, model: str, timeout: float = 60.0) -> None:
        self._model = model
        self._client = AsyncClient(host=host, timeout=timeout)

    async def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """
        Request a chat completion from Ollama for ``prompt``, optionally
        under a ``system`` instruction (e.g. "phrase this data naturally").

        Raises
        ------
        AIProviderUnavailableError
            If Ollama cannot be reached.
        AIProviderTimeoutError
            If the request exceeds the configured timeout.
        AIInvalidResponseError
            If Ollama returns an error status or an empty completion.
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            result = await self._client.chat(
                model=self._model,
                messages=messages,
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


async def generate_chat_response(prompt: str, provider: AIProvider, system: Optional[str] = None) -> str:
    """
    Send ``prompt`` to ``provider`` and return its generated text.

    Parameters
    ----------
    prompt:
        The user's natural language prompt.
    provider:
        The ``AIProvider`` implementation to use, supplied via dependency
        injection so this function stays decoupled from any specific SDK.
    system:
        Optional system instruction — e.g. chatbot_service uses this to ask
        for a natural phrasing of an already-known, factual result.

    Raises
    ------
    AIServiceError
        Or one of its subclasses, on any failure to obtain a response.
    """
    logger.info("AI chat request received (%d chars)", len(prompt))
    started_at = time.perf_counter()

    try:
        response = await provider.generate(prompt, system=system)
    except AIServiceError as exc:
        logger.error("AI chat request failed after %.2fs: %s", time.perf_counter() - started_at, exc)
        raise
    except Exception as exc:
        logger.exception("Unexpected error during AI chat request after %.2fs", time.perf_counter() - started_at)
        raise AIServiceError("An unexpected error occurred while generating the AI response.") from exc

    logger.info("AI chat response generated in %.2fs", time.perf_counter() - started_at)
    return response


async def check_ollama_health() -> dict:
    """
    Lightweight reachability check for the configured Ollama host — powers a
    real connected/disconnected status in the UI instead of a hardcoded
    label. Uses ``AsyncClient.list()`` (Ollama's model-listing endpoint) so
    it never invokes the model itself and stays fast to poll.
    """
    host, model = settings.OLLAMA_URL, settings.OLLAMA_MODEL
    try:
        client = AsyncClient(host=host, timeout=3.0)
        result = await client.list()
    except Exception:
        # Deliberately broad: any failure here means "can't confirm it's up"
        # — this is a status indicator, not something that should ever raise
        # and break the page that's just trying to show a health dot.
        return {"connected": False, "host": host, "model": model, "model_available": False}

    available = {m.model for m in (result.models or [])}
    model_available = model in available or any(m.split(":")[0] == model.split(":")[0] for m in available)
    return {"connected": True, "host": host, "model": model, "model_available": model_available}
