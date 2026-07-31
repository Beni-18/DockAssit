"""
Docker API router.

Exposes endpoints for listing containers, retrieving stats and logs,
executing lifecycle actions, and querying Docker system information.
"""

from fastapi import APIRouter, Depends
from typing import List

from schemas.docker_schema import (
    ContainerResponse,
    ContainerStatsResponse,
    DockerActionRequest,
    DockerActionResponse,
    DockerInfoResponse,
)
from services.docker_service import DockerService
from config.security import get_current_user_id

router = APIRouter()


@router.get("/containers", response_model=List[ContainerResponse])
def list_containers(_: int = Depends(get_current_user_id)):
    """List all Docker containers (running + stopped)."""
    return DockerService.list_containers()


@router.get("/containers/{container_id}", response_model=ContainerResponse)
def get_container(container_id: str, _: int = Depends(get_current_user_id)):
    """Get details of a specific container."""
    return DockerService.get_container(container_id)


@router.get("/containers/{container_id}/stats", response_model=ContainerStatsResponse)
def get_container_stats(container_id: str, _: int = Depends(get_current_user_id)):
    """Get live CPU/memory/network stats for a container."""
    return DockerService.get_stats(container_id)


@router.get("/containers/{container_id}/logs")
def get_container_logs(
    container_id: str,
    tail: int = 100,
    _: int = Depends(get_current_user_id),
):
    """Fetch the last N log lines from a container."""
    return DockerService.get_logs(container_id, tail)


@router.post("/execute", response_model=DockerActionResponse)
def execute_action(
    payload: DockerActionRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Execute a Docker action (start, stop, restart, remove) on a container."""
    return DockerService.execute_action(payload.action, payload.target, user_id)


@router.get("/info", response_model=DockerInfoResponse)
def get_docker_info(_: int = Depends(get_current_user_id)):
    """Get Docker system information."""
    return DockerService.get_info()
