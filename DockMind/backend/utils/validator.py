"""
Input validation utilities.

Provides reusable validators for Docker-related inputs such as
action names, container names, and pagination parameters.
"""

import re
from fastapi import HTTPException


ALLOWED_DOCKER_ACTIONS = {"start", "stop", "restart", "remove", "pause", "unpause", "logs"}

# Container names: alphanumeric, underscores, hyphens, dots
CONTAINER_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-\.]{0,254}$")


def validate_docker_action(action: str) -> str:
    """Validate that the action is a supported Docker operation."""
    action = action.strip().lower()
    if action not in ALLOWED_DOCKER_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported Docker action: '{action}'. Allowed: {ALLOWED_DOCKER_ACTIONS}",
        )
    return action


def validate_container_name(name: str) -> str:
    """Validate Docker container name format."""
    name = name.strip()
    if not CONTAINER_NAME_PATTERN.match(name):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid container name: '{name}'. Only alphanumeric, hyphens, underscores, and dots allowed.",
        )
    return name


def validate_pagination(skip: int, limit: int) -> None:
    """Validate pagination parameters."""
    if skip < 0:
        raise HTTPException(status_code=400, detail="'skip' must be >= 0")
    if limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="'limit' must be between 1 and 200")
