from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DockerActionRequest(BaseModel):
    action: str   # start | stop | restart | remove | pause | unpause
    target: str   # container ID or name


class ContainerResponse(BaseModel):
    id: str
    name: str
    image: str
    status: str
    created: Optional[datetime]
    ports: Optional[dict] = None


class ContainerStatsResponse(BaseModel):
    container_id: str
    name: str
    cpu_percent: float
    memory_usage: int     # bytes
    memory_limit: int     # bytes
    memory_percent: float
    network_rx: int       # bytes received
    network_tx: int       # bytes transmitted


class DockerInfoResponse(BaseModel):
    docker_version: str
    containers_running: int
    containers_paused: int
    containers_stopped: int
    images: int
    server_version: str


class DockerActionResponse(BaseModel):
    success: bool
    action: str
    target: str
    message: Optional[str] = None
