"""
AI request and response schemas.

Pydantic v2 models that define the contract between the API layer
and the AI service. The ``InterpretRequest`` / ``InterpretResponse``
pair is used by the ``POST /api/v1/ai/interpret`` endpoint.
"""

from pydantic import BaseModel, Field, field_validator


class InterpretRequest(BaseModel):
    """Inbound payload containing the user's natural language instruction."""

    prompt: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Natural language Docker management instruction.",
        examples=["Restart the Redis container"],
    )

    @field_validator("prompt")
    @classmethod
    def prompt_must_not_be_blank(cls, value: str) -> str:
        """Reject prompts that consist solely of whitespace."""
        if not value.strip():
            raise ValueError("Prompt must not be blank.")
        return value.strip()


class DockerIntent(BaseModel):
    """
    Structured Docker intent parsed from a natural language prompt.

    All three fields are required in the AI response; optional metadata
    fields (``confidence``, ``message``) may or may not be present.
    """

    action: str = Field(
        ...,
        description="Docker lifecycle action (e.g. start, stop, restart, remove, list, logs).",
        examples=["restart"],
    )
    resource: str = Field(
        ...,
        description="Docker resource type targeted by the action (container, image, volume, network).",
        examples=["container"],
    )
    target: str = Field(
        ...,
        description="Name or ID of the target resource.",
        examples=["redis"],
    )
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Model confidence score for the parsed intent (0.0 – 1.0).",
    )
    message: str | None = Field(
        default=None,
        description="Optional human-readable explanation of the parsed intent.",
    )


class InterpretResponse(BaseModel):
    """Response returned by ``POST /api/v1/ai/interpret``."""

    intent: DockerIntent
    raw_response: str = Field(
        ...,
        description="The raw JSON string returned by Gemini before parsing.",
    )
