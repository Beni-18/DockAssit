"""
Docker service — Docker SDK wrapper for all container, image, network,
volume, and system operations.

This module is the *only* place in the application that calls the Docker
SDK. It contains no FastAPI-specific code: every failure is raised as a
``DockerServiceError`` subclass, and the API layer (``api/docker.py``) is
responsible for translating those into HTTP responses.

Key design decisions:
- ``DockerService`` holds no mutable state; each operation opens a fresh
  SDK client, so the cached instance returned by ``get_docker_service``
  can be shared across requests safely.
- ``subprocess`` and shell commands are strictly forbidden.
- Every method returns plain Python dictionaries (never raw SDK objects)
  so that callers receive JSON-serialisable data without needing to know
  SDK internals.
"""

import time
from functools import lru_cache
from typing import Any, Callable, Optional

import docker
import docker.errors
import requests.exceptions

from config.config import settings
from utils.logger import logger


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class DockerServiceError(Exception):
    """Base exception for all Docker service failures."""


class DockerDaemonUnavailableError(DockerServiceError):
    """Raised when the Docker daemon cannot be reached."""


class ContainerNotFoundError(DockerServiceError):
    """Raised when a referenced container does not exist."""


class ImageNotFoundError(DockerServiceError):
    """Raised when a referenced image does not exist."""


class DockerPermissionError(DockerServiceError):
    """Raised when the Docker daemon denies the requested operation."""


class DockerTimeoutError(DockerServiceError):
    """Raised when a Docker operation exceeds its time budget."""


class DockerAPIError(DockerServiceError):
    """Raised for unexpected Docker Engine API errors."""


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def _serialize_container(c: "docker.models.containers.Container") -> dict:
    """Produce a JSON-serialisable dict from a Docker SDK Container object."""
    cmd = c.attrs.get("Config", {}).get("Cmd")
    return {
        "id": c.short_id,
        "name": c.name,
        "image": c.image.tags[0] if c.image.tags else c.image.short_id,
        "status": c.status,
        # Only present when the image defines a HEALTHCHECK — "healthy",
        # "unhealthy", or "starting". None otherwise (not the same as status:
        # a container can be "running" with no health check configured at all).
        "health": (c.attrs.get("State", {}).get("Health") or {}).get("Status"),
        "created": c.attrs.get("Created"),
        # When it was last actually started (distinct from "created", which
        # is the container's creation time and doesn't change on restart) —
        # the real source for an "uptime" figure. Docker sets this to the
        # zero time ("0001-01-01T00:00:00Z") for a container that's never
        # been started, so callers should treat that as "no uptime" rather
        # than a real timestamp.
        "started_at": c.attrs.get("State", {}).get("StartedAt"),
        "ports": c.ports or {},
        # ``Cmd`` is a list in exec form (e.g. ["redis-server"]) or a string in shell form.
        "command": " ".join(cmd) if isinstance(cmd, list) else cmd,
        "labels": c.labels or {},
        "restart_policy": (c.attrs.get("HostConfig") or {}).get("RestartPolicy", {}).get("Name"),
    }


def _serialize_image(img: "docker.models.images.Image") -> dict:
    """Produce a JSON-serialisable summary dict from a Docker SDK Image object."""
    return {
        "id": img.short_id.replace("sha256:", ""),
        "tags": img.tags,
        "size": img.attrs.get("Size", 0),
        "created": img.attrs.get("Created"),
    }


