"""
AI request and response schemas.

Pydantic v2 models that define the contract between the API layer
and the AI service. The ``InterpretRequest`` / ``DockerIntent``
pair is used by the ``POST /api/v1/ai/interpret`` endpoint, and the
``ChatRequest`` / ``ChatResponse`` pair is used by the
``POST /api/v1/ai/chat`` endpoint.
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
        description=(
            "Docker action: start, stop, restart, remove, logs, stats, inspect, "
            "pull, list, info, or version."
        ),
        examples=["restart"],
    )
    resource: str = Field(
        ...,
        description="Docker resource type targeted by the action (container, image, volume, network, system).",
        examples=["container"],
    )
    target: Optional[str] = Field(
        default=None,
        description=(
            "Name or ID of the target resource. Required for actions on a single "
            "resource (start/stop/restart/remove/logs/stats/inspect/pull); omitted "
            "for actions on all resources of a type (list/info/version)."
        ),
        examples=["nginx"],
    )


class ChatRequest(BaseModel):
    """Inbound payload containing a free-form prompt for the AI model."""

    prompt: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Natural language prompt to send to the AI model.",
        examples=["Explain Docker volumes."],
    )

    @field_validator("prompt")
    @classmethod
    def prompt_must_not_be_blank(cls, value: str) -> str:
        """Reject prompts that consist solely of whitespace."""
        if not value.strip():
            raise ValueError("Prompt must not be blank.")
        return value.strip()


class ChatResponse(BaseModel):
    """AI-generated reply to a chat prompt."""

    response: str = Field(
        ...,
        description="The AI model's generated response.",
        examples=["Docker volumes are the preferred mechanism for persisting data..."],
    )


class AiExecuteRequest(BaseModel):
    """Inbound payload for the unified natural-language execution endpoint."""

    prompt: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Natural language Docker instruction or question.",
        examples=["Restart the nginx container"],
    )
    confirmed: bool = Field(
        default=False,
        description=(
            "Set true to proceed with a bulk action previously previewed via "
            "needs_confirmation=True in the response to this same prompt."
        ),
    )

    @field_validator("prompt")
    @classmethod
    def prompt_must_not_be_blank(cls, value: str) -> str:
        """Reject prompts that consist solely of whitespace."""
        if not value.strip():
            raise ValueError("Prompt must not be blank.")
        return value.strip()


class AiExecuteResponse(BaseModel):
    """
    Result of interpreting and (when applicable) executing a natural
    language prompt against the Docker SDK.
    """

    response: str = Field(
        ...,
        description="Human-readable summary of what happened, or a conversational reply.",
    )
    action: Optional[str] = Field(
        default=None,
        description="The Docker action that was identified, if any.",
    )
    target: Optional[str] = Field(
        default=None,
        description="The resource the action targeted, if any.",
    )
    success: Optional[bool] = Field(
        default=None,
        description="Whether the identified action succeeded. Omitted for pure chat replies.",
    )
    needs_confirmation: bool = Field(
        default=False,
        description=(
            "True when this is a preview of a bulk action awaiting confirmation — "
            "nothing was executed yet. Resend the same prompt with confirmed=true to proceed."
        ),
    )
