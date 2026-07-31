"""
Docker service — Docker SDK wrapper for all container and resource operations.

This module is the *only* place in the application that calls the Docker SDK.
Every method returns plain Python dictionaries (never raw SDK objects) so that
callers receive JSON-serialisable data without needing to know SDK internals.

Key design decisions:
- A fresh SDK client is obtained per call via ``_client()``. This is safe and
  correct because ``docker.from_env()`` reuses the underlying connection pool.
- ``subprocess`` and shell commands are strictly forbidden.
- Every Docker exception is caught here and converted to a meaningful
  ``HTTPException`` before it propagates to the API layer.
"""

import docker
import docker.errors
from fastapi import HTTPException, status

from utils.logger import logger


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _client() -> docker.DockerClient:
    """
    Return a Docker SDK client connected to the local daemon via environment.

    Raises
    ------
    HTTPException (503)
        If the Docker daemon is not reachable.
    """
    try:
        return docker.from_env()
    except docker.errors.DockerException as exc:
        logger.error("Cannot connect to Docker daemon: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to the Docker daemon. Ensure it is running.",
        ) from exc


def _serialize_container(c: docker.models.containers.Container) -> dict:
    """Produce a JSON-serialisable dict from a Docker SDK Container object."""
    return {
        "id": c.short_id,
        "name": c.name,
        "image": c.image.tags[0] if c.image.tags else c.image.short_id,
        "status": c.status,
        "created": c.attrs.get("Created"),
        "ports": c.ports or {},
        "command": c.attrs.get("Config", {}).get("Cmd"),
        "labels": c.labels or {},
        "restart_policy": (c.attrs.get("HostConfig") or {}).get("RestartPolicy", {}).get("Name"),
    }


# ---------------------------------------------------------------------------
# Container operations
# ---------------------------------------------------------------------------

def list_containers(all_containers: bool = True) -> list[dict]:
    """
    Return a list of all containers known to the Docker daemon.

    Parameters
    ----------
    all_containers:
        When ``True`` (default) include stopped containers. Pass ``False``
        to return only running containers.
    """
    client = _client()
    containers = client.containers.list(all=all_containers)
    return [_serialize_container(c) for c in containers]


def get_container(container_id: str) -> dict:
    """
    Return detailed information for a single container.

    Raises
    ------
    HTTPException (404)
        If no container with the given ID or name exists.
    """
    client = _client()
    try:
        return _serialize_container(client.containers.get(container_id))
    except docker.errors.NotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container '{container_id}' not found.",
        )


def start_container(container_id: str) -> dict:
    """
    Start a stopped container.

    Raises
    ------
    HTTPException (404)
        If the container does not exist.
    HTTPException (409)
        If the container is already running.
    HTTPException (500)
        On unexpected Docker API errors.
    """
    client = _client()
    try:
        c = client.containers.get(container_id)
        c.start()
        logger.info("Container started: %s", container_id)
        return {"container_id": c.short_id, "action": "start", "success": True,
                "message": f"Container '{c.name}' started successfully."}
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Container '{container_id}' not found.")
    except docker.errors.APIError as exc:
        logger.error("Docker API error starting %s: %s", container_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(exc)) from exc


def stop_container(container_id: str, timeout: int = 10) -> dict:
    """
    Gracefully stop a running container.

    Parameters
    ----------
    container_id:
        Container name or short ID.
    timeout:
        Seconds to wait before sending SIGKILL. Defaults to 10.
    """
    client = _client()
    try:
        c = client.containers.get(container_id)
        c.stop(timeout=timeout)
        logger.info("Container stopped: %s", container_id)
        return {"container_id": c.short_id, "action": "stop", "success": True,
                "message": f"Container '{c.name}' stopped successfully."}
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Container '{container_id}' not found.")
    except docker.errors.APIError as exc:
        logger.error("Docker API error stopping %s: %s", container_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(exc)) from exc


def restart_container(container_id: str, timeout: int = 10) -> dict:
    """Restart a container (stop then start atomically via the Docker daemon)."""
    client = _client()
    try:
        c = client.containers.get(container_id)
        c.restart(timeout=timeout)
        logger.info("Container restarted: %s", container_id)
        return {"container_id": c.short_id, "action": "restart", "success": True,
                "message": f"Container '{c.name}' restarted successfully."}
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Container '{container_id}' not found.")
    except docker.errors.APIError as exc:
        logger.error("Docker API error restarting %s: %s", container_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(exc)) from exc


