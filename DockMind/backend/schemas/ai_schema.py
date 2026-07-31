"""
AI request and response schemas.

Pydantic v2 models that define the contract between the API layer
and the AI service. The ``InterpretRequest`` / ``DockerIntent``
pair is used by the ``POST /api/v1/ai/interpret`` endpoint.
"""

from typing import Optional
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
        examples=["nginx"],
    )
