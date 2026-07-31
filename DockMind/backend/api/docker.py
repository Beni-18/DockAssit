"""
Docker API router.

Exposes RESTful endpoints for querying and managing Docker resources.
All routes delegate to ``services.docker_service`` which handles SDK
interaction and exception translation.
"""

from fastapi import APIRouter, Query

from schemas.docker_schema import (
    ContainerActionResponse,
    ContainerDetail,
    ContainerLogsResponse,
    ContainerStatsResponse,
    ContainerSummary,
    ImageSummary,
    NetworkSummary,
    VolumeSummary,
)
from services import docker_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Containers
# ---------------------------------------------------------------------------

@router.get("/containers", response_model=list[ContainerSummary])
def list_containers(
    all_containers: bool = Query(True, alias="all", description="Include stopped containers"),
) -> list[dict]:
    """List Docker containers."""
    return docker_service.list_containers(all_containers=all_containers)


@router.get("/containers/{container_id}", response_model=ContainerDetail)
def get_container(container_id: str) -> dict:
    """Get detailed information for a specific container."""
    return docker_service.get_container(container_id)


@router.get("/containers/{container_id}/stats", response_model=ContainerStatsResponse)
def get_container_stats(container_id: str) -> dict:
    """Get a live snapshot of container resource usage."""
    return docker_service.get_container_stats(container_id)


@router.get("/containers/{container_id}/logs", response_model=ContainerLogsResponse)
def get_container_logs(
    container_id: str,
    tail: int = Query(100, ge=1, le=1000, description="Number of log lines to return"),
) -> dict:
    """Fetch the tail of the container logs."""
    return docker_service.get_container_logs(container_id, tail=tail)


@router.post("/containers/{container_id}/start", response_model=ContainerActionResponse)
def start_container(container_id: str) -> dict:
    """Start a stopped container."""
    return docker_service.start_container(container_id)


@router.post("/containers/{container_id}/stop", response_model=ContainerActionResponse)
def stop_container(
    container_id: str,
    timeout: int = Query(10, ge=0, description="Seconds to wait before killing"),
) -> dict:
    """Stop a running container gracefully."""
    return docker_service.stop_container(container_id, timeout=timeout)


@router.post("/containers/{container_id}/restart", response_model=ContainerActionResponse)
def restart_container(
    container_id: str,
    timeout: int = Query(10, ge=0, description="Seconds to wait before killing during restart"),
) -> dict:
    """Restart a container."""
    return docker_service.restart_container(container_id, timeout=timeout)


@router.delete("/containers/{container_id}", response_model=ContainerActionResponse)
def remove_container(
    container_id: str,
    force: bool = Query(False, description="Kill the container before removing if running"),
) -> dict:
    """Remove a container."""
    return docker_service.remove_container(container_id, force=force)


# ---------------------------------------------------------------------------
# Images, Volumes, Networks
# ---------------------------------------------------------------------------

@router.get("/images", response_model=list[ImageSummary])
def list_images() -> list[dict]:
    """List locally available Docker images."""
    return docker_service.list_images()


@router.get("/volumes", response_model=list[VolumeSummary])
def list_volumes() -> list[dict]:
    """List Docker volumes."""
    return docker_service.list_volumes()


@router.get("/networks", response_model=list[NetworkSummary])
def list_networks() -> list[dict]:
    """List Docker networks."""
    return docker_service.list_networks()
