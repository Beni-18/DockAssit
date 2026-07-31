"""
AI service — natural language → structured Docker intent via Google Gemini.

This module is the *only* place in the application that communicates with the
Gemini API. It accepts a raw natural language prompt, sends it to Gemini with
a carefully engineered system prompt, parses the JSON response, and returns a
validated ``DockerIntent`` object.

It does **not** execute any Docker commands — that responsibility belongs
exclusively to ``DockerService``.
"""

import json
import re

import google.generativeai as genai
from fastapi import HTTPException, status

from config.config import settings
from schemas.ai_schema import DockerIntent
from utils.logger import logger

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
# Written to force Gemini into returning *only* a JSON object with the exact
# keys the application expects. Any deviation (markdown fences, prose, extra
# keys) is handled by the robust parser below.
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """
You are DockAssist, an AI assistant that translates natural language Docker
management requests into structured JSON.

RULES (follow exactly — no exceptions):
1. Respond with ONLY a single JSON object. No markdown, no code fences,
   no explanations, no surrounding text of any kind.
2. The JSON object MUST contain exactly these keys:
   - "action"   : the Docker action (start | stop | restart | remove | list
                  | logs | stats | inspect | pause | unpause)
   - "resource" : the Docker resource type (container | image | volume | network)
   - "target"   : the name or ID of the resource ("all" when listing everything)
   - "confidence": a float between 0.0 and 1.0 representing your certainty
   - "message"  : a single concise sentence describing what you understood
3. Use lowercase for all values.
4. If the request is ambiguous, use the most reasonable interpretation and
   reflect your uncertainty in the confidence score.

EXAMPLE INPUT : "restart the redis container"
EXAMPLE OUTPUT: {"action":"restart","resource":"container","target":"redis","confidence":0.99,"message":"Restart the container named redis."}
""".strip()

# Compiled once at module load — strips markdown code fences that Gemini
# occasionally wraps around its JSON output despite being told not to.
_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def _configure_gemini() -> genai.GenerativeModel:
    """
    Initialise the Gemini client with the API key from application settings.

    Returns a ready-to-use ``GenerativeModel`` instance configured for the
    ``gemini-1.5-flash`` model, which offers the best speed/cost balance for
    structured extraction tasks.
    """
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=_SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.1,        # near-deterministic output for structured tasks
            max_output_tokens=256,  # intent JSON is short; cap prevents runaway responses
        ),
    )


def _extract_json(raw: str) -> dict:
    """
    Extract and parse JSON from Gemini's raw text response.

    Handles two common failure modes:
    - Gemini wraps the JSON in a markdown code fence despite instructions.
    - Gemini includes prose before or after the JSON object.

    Parameters
    ----------
    raw:
        The raw string returned by the Gemini API.

    Returns
    -------
    dict
        The parsed JSON payload.

    Raises
    ------
    HTTPException (422)
        If the response cannot be parsed into valid JSON after all
        recovery attempts.
    """
    text = raw.strip()

    # Attempt 1 — direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Attempt 2 — strip markdown fences and retry
    fence_match = _JSON_FENCE_RE.search(text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # Attempt 3 — extract the first {...} block
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end > brace_start:
        try:
            return json.loads(text[brace_start : brace_end + 1])
        except json.JSONDecodeError:
            pass

    logger.warning("Gemini returned unparseable response: %s", text[:200])
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="AI returned a response that could not be parsed as valid JSON.",
    )


def _validate_intent(data: dict) -> DockerIntent:
    """
    Validate the parsed Gemini JSON payload against the ``DockerIntent`` schema.

    Parameters
    ----------
    data:
        Dictionary parsed from the Gemini response.

    Returns
    -------
    DockerIntent
        Validated intent object.

    Raises
    ------
    HTTPException (422)
        If required fields are absent or fail Pydantic validation.
    """
    required_keys = {"action", "resource", "target"}
    missing = required_keys - data.keys()
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI response is missing required field(s): {', '.join(sorted(missing))}.",
        )
    try:
        return DockerIntent(**data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI response failed schema validation: {exc}",
        ) from exc


async def interpret_prompt(prompt: str) -> tuple[DockerIntent, str]:
    """
    Send a natural language prompt to Gemini and return a validated Docker intent.

    This is the sole public entry point for the AI service. It is intentionally
    ``async`` so it does not block the event loop while waiting on the Gemini API.

    Parameters
    ----------
    prompt:
        The user's natural language instruction (already validated by the schema).

    Returns
    -------
    tuple[DockerIntent, str]
        A ``(intent, raw_response)`` pair where ``raw_response`` is the
        original string returned by Gemini, preserved for transparency.

    Raises
    ------
    HTTPException (503)
        If the Gemini API is unreachable or returns an error status.
    HTTPException (422)
        If the Gemini response cannot be parsed or validated.
    """
    model = _configure_gemini()

    logger.info("Sending prompt to Gemini: %s", prompt[:100])
    try:
        response = await model.generate_content_async(prompt)
        raw = response.text
    except Exception as exc:
        logger.error("Gemini API error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI service is currently unavailable. Please try again later.",
        ) from exc

    logger.debug("Gemini raw response: %s", raw[:300])

    parsed = _extract_json(raw)
    intent = _validate_intent(parsed)

    logger.info(
        "Intent parsed — action=%s resource=%s target=%s confidence=%s",
        intent.action,
        intent.resource,
        intent.target,
        intent.confidence,
    )
    return intent, raw