def remove_container(container_id: str, force: bool = False) -> dict:
    """
    Remove a container.

    Parameters
    ----------
    force:
        When ``True``, kill a running container before removing it.
        Defaults to ``False`` (safe removal only).
    """
    client = _client()
    try:
        c = client.containers.get(container_id)
        name = c.name
        short_id = c.short_id
        c.remove(force=force)
        logger.info("Container removed: %s (force=%s)", container_id, force)
        return {"container_id": short_id, "action": "remove", "success": True,
                "message": f"Container '{name}' removed successfully."}
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Container '{container_id}' not found.")
    except docker.errors.APIError as exc:
        logger.error("Docker API error removing %s: %s", container_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(exc)) from exc


def get_container_logs(container_id: str, tail: int = 100, timestamps: bool = True) -> dict:
    """
    Return the last ``tail`` log lines from a container.

    Parameters
    ----------
    tail:
        Number of log lines to return. Defaults to 100.
    timestamps:
        Prefix each log line with its RFC 3339 timestamp when ``True``.
    """
    client = _client()
    try:
        c = client.containers.get(container_id)
        raw_logs: bytes = c.logs(tail=tail, timestamps=timestamps)
        return {
            "container_id": c.short_id,
            "logs": raw_logs.decode("utf-8", errors="replace"),
        }
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Container '{container_id}' not found.")
    except docker.errors.APIError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(exc)) from exc


def get_container_stats(container_id: str) -> dict:
    """
    Return a single live resource usage snapshot for a running container.

    CPU percentage is calculated using the standard Docker formula across
    all online CPUs to produce a value comparable to ``docker stats``.
    """
    client = _client()
    try:
        c = client.containers.get(container_id)
        s = c.stats(stream=False)

        # ── CPU ──────────────────────────────────────────────────────────────
        cpu_delta = (
            s["cpu_stats"]["cpu_usage"]["total_usage"]
            - s["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = s["cpu_stats"].get("system_cpu_usage", 0) - s["precpu_stats"].get(
            "system_cpu_usage", 0
        )
        num_cpus = s["cpu_stats"].get("online_cpus", 1)
        cpu_percent = (cpu_delta / system_delta * num_cpus * 100.0) if system_delta > 0 else 0.0

        # ── Memory ───────────────────────────────────────────────────────────
        mem = s.get("memory_stats", {})
        memory_usage = mem.get("usage", 0)
        memory_limit = mem.get("limit", 1)

        # ── Network ──────────────────────────────────────────────────────────
        networks = s.get("networks", {})
        rx = sum(v.get("rx_bytes", 0) for v in networks.values())
        tx = sum(v.get("tx_bytes", 0) for v in networks.values())

        return {
            "container_id": c.short_id,
            "name": c.name,
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage": memory_usage,
            "memory_limit": memory_limit,
            "memory_percent": round((memory_usage / memory_limit) * 100.0, 2),
            "network_rx": rx,
            "network_tx": tx,
        }
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Container '{container_id}' not found.")
    except docker.errors.APIError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Image operations
# ---------------------------------------------------------------------------

def list_images() -> list[dict]:
    """Return a list of all images stored in the local Docker daemon."""
    client = _client()
    images = client.images.list()
    return [
        {
            "id": img.short_id.replace("sha256:", ""),
            "tags": img.tags,
            "size": img.attrs.get("Size", 0),
            "created": img.attrs.get("Created"),
        }
        for img in images
    ]


# ---------------------------------------------------------------------------
# Volume operations
# ---------------------------------------------------------------------------

def list_volumes() -> list[dict]:
    """Return a list of all Docker volumes."""
    client = _client()
    volumes = client.volumes.list()
    return [
        {
            "name": v.name,
            "driver": v.attrs.get("Driver", "unknown"),
            "mountpoint": v.attrs.get("Mountpoint", ""),
            "created": v.attrs.get("CreatedAt"),
            "labels": v.attrs.get("Labels") or {},
        }
        for v in volumes
    ]


# ---------------------------------------------------------------------------
# Network operations
# ---------------------------------------------------------------------------

def list_networks() -> list[dict]:
    """Return a list of all Docker networks."""
    client = _client()
    networks = client.networks.list()
    return [
        {
            "id": n.short_id,
            "name": n.name,
            "driver": n.attrs.get("Driver", "unknown"),
            "scope": n.attrs.get("Scope", "unknown"),
            "internal": n.attrs.get("Internal", False),
            "created": n.attrs.get("Created"),
        }
        for n in networks
    ]
