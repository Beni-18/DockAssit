"""
AI service — natural language → structured Docker intent via Ollama.

This module communicates exclusively with a local Ollama instance.
It accepts a raw natural language prompt, sends it to Ollama with
a strictly engineered system prompt for JSON output, parses the response,
and returns a validated ``DockerIntent`` object.
"""

import json
from json import JSONDecodeError

import httpx
from fastapi import HTTPException, status

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
