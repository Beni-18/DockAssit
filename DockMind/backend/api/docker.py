from fastapi import APIRouter, Depends
from typing import List

from schemas.docker_schema import (
    ContainerResponse,
    ContainerStatsResponse,
    DockerActionRequest,
    DockerActionResponse,
    DockerInfoResponse,
    ImageResponse,
    VolumeResponse,
    NetworkResponse,
    RunContainerRequest,
    DeployComposeRequest,
    CreateNetworkRequest,
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


@router.get("/images", response_model=List[ImageResponse])
def list_images(_: int = Depends(get_current_user_id)):
    """List all Docker images."""
    return DockerService.list_images()


@router.get("/volumes", response_model=List[VolumeResponse])
def list_volumes(_: int = Depends(get_current_user_id)):
    """List all Docker volumes."""
    return DockerService.list_volumes()


@router.get("/networks", response_model=List[NetworkResponse])
def list_networks(_: int = Depends(get_current_user_id)):
    """List all Docker networks."""
    return DockerService.list_networks()


@router.post("/containers", response_model=DockerActionResponse)
def run_container(
    payload: RunContainerRequest,
    _: int = Depends(get_current_user_id),
):
    """Run a new custom Docker container."""
    res = DockerService.run_container(
        image=payload.image,
        name=payload.name,
        ports=payload.ports,
        environment=payload.environment,
    )
    return DockerActionResponse(
        success=res["success"],
        action=res["action"],
        target=res["target"],
        message=res["message"],
    )


@router.post("/compose", response_model=DockerActionResponse)
def deploy_compose(
    payload: DeployComposeRequest,
    _: int = Depends(get_current_user_id),
):
    """Deploy a multi-container Docker Compose stack."""
    res = DockerService.deploy_compose(
        stack_name=payload.stack_name,
        compose_content=payload.compose_content,
    )
    return DockerActionResponse(
        success=res["success"],
        action=res["action"],
        target=res["target"],
        message=res["message"],
    )


@router.post("/networks", response_model=DockerActionResponse)
def create_network(
    payload: CreateNetworkRequest,
    _: int = Depends(get_current_user_id),
):
    """Create a new Docker network."""
    res = DockerService.create_network(
        name=payload.name,
        driver=payload.driver,
    )
    return DockerActionResponse(
        success=res["success"],
        action=res["action"],
        target=res["target"],
        message=res["message"],
    )
