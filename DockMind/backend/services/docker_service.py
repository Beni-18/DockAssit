import docker
from fastapi import HTTPException
from typing import List

from utils.logger import logger


class DockerService:
    """Wraps Docker SDK calls — never uses shell subprocess."""

    @staticmethod
    def _client():
        try:
            return docker.from_env()
        except Exception as e:
            logger.error(f"Docker connection failed: {e}")
            raise HTTPException(status_code=503, detail="Cannot connect to Docker daemon")

    @staticmethod
    def list_containers() -> List[dict]:
        client = DockerService._client()
        containers = client.containers.list(all=True)
        return [
            {
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else c.image.short_id,
                "status": c.status,
                "created": c.attrs.get("Created"),
                "ports": c.ports,
            }
            for c in containers
        ]

    @staticmethod
    def get_container(container_id: str) -> dict:
        client = DockerService._client()
        try:
            c = client.containers.get(container_id)
            return {
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else c.image.short_id,
                "status": c.status,
                "created": c.attrs.get("Created"),
                "ports": c.ports,
            }
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Container not found")

    @staticmethod
    def get_stats(container_id: str) -> dict:
        client = DockerService._client()
        try:
            c = client.containers.get(container_id)
            stats = c.stats(stream=False)

            # CPU %
            cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - \
                        stats["precpu_stats"]["cpu_usage"]["total_usage"]
            system_delta = stats["cpu_stats"].get("system_cpu_usage", 0) - \
                           stats["precpu_stats"].get("system_cpu_usage", 0)
            num_cpus = stats["cpu_stats"].get("online_cpus", 1)
            cpu_percent = (cpu_delta / system_delta) * num_cpus * 100.0 if system_delta > 0 else 0.0

            # Memory
            mem_stats = stats["memory_stats"]
            memory_usage = mem_stats.get("usage", 0)
            memory_limit = mem_stats.get("limit", 1)
            memory_percent = (memory_usage / memory_limit) * 100.0

            # Network
            networks = stats.get("networks", {})
            rx = sum(v.get("rx_bytes", 0) for v in networks.values())
            tx = sum(v.get("tx_bytes", 0) for v in networks.values())

            return {
                "container_id": container_id,
                "name": c.name,
                "cpu_percent": round(cpu_percent, 2),
                "memory_usage": memory_usage,
                "memory_limit": memory_limit,
                "memory_percent": round(memory_percent, 2),
                "network_rx": rx,
                "network_tx": tx,
            }
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Container not found")

    @staticmethod
    def get_logs(container_id: str, tail: int = 100) -> dict:
        client = DockerService._client()
        try:
            c = client.containers.get(container_id)
            logs = c.logs(tail=tail, timestamps=True).decode("utf-8")
            return {"container_id": container_id, "logs": logs}
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Container not found")

    @staticmethod
    def execute_action(action: str, target: str, user_id: int) -> dict:
        allowed_actions = {"start", "stop", "restart", "remove", "pause", "unpause"}
        if action not in allowed_actions:
            raise HTTPException(status_code=400, detail=f"Invalid action: {action}")

        client = DockerService._client()
        try:
            c = client.containers.get(target)
            getattr(c, action)()
            logger.info(f"User {user_id} executed '{action}' on '{target}'")
            return {"success": True, "action": action, "target": target, "message": f"Container {action}ed successfully"}
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail=f"Container '{target}' not found")
        except docker.errors.APIError as e:
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def get_info() -> dict:
        client = DockerService._client()
        info = client.info()
        return {
            "docker_version": client.version().get("Version", "unknown"),
            "containers_running": info.get("ContainersRunning", 0),
            "containers_paused": info.get("ContainersPaused", 0),
            "containers_stopped": info.get("ContainersStopped", 0),
            "images": info.get("Images", 0),
            "server_version": info.get("ServerVersion", "unknown"),
        }
