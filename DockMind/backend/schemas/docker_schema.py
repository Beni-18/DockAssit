"""
Docker API request and response schemas.

Pydantic v2 models for every Docker resource type exposed by the API:
containers, images, volumes, networks, logs, and runtime stats.
Raw Docker SDK objects are never returned to callers — all data passes
through these schemas for validation and serialisation.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Containers
# ---------------------------------------------------------------------------

class ContainerSummary(BaseModel):
    """Compact container representation used in list responses."""

    id: str = Field(..., description="Short container ID.")
    name: str = Field(..., description="Container name.")
    image: str = Field(..., description="Image tag or short ID.")
    status: str = Field(..., description="Container status (running, exited, paused, …).")
    created: str | None = Field(default=None, description="ISO 8601 creation timestamp.")
    ports: dict[str, Any] = Field(default_factory=dict, description="Exposed port bindings.")


class ContainerDetail(ContainerSummary):
    """Full container detail, extending the summary with runtime metadata."""

    command: str | None = Field(default=None, description="Command the container was started with.")
    labels: dict[str, str] = Field(default_factory=dict, description="Container labels.")
    restart_policy: str | None = Field(default=None, description="Configured restart policy.")


class ContainerLogsResponse(BaseModel):
    """Log lines retrieved from a container."""

    container_id: str
    logs: str = Field(..., description="Log output, optionally with timestamps.")


class ContainerStatsResponse(BaseModel):
    """Live resource usage snapshot for a running container."""

    container_id: str
    name: str
    cpu_percent: float = Field(..., description="CPU usage percentage across all cores.")
    memory_usage: int = Field(..., description="Current memory consumption in bytes.")
    memory_limit: int = Field(..., description="Memory limit configured for the container in bytes.")
    memory_percent: float = Field(..., description="Memory usage as a percentage of the limit.")
    network_rx: int = Field(..., description="Total bytes received over all network interfaces.")
    network_tx: int = Field(..., description="Total bytes transmitted over all network interfaces.")


class ContainerActionResponse(BaseModel):
    """Result of a lifecycle action (start, stop, restart, remove)."""

    container_id: str
    action: str
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------

class ImageSummary(BaseModel):
    """Compact image representation."""

    id: str = Field(..., description="Short image ID.")
    tags: list[str] = Field(default_factory=list, description="Repository tags.")
    size: int = Field(..., description="Uncompressed image size in bytes.")
    created: str | None = Field(default=None, description="ISO 8601 creation timestamp.")


# ---------------------------------------------------------------------------
# Volumes
# ---------------------------------------------------------------------------

class VolumeSummary(BaseModel):
    """Compact volume representation."""

    name: str
    driver: str
    mountpoint: str
    created: str | None = None
    labels: dict[str, str] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Networks
# ---------------------------------------------------------------------------

class NetworkSummary(BaseModel):
    """Compact network representation."""

    id: str = Field(..., description="Short network ID.")
    name: str
    driver: str
    scope: str
    internal: bool
    created: str | None = None