def _serialize_image_detail(img: "docker.models.images.Image") -> dict:
    """Produce a JSON-serialisable detailed dict from a Docker SDK Image object."""
    return {
        "id": img.id.replace("sha256:", ""),
        "tags": img.tags,
        "size": img.attrs.get("Size", 0),
        "created": img.attrs.get("Created"),
        "architecture": img.attrs.get("Architecture"),
        "os": img.attrs.get("Os"),
        "repo_digests": img.attrs.get("RepoDigests", []),
        "labels": (img.attrs.get("Config") or {}).get("Labels") or {},
    }


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class DockerService:
    """
    Clean abstraction over the Docker Engine API, built on the official
    ``docker`` Python SDK.

    Every public method opens a fresh SDK client, so this class carries no
    mutable state itself and is safe to share as a single cached instance.
    """

    def __init__(self, base_url: Optional[str] = None) -> None:
        self._base_url = base_url

    def _new_client(self) -> docker.DockerClient:
        """Return a new Docker SDK client connected to the configured daemon."""
        if self._base_url:
            return docker.DockerClient(base_url=self._base_url)
        return docker.from_env()

    def _execute(
        self,
        operation: str,
        fn: Callable[[docker.DockerClient], Any],
        *,
        not_found_exc: type = DockerServiceError,
        not_found_message: str = "Resource not found.",
    ) -> Any:
        """
        Run ``fn`` against a fresh Docker client with unified logging,
        timing, and exception translation shared by every operation.
        """
        started_at = time.perf_counter()
        try:
            result = fn(self._new_client())
        except docker.errors.NotFound as exc:
            logger.warning("Docker operation not found: %s", operation)
            raise not_found_exc(not_found_message) from exc
        except docker.errors.APIError as exc:
            logger.error("Docker API error during %s: %s", operation, exc)
            if exc.status_code == 403:
                raise DockerPermissionError("Permission denied by the Docker daemon.") from exc
            raise DockerAPIError(str(exc)) from exc
        except docker.errors.DockerException as exc:
            logger.error("Docker daemon unreachable during %s: %s", operation, exc)
            raise DockerDaemonUnavailableError(
                "Cannot connect to the Docker daemon. Ensure it is running."
            ) from exc
        except requests.exceptions.Timeout as exc:
            logger.error("Docker operation timed out: %s", operation)
            raise DockerTimeoutError(f"Docker operation '{operation}' timed out.") from exc
        except requests.exceptions.ConnectionError as exc:
            logger.error("Cannot connect to Docker daemon during %s: %s", operation, exc)
            raise DockerDaemonUnavailableError(
                "Cannot connect to the Docker daemon. Ensure it is running."
            ) from exc
        else:
            logger.info("Docker operation succeeded: %s (%.3fs)", operation, time.perf_counter() - started_at)
            return result

    # ------------------------------------------------------------------
    # Containers
    # ------------------------------------------------------------------

    def list_containers(self, all_containers: bool = False) -> list[dict]:
        """Return a list of containers known to the Docker daemon."""
        return self._execute(
            "list_containers",
            lambda client: [_serialize_container(c) for c in client.containers.list(all=all_containers)],
        )

    def get_container(self, container_id: str) -> dict:
        """Return a curated summary for a single container."""
        return self._execute(
            f"get_container:{container_id}",
            lambda client: _serialize_container(client.containers.get(container_id)),
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def inspect_container(self, container_id: str) -> dict:
        """Return the full raw inspect payload for a container."""
        return self._execute(
            f"inspect_container:{container_id}",
            lambda client: client.containers.get(container_id).attrs,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def get_container_logs(self, container_id: str, tail: int = 100) -> dict:
        """Return the last ``tail`` log lines from a container."""

        def _op(client: docker.DockerClient) -> dict:
            c = client.containers.get(container_id)
            raw_logs: bytes = c.logs(tail=tail, timestamps=True)
            return {"container_id": c.short_id, "logs": raw_logs.decode("utf-8", errors="replace")}

        return self._execute(
            f"get_container_logs:{container_id}",
            _op,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def get_container_stats(self, container_id: str) -> dict:
        """Return a single live resource usage snapshot for a running container."""

        def _op(client: docker.DockerClient) -> dict:
            c = client.containers.get(container_id)
            s = c.stats(stream=False)

            cpu_delta = (
                s["cpu_stats"]["cpu_usage"]["total_usage"]
                - s["precpu_stats"]["cpu_usage"]["total_usage"]
            )
            system_delta = s["cpu_stats"].get("system_cpu_usage", 0) - s["precpu_stats"].get(
                "system_cpu_usage", 0
            )
            num_cpus = s["cpu_stats"].get("online_cpus", 1)
            cpu_percent = (cpu_delta / system_delta * num_cpus * 100.0) if system_delta > 0 else 0.0

            mem = s.get("memory_stats", {})
            memory_usage = mem.get("usage", 0)
            memory_limit = mem.get("limit", 1)

            networks = s.get("networks", {})
            rx = sum(v.get("rx_bytes", 0) for v in networks.values())
            tx = sum(v.get("tx_bytes", 0) for v in networks.values())

            # Cumulative disk bytes since container start, broken down by
            # operation type in Docker's raw stats blob — sum the "Read" and
            # "Write" entries across every block device the container touched.
            blkio_entries = (s.get("blkio_stats") or {}).get("io_service_bytes_recursive") or []
            disk_read = sum(e.get("value", 0) for e in blkio_entries if e.get("op") == "Read")
            disk_write = sum(e.get("value", 0) for e in blkio_entries if e.get("op") == "Write")

            return {
                "container_id": c.short_id,
                "name": c.name,
                "cpu_percent": round(cpu_percent, 2),
                "memory_usage": memory_usage,
                "memory_limit": memory_limit,
                "memory_percent": round((memory_usage / memory_limit) * 100.0, 2),
                "network_rx": rx,
                "network_tx": tx,
                "disk_read": disk_read,
                "disk_write": disk_write,
            }

        return self._execute(
            f"get_container_stats:{container_id}",
            _op,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def start_container(self, container_id: str) -> dict:
        """Start a stopped container."""

        def _op(client: docker.DockerClient) -> dict:
            c = client.containers.get(container_id)
            c.start()
            return {
                "container_id": c.short_id,
                "action": "start",
                "success": True,
                "message": f"Container '{c.name}' started successfully.",
            }

        return self._execute(
            f"start_container:{container_id}",
            _op,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def stop_container(self, container_id: str, timeout: int = 10) -> dict:
        """Gracefully stop a running container."""

        def _op(client: docker.DockerClient) -> dict:
            c = client.containers.get(container_id)
            c.stop(timeout=timeout)
            return {
                "container_id": c.short_id,
                "action": "stop",
                "success": True,
                "message": f"Container '{c.name}' stopped successfully.",
            }

        return self._execute(
            f"stop_container:{container_id}",
            _op,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def restart_container(self, container_id: str, timeout: int = 10) -> dict:
        """Restart a container (stop then start atomically via the Docker daemon)."""

        def _op(client: docker.DockerClient) -> dict:
            c = client.containers.get(container_id)
            c.restart(timeout=timeout)
            return {
                "container_id": c.short_id,
                "action": "restart",
                "success": True,
                "message": f"Container '{c.name}' restarted successfully.",
            }

        return self._execute(
            f"restart_container:{container_id}",
            _op,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    def remove_container(self, container_id: str, force: bool = False) -> dict:
        """Remove a container."""

        def _op(client: docker.DockerClient) -> dict:
            c = client.containers.get(container_id)
            name = c.name
            short_id = c.short_id
            c.remove(force=force)
            return {
                "container_id": short_id,
                "action": "remove",
                "success": True,
                "message": f"Container '{name}' removed successfully.",
            }

        return self._execute(
            f"remove_container:{container_id}",
            _op,
            not_found_exc=ContainerNotFoundError,
            not_found_message=f"Container '{container_id}' not found.",
        )

    # ------------------------------------------------------------------
    # Images
    # ------------------------------------------------------------------

    def list_images(self) -> list[dict]:
        """Return a list of all images stored in the local Docker daemon."""
        return self._execute(
            "list_images",
            lambda client: [_serialize_image(img) for img in client.images.list()],
        )

    def inspect_image(self, image_id: str) -> dict:
        """Return the full inspect detail for a single image."""
        return self._execute(
            f"inspect_image:{image_id}",
            lambda client: _serialize_image_detail(client.images.get(image_id)),
            not_found_exc=ImageNotFoundError,
            not_found_message=f"Image '{image_id}' not found.",
        )

    def pull_image(self, image_name: str, tag: str = "latest") -> dict:
        """Pull an image (and tag) from a registry."""

        def _op(client: docker.DockerClient) -> dict:
            img = client.images.pull(image_name, tag=tag)
            return {
                "image": image_name,
                "tag": tag,
                "id": img.short_id.replace("sha256:", ""),
                "tags": img.tags,
                "success": True,
                "message": f"Image '{image_name}:{tag}' pulled successfully.",
            }

        return self._execute(
            f"pull_image:{image_name}:{tag}",
            _op,
            not_found_exc=ImageNotFoundError,
            not_found_message=f"Image '{image_name}:{tag}' not found in the registry.",
        )

    def remove_image(self, image_id: str, force: bool = False) -> dict:
        """Remove an image."""

        def _op(client: docker.DockerClient) -> dict:
            client.images.remove(image_id, force=force)
            return {
                "image_id": image_id,
                "action": "remove",
                "success": True,
                "message": f"Image '{image_id}' removed successfully.",
            }

        return self._execute(
            f"remove_image:{image_id}",
            _op,
            not_found_exc=ImageNotFoundError,
            not_found_message=f"Image '{image_id}' not found.",
        )

    # ------------------------------------------------------------------
    # Networks
    # ------------------------------------------------------------------

    def list_networks(self) -> list[dict]:
        """Return a list of all Docker networks."""

        def _op(client: docker.DockerClient) -> list[dict]:
            return [
                {
                    "id": n.short_id,
                    "name": n.name,
                    "driver": n.attrs.get("Driver", "unknown"),
                    "scope": n.attrs.get("Scope", "unknown"),
                    "internal": n.attrs.get("Internal", False),
                    "created": n.attrs.get("Created"),
                }
                for n in client.networks.list()
            ]

        return self._execute("list_networks", _op)

    # ------------------------------------------------------------------
    # Volumes
    # ------------------------------------------------------------------

    def list_volumes(self) -> list[dict]:
        """Return a list of all Docker volumes."""

        def _op(client: docker.DockerClient) -> list[dict]:
            return [
                {
                    "name": v.name,
                    "driver": v.attrs.get("Driver", "unknown"),
                    "mountpoint": v.attrs.get("Mountpoint", ""),
                    "created": v.attrs.get("CreatedAt"),
                    "labels": v.attrs.get("Labels") or {},
                }
                for v in client.volumes.list()
            ]

        return self._execute("list_volumes", _op)

    # ------------------------------------------------------------------
    # System
    # ------------------------------------------------------------------

    def docker_info(self) -> dict:
        """Return a summary of the Docker daemon's current state."""

        def _op(client: docker.DockerClient) -> dict:
            info = client.info()
            return {
                "containers": info.get("Containers", 0),
                "containers_running": info.get("ContainersRunning", 0),
                "containers_paused": info.get("ContainersPaused", 0),
                "containers_stopped": info.get("ContainersStopped", 0),
                "images": info.get("Images", 0),
                "server_version": info.get("ServerVersion", "unknown"),
                "operating_system": info.get("OperatingSystem", "unknown"),
                "architecture": info.get("Architecture", "unknown"),
                "kernel_version": info.get("KernelVersion", "unknown"),
                "total_memory": info.get("MemTotal", 0),
                "ncpu": info.get("NCPU", 0),
            }

        return self._execute("docker_info", _op)

    def docker_version(self) -> dict:
        """Return Docker Engine version metadata."""

        def _op(client: docker.DockerClient) -> dict:
            v = client.version()
            return {
                "version": v.get("Version", "unknown"),
                "api_version": v.get("ApiVersion", "unknown"),
                "min_api_version": v.get("MinAPIVersion"),
                "go_version": v.get("GoVersion", "unknown"),
                "os": v.get("Os", "unknown"),
                "arch": v.get("Arch", "unknown"),
                "kernel_version": v.get("KernelVersion", "unknown"),
                "build_time": v.get("BuildTime"),
            }

        return self._execute("docker_version", _op)

    def disk_usage(self) -> dict:
        """Return aggregate disk space used by images, containers, volumes, and build cache."""

        def _op(client: docker.DockerClient) -> dict:
            df = client.df()
            images = df.get("Images") or []
            containers = df.get("Containers") or []
            volumes = df.get("Volumes") or []
            build_cache = df.get("BuildCache") or []

            images_size = sum(i.get("Size", 0) for i in images)
            containers_size = sum(c.get("SizeRw", 0) or 0 for c in containers)
            volumes_size = sum((v.get("UsageData") or {}).get("Size", 0) or 0 for v in volumes)
            build_cache_size = sum(b.get("Size", 0) for b in build_cache)

            return {
                "images_count": len(images),
                "images_size": images_size,
                "containers_count": len(containers),
                "containers_size": containers_size,
                "volumes_count": len(volumes),
                "volumes_size": volumes_size,
                "build_cache_size": build_cache_size,
                "total_size": images_size + containers_size + volumes_size + build_cache_size,
            }

        return self._execute("disk_usage", _op)


@lru_cache
def get_docker_service() -> DockerService:
    """FastAPI dependency that returns a cached ``DockerService`` instance."""
    return DockerService(base_url=settings.DOCKER_HOST)


# ---------------------------------------------------------------------------
# Legacy module-level wrappers
# ---------------------------------------------------------------------------
# ``services.prompt_service`` predates the ``DockerService`` class and calls
# ``docker_service.start_container`` etc. as plain functions, catching
# ``HTTPException`` for expected failures. These wrappers preserve that exact
# contract so the existing prompt-execution pipeline keeps working unchanged,
# while ``DockerService`` itself (used by the new Docker router) stays free
# of any FastAPI dependency.
# ---------------------------------------------------------------------------

from fastapi import HTTPException, status  # noqa: E402

_DOCKER_ERROR_STATUS: dict[type, int] = {
    ContainerNotFoundError: status.HTTP_404_NOT_FOUND,
    ImageNotFoundError: status.HTTP_404_NOT_FOUND,
    DockerPermissionError: status.HTTP_403_FORBIDDEN,
    DockerTimeoutError: status.HTTP_504_GATEWAY_TIMEOUT,
    DockerDaemonUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
}


def _as_http_exception(exc: DockerServiceError) -> HTTPException:
    """Translate a ``DockerServiceError`` into its equivalent ``HTTPException``."""
    status_code = _DOCKER_ERROR_STATUS.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    return HTTPException(status_code=status_code, detail=str(exc))


def start_container(container_id: str) -> dict:
    """Legacy wrapper for ``PromptService`` — see ``DockerService.start_container``."""
    try:
        return get_docker_service().start_container(container_id)
    except DockerServiceError as exc:
        raise _as_http_exception(exc) from exc


def stop_container(container_id: str, timeout: int = 10) -> dict:
    """Legacy wrapper for ``PromptService`` — see ``DockerService.stop_container``."""
    try:
        return get_docker_service().stop_container(container_id, timeout=timeout)
    except DockerServiceError as exc:
        raise _as_http_exception(exc) from exc


def restart_container(container_id: str, timeout: int = 10) -> dict:
    """Legacy wrapper for ``PromptService`` — see ``DockerService.restart_container``."""
    try:
        return get_docker_service().restart_container(container_id, timeout=timeout)
    except DockerServiceError as exc:
        raise _as_http_exception(exc) from exc


def remove_container(container_id: str, force: bool = False) -> dict:
    """Legacy wrapper for ``PromptService`` — see ``DockerService.remove_container``."""
    try:
        return get_docker_service().remove_container(container_id, force=force)
    except DockerServiceError as exc:
        raise _as_http_exception(exc) from exc
