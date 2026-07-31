"""
Docker API router.

Exposes RESTful endpoints for querying and managing Docker resources.
Every route validates its request, delegates to the injected
``DockerService``, and returns the result — all SDK interaction and
exception translation happens in ``services.docker_service``.
"""

from typing import Any, Callable

from fastapi import APIRouter, Depends, HTTPException, Query, status

from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.docker_schema import (
    ContainerActionResponse,
    ContainerDetail,
    ContainerLogsResponse,
    ContainerStatsResponse,
    ContainerSummary,
    DockerInfoResponse,
    DockerVersionResponse,
    ImageActionResponse,
    ImageDetail,
    ImageSummary,
    NetworkSummary,
    PullImageRequest,
    PullImageResponse,
    VolumeSummary,
)
from services.docker_service import (
    ContainerNotFoundError,
    DockerAPIError,
    DockerDaemonUnavailableError,
    DockerPermissionError,
    DockerService,
    DockerServiceError,
    DockerTimeoutError,
    ImageNotFoundError,
    get_docker_service,
)

router = APIRouter(dependencies=[Depends(get_current_user)])


def _run(fn: Callable[[], Any]) -> Any:
    """Execute a Docker service call, translating service errors into HTTP errors."""
    try:
        return fn()
    except (ContainerNotFoundError, ImageNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DockerPermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except DockerTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc)) from exc
    except DockerDaemonUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except DockerAPIError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except DockerServiceError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------

@router.get("/info", response_model=DockerInfoResponse)
def docker_info(docker_service: DockerService = Depends(get_docker_service)) -> dict:
    """Return a summary of the Docker daemon's current state."""
    return _run(docker_service.docker_info)


@router.get("/version", response_model=DockerVersionResponse)
def docker_version(docker_service: DockerService = Depends(get_docker_service)) -> dict:
    """Return Docker Engine version metadata."""
    return _run(docker_service.docker_version)


# ---------------------------------------------------------------------------
# Containers
# ---------------------------------------------------------------------------

@router.get("/containers", response_model=list[ContainerSummary])
def list_containers(
    all_containers: bool = Query(True, alias="all", description="Include stopped containers"),
    docker_service: DockerService = Depends(get_docker_service),
) -> list[dict]:
    """List Docker containers."""
    return _run(lambda: docker_service.list_containers(all_containers=all_containers))


@router.get("/containers/{container_id}", response_model=ContainerDetail)
def get_container(
    container_id: str,
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Get detailed information for a specific container."""
    return _run(lambda: docker_service.get_container(container_id))


@router.get("/logs/{container_id}", response_model=ContainerLogsResponse)
def get_container_logs(
    container_id: str,
    tail: int = Query(100, ge=1, le=1000, description="Number of log lines to return"),
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Fetch the tail of the container logs."""
    return _run(lambda: docker_service.get_container_logs(container_id, tail=tail))


@router.get("/stats/{container_id}", response_model=ContainerStatsResponse)
def get_container_stats(
    container_id: str,
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Get a live snapshot of container resource usage."""
    return _run(lambda: docker_service.get_container_stats(container_id))


@router.post("/start/{container_id}", response_model=ContainerActionResponse)
def start_container(
    container_id: str,
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Start a stopped container."""
    return _run(lambda: docker_service.start_container(container_id))


@router.post("/stop/{container_id}", response_model=ContainerActionResponse)
def stop_container(
    container_id: str,
    timeout: int = Query(10, ge=0, description="Seconds to wait before killing"),
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Stop a running container gracefully."""
    return _run(lambda: docker_service.stop_container(container_id, timeout=timeout))


@router.post("/restart/{container_id}", response_model=ContainerActionResponse)
def restart_container(
    container_id: str,
    timeout: int = Query(10, ge=0, description="Seconds to wait before killing during restart"),
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Restart a container."""
    return _run(lambda: docker_service.restart_container(container_id, timeout=timeout))


@router.delete("/container/{container_id}", response_model=ContainerActionResponse)
def remove_container(
    container_id: str,
    force: bool = Query(False, description="Kill the container before removing if running"),
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Remove a container."""
    return _run(lambda: docker_service.remove_container(container_id, force=force))


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------

@router.get("/images", response_model=list[ImageSummary])
def list_images(docker_service: DockerService = Depends(get_docker_service)) -> list[dict]:
    """List locally available Docker images."""
    return _run(docker_service.list_images)


@router.get("/images/{image_id}", response_model=ImageDetail)
def inspect_image(
    image_id: str,
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Get detailed inspect information for a specific image."""
    return _run(lambda: docker_service.inspect_image(image_id))


@router.delete("/image/{image_id}", response_model=ImageActionResponse)
def remove_image(
    image_id: str,
    force: bool = Query(False, description="Force removal even if the image is in use"),
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Remove an image."""
    return _run(lambda: docker_service.remove_image(image_id, force=force))


@router.post("/pull", response_model=PullImageResponse)
def pull_image(
    payload: PullImageRequest,
    docker_service: DockerService = Depends(get_docker_service),
) -> dict:
    """Pull an image (and tag) from a registry."""
    return _run(lambda: docker_service.pull_image(payload.image, tag=payload.tag))


# ---------------------------------------------------------------------------
# Networks, Volumes
# ---------------------------------------------------------------------------

@router.get("/networks", response_model=list[NetworkSummary])
def list_networks(docker_service: DockerService = Depends(get_docker_service)) -> list[dict]:
    """List Docker networks."""
    return _run(docker_service.list_networks)


@router.get("/volumes", response_model=list[VolumeSummary])
def list_volumes(docker_service: DockerService = Depends(get_docker_service)) -> list[dict]:
    """List Docker volumes."""
    return _run(docker_service.list_volumes)
