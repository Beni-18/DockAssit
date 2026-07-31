"""
Chatbot orchestration service — the single entry point for natural language
Docker execution: interpret -> dispatch to the Docker SDK -> log -> respond.

This is what ``POST /ai/execute`` calls. It composes three independently
owned services without modifying any of them:

- ``services.ai_service`` for interpretation and generic chat fallback.
- ``services.docker_service.DockerService`` for every actual Docker SDK call.
- ``services.history_service.HistoryService`` for the audit trail that also
  powers the Frequent Commands feature.
"""

import time
from typing import Optional

from sqlalchemy.orm import Session

from schemas.ai_schema import AiExecuteResponse, DockerIntent
from services import ai_service
from services.docker_service import DockerService, DockerServiceError
from services.history_service import HistoryService

# ---------------------------------------------------------------------------
# Result formatting — turn raw DockerService dicts into short, readable text
# ---------------------------------------------------------------------------


def _fmt_containers(containers: list[dict]) -> str:
    if not containers:
        return "No containers found."
    lines = [f"- {c['name']} ({c['status']}) — {c['image']}" for c in containers]
    return f"Found {len(containers)} container(s):\n" + "\n".join(lines)


def _fmt_images(images: list[dict]) -> str:
    if not images:
        return "No images found."
    lines = [f"- {', '.join(i['tags']) or i['id']}" for i in images]
    return f"Found {len(images)} image(s):\n" + "\n".join(lines)


def _fmt_volumes(volumes: list[dict]) -> str:
    if not volumes:
        return "No volumes found."
    lines = [f"- {v['name']}" for v in volumes]
    return f"Found {len(volumes)} volume(s):\n" + "\n".join(lines)


def _fmt_networks(networks: list[dict]) -> str:
    if not networks:
        return "No networks found."
    lines = [f"- {n['name']} ({n['driver']})" for n in networks]
    return f"Found {len(networks)} network(s):\n" + "\n".join(lines)


def _fmt_stats(stats: dict) -> str:
    memory_mb = stats["memory_usage"] / (1024 * 1024)
    return (
        f"{stats['name']} — CPU {stats['cpu_percent']}%, "
        f"Memory {memory_mb:.1f} MB ({stats['memory_percent']}%), "
        f"Network RX {stats['network_rx']}B / TX {stats['network_tx']}B"
    )


def _fmt_logs(logs: dict) -> str:
    text = logs["logs"].strip()
    if not text:
        return f"No recent logs for '{logs['container_id']}'."
    lines = text.splitlines()[-30:]
    return f"Last {len(lines)} log line(s):\n" + "\n".join(lines)


def _fmt_container_detail(c: dict) -> str:
    return f"{c['name']} — status: {c['status']}, image: {c['image']}"


def _fmt_image_detail(img: dict) -> str:
    label = ", ".join(img["tags"]) or img["id"]
    return f"{label} — {img['size']} bytes, {img.get('os', 'unknown')}/{img.get('architecture', 'unknown')}"


def _fmt_info(info: dict) -> str:
    return (
        f"Docker Engine {info['server_version']} — {info['containers']} container(s) "
        f"({info['containers_running']} running), {info['images']} image(s)."
    )


def _fmt_version(v: dict) -> str:
    return f"Docker version {v['version']}, API {v['api_version']}, {v['os']}/{v['arch']}."


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_MUTATING_CONTAINER_ACTIONS = {"start", "stop", "restart", "remove"}
_CONTAINER_READ_ACTIONS = {"logs", "stats", "inspect"}


def _requires_target(action: str) -> bool:
    return action not in ("list", "info", "version")


def _dispatch(docker_service: DockerService, action: str, resource: str, target: Optional[str]) -> Optional[str]:
    """
    Run the Docker SDK call matching (action, resource, target) and return a
    formatted result string, or ``None`` if this combination isn't supported
    (the caller falls back to a plain chat reply in that case).

    Raises ``DockerServiceError`` on any Docker-side failure, and
    ``ValueError`` if a required target is missing.
    """
    if _requires_target(action) and not target:
        raise ValueError(f"I need to know which {resource} to {action}.")

    if resource == "container":
        if action in _MUTATING_CONTAINER_ACTIONS:
            fn = {
                "start": docker_service.start_container,
                "stop": docker_service.stop_container,
                "restart": docker_service.restart_container,
                "remove": docker_service.remove_container,
            }[action]
            return fn(target)["message"]
        if action == "logs":
            return _fmt_logs(docker_service.get_container_logs(target))
        if action == "stats":
            return _fmt_stats(docker_service.get_container_stats(target))
        if action == "inspect":
            return _fmt_container_detail(docker_service.get_container(target))
        if action == "list":
            return _fmt_containers(docker_service.list_containers(all_containers=True))

    elif resource == "image":
        if action == "list":
            return _fmt_images(docker_service.list_images())
        if action == "pull":
            return docker_service.pull_image(target)["message"]
        if action == "remove":
            return docker_service.remove_image(target)["message"]
        if action == "inspect":
            return _fmt_image_detail(docker_service.inspect_image(target))

    elif resource == "volume" and action == "list":
        return _fmt_volumes(docker_service.list_volumes())

    elif resource == "network" and action == "list":
        return _fmt_networks(docker_service.list_networks())

    elif resource == "system":
        if action == "info":
            return _fmt_info(docker_service.docker_info())
        if action == "version":
            return _fmt_version(docker_service.docker_version())

    return None


async def _fallback_chat(prompt: str) -> AiExecuteResponse:
    """Plain conversational reply when no Docker action was identified."""
    provider = ai_service.get_ai_provider()
    reply = await ai_service.generate_chat_response(prompt, provider)
    return AiExecuteResponse(response=reply, action=None, target=None, success=None)


async def execute_prompt(db: Session, user_id: int, prompt: str, docker_service: DockerService) -> AiExecuteResponse:
    """
    Interpret ``prompt``, dispatch it to the Docker SDK if it names a
    supported action, log the attempt to command history, and return a
    single unified response. Falls back to a conversational reply when the
    prompt isn't a recognizable Docker command (or can't be parsed at all).
    """
    try:
        intent: Optional[DockerIntent] = await ai_service.interpret_prompt(prompt)
    except Exception:
        intent = None

    if intent is None:
        return await _fallback_chat(prompt)

    started_at = time.perf_counter()
    try:
        result_text = _dispatch(docker_service, intent.action, intent.resource, intent.target)
    except (DockerServiceError, ValueError) as exc:
        result_text = None
        error_message = str(exc)
        success = False
    else:
        error_message = None
        success = result_text is not None

    if result_text is None and error_message is None:
        # No handler matched this (action, resource) combination at all.
        return await _fallback_chat(prompt)

    duration = time.perf_counter() - started_at
    HistoryService.save_history_and_log(
        db=db,
        user_id=user_id,
        prompt=prompt,
        action=intent.action,
        resource=intent.resource,
        target=intent.target,
        success=success,
        error_message=error_message,
        execution_duration=duration,
    )

    return AiExecuteResponse(
        response=result_text if success else error_message,
        action=intent.action,
        target=intent.target,
        success=success,
    )
