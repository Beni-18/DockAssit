"""
Docker API request and response schemas.

Pydantic v2 models for every Docker resource type exposed by the API:
containers, images, volumes, networks, logs, and runtime stats.
Raw Docker SDK objects are never returned to callers — all data passes
through these schemas for validation and serialisation.
"""

from typing import Any, Optional

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
    created: Optional[str] = Field(default=None, description="ISO 8601 creation timestamp.")
    ports: dict[str, Any] = Field(default_factory=dict, description="Exposed port bindings.")


class ContainerDetail(ContainerSummary):
    """Full container detail, extending the summary with runtime metadata."""

    command: Optional[str] = Field(default=None, description="Command the container was started with.")
    labels: dict[str, str] = Field(default_factory=dict, description="Container labels.")
    restart_policy: Optional[str] = Field(default=None, description="Configured restart policy.")


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
    created: Optional[str] = Field(default=None, description="ISO 8601 creation timestamp.")


class ImageDetail(BaseModel):
    """Full image detail returned by ``docker inspect`` on an image."""

    id: str = Field(..., description="Full image ID (sha256 digest).")
    tags: list[str] = Field(default_factory=list, description="Repository tags.")
    size: int = Field(..., description="Uncompressed image size in bytes.")
    created: Optional[str] = Field(default=None, description="ISO 8601 creation timestamp.")
    architecture: Optional[str] = Field(default=None, description="Target CPU architecture.")
    os: Optional[str] = Field(default=None, description="Target operating system.")
    repo_digests: list[str] = Field(default_factory=list, description="Content-addressable repository digests.")
    labels: dict[str, str] = Field(default_factory=dict, description="Image labels.")


class ImageActionResponse(BaseModel):
    """Result of an image lifecycle action (remove)."""

    image_id: str
    action: str
    success: bool
    message: str


class PullImageRequest(BaseModel):
    """Request payload for pulling an image from a registry."""

    image: str = Field(
        ...,
        min_length=1,
        description="Image repository name, e.g. 'nginx' or 'redis'.",
        examples=["nginx"],
    )
    tag: str = Field(
        default="latest",
        min_length=1,
        description="Image tag to pull.",
        examples=["latest"],
    )


class PullImageResponse(BaseModel):
    """Result of a successful image pull."""

    image: str = Field(..., description="Repository name that was pulled.")
    tag: str = Field(..., description="Tag that was pulled.")
    id: str = Field(..., description="Short ID of the pulled image.")
    tags: list[str] = Field(default_factory=list, description="Repository tags now associated with the image.")
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Volumes
# ---------------------------------------------------------------------------

class VolumeSummary(BaseModel):
    """Compact volume representation."""

    name: str
    driver: str
    mountpoint: str
    created: Optional[str] = None
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
    created: Optional[str] = None


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------

class DockerInfoResponse(BaseModel):
    """Summary of the Docker daemon's current state, as returned by ``docker info``."""

    containers: int = Field(..., description="Total number of containers.")
    containers_running: int = Field(..., description="Number of running containers.")
    containers_paused: int = Field(..., description="Number of paused containers.")
    containers_stopped: int = Field(..., description="Number of stopped containers.")
    images: int = Field(..., description="Total number of images.")
    server_version: str = Field(..., description="Docker Engine server version.")
    operating_system: str = Field(..., description="Host operating system.")
    architecture: str = Field(..., description="Host CPU architecture.")
    kernel_version: str = Field(..., description="Host kernel version.")
    total_memory: int = Field(..., description="Total host memory in bytes.")
    ncpu: int = Field(..., description="Number of CPUs available to the daemon.")


class DockerVersionResponse(BaseModel):
    """Docker Engine version metadata, as returned by ``docker version``."""

    version: str = Field(..., description="Docker Engine version.")
    api_version: str = Field(..., description="Docker Engine API version.")
    min_api_version: Optional[str] = Field(default=None, description="Oldest API version supported by the daemon.")
    go_version: str = Field(..., description="Go runtime version used to build the daemon.")
    os: str = Field(..., description="Daemon operating system.")
    arch: str = Field(..., description="Daemon CPU architecture.")
    kernel_version: str = Field(..., description="Host kernel version.")
    build_time: Optional[str] = Field(default=None, description="Daemon build timestamp.")
