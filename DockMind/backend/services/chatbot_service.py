"""
Chatbot orchestration service — the single entry point for natural language
Docker execution: interpret -> resolve against live Docker state -> dispatch
to the Docker SDK -> log -> respond.

This is what ``POST /ai/execute`` calls. It composes three independently
owned services without modifying any of them:

- ``services.ai_service`` for the raw LLM call (``query_json``) and generic
  chat fallback.
- ``services.docker_service.DockerService`` for every actual Docker SDK call.
- ``services.history_service.HistoryService`` for the audit trail that also
  powers the Frequent Commands feature.

Design note — why the LLM never sees the container list:
Early versions injected the full live container list into the prompt and
asked the model to both classify the request AND pick out which of many
containers matched a category ("database", "web server", ...) in one shot.
A 3B model is unreliable at that: it either echoes example text verbatim, or
scans only part of a list. So the job is split by what each side is
actually good at — the LLM extracts a short free-text description of the
action and its target ("stop" / "database"), and this module resolves that
description against the real container list with plain, deterministic
Python (exact name -> category keyword -> substring). That resolution logic
lives in ``_CATEGORY_KEYWORDS`` / ``_resolve_targets`` below and is the
place to extend for new categories or naming conventions.
"""

import re
import time
from typing import Optional

from sqlalchemy.orm import Session

from schemas.ai_schema import AiExecuteResponse
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
# Interpretation — the LLM extracts a short description, not real names
# ---------------------------------------------------------------------------

_INTERPRET_SYSTEM_PROMPT = """You are a Docker command parser. Convert the user's request into JSON.
Return ONLY valid JSON — no markdown, no explanation.

Schema:
{
  "action": "",
  "resource": "",
  "target": ""
}

Allowed actions: start, stop, restart, remove, logs, stats, inspect, list, pull, info, version, describe, chat
Allowed resources: container, image, volume, network, system, none

Rules:
- "target" is a short free-text description of what the action applies to: a container name,
  part of a name, or a category the user described (e.g. "database", "web server", "cache",
  "redis"). Copy the words the user used — do not try to resolve it to a real name yourself,
  that happens elsewhere.
- Use "target": "" (empty string) when the action applies to everything of that resource type
  with no filter — e.g. "list all containers", "docker info", "docker version".
- For "pull" (pulling a brand new image), "target" is the image name/tag to pull.
- Use "describe" (not "list") when the user wants a narrative summary, description, or overview
  rather than a raw list or a single specific action — e.g. "summarize my container activity",
  "describe all my containers", "give me info on each container", "what's going on with my
  docker setup", "tell me about my environment". "target" is still "" unless they named a
  specific container or category to focus on.
- If the request is not about managing or inspecting Docker at all (a general question, or
  unrelated conversation), return {"action": "chat", "resource": "none", "target": ""}.

Examples:
"stop the database container" -> {"action":"stop","resource":"container","target":"database"}
"stop the database containers" -> {"action":"stop","resource":"container","target":"database"}
"restart the redis containers" -> {"action":"restart","resource":"container","target":"redis"}
"show me all redis containers" -> {"action":"list","resource":"container","target":"redis"}
"restart nginx-web" -> {"action":"restart","resource":"container","target":"nginx-web"}
"list all containers" -> {"action":"list","resource":"container","target":""}
"stop all containers" -> {"action":"stop","resource":"container","target":""}
"what images do I have" -> {"action":"list","resource":"image","target":""}
"docker version" -> {"action":"version","resource":"system","target":""}
"summarize my container activity" -> {"action":"describe","resource":"container","target":""}
"describe all my existing containers" -> {"action":"describe","resource":"container","target":""}
"give me info on each individual container" -> {"action":"describe","resource":"container","target":""}
"tell me about my database containers" -> {"action":"describe","resource":"container","target":"database"}
"what is a docker volume" -> {"action":"chat","resource":"none","target":""}"""


async def _interpret(prompt: str) -> dict:
    """Ask the LLM for {action, resource, target}; never raises — degrades to chat on failure."""
    try:
        parsed = await ai_service.query_json(prompt, _INTERPRET_SYSTEM_PROMPT)
    except Exception:
        return {"action": "chat", "resource": "none", "target": ""}

    return {
        "action": (parsed.get("action") or "chat").strip().lower(),
        "resource": (parsed.get("resource") or "none").strip().lower(),
        "target": str(parsed.get("target") or "").strip(),
    }


# ---------------------------------------------------------------------------
# Resolution — match a free-text description against the real container list
# ---------------------------------------------------------------------------

# Extend this map to teach the resolver new categories/synonyms — this is
# plain, deterministic, testable Python precisely because "does this image
# belong to this category" is not a job worth delegating to a 3B model.
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "database": ["postgres", "postgis", "mysql", "mariadb", "mongo", "redis", "cassandra", "elasticsearch", "cockroach", "couchdb", "influx"],
    "db": ["postgres", "postgis", "mysql", "mariadb", "mongo", "redis", "cassandra", "elasticsearch"],
    "web server": ["nginx", "apache", "httpd", "caddy"],
    "webserver": ["nginx", "apache", "httpd", "caddy"],
    "web": ["nginx", "apache", "httpd", "caddy"],
    "cache": ["redis", "memcached"],
    "queue": ["rabbitmq", "kafka", "activemq", "nats"],
    "message broker": ["rabbitmq", "kafka", "activemq", "nats"],
    "broker": ["rabbitmq", "kafka", "activemq", "nats"],
    "proxy": ["nginx", "traefik", "haproxy", "envoy"],
    "monitoring": ["grafana", "prometheus", "exporter"],
    "worker": ["worker", "celery"],
}


def _match_category_keywords(desc: str) -> Optional[list[str]]:
    """
    Look up ``desc`` in ``_CATEGORY_KEYWORDS``, tolerating the minor phrasing
    variance an LLM will naturally produce: exact match, simple plural
    ("databases" -> "database"), or the category name appearing as a whole
    word inside a longer description ("database containers", "a database").
    """
    keywords = _CATEGORY_KEYWORDS.get(desc)
    if keywords:
        return keywords

    if desc.endswith("s"):
        keywords = _CATEGORY_KEYWORDS.get(desc[:-1])
        if keywords:
            return keywords

    words = desc.split()
    for key, kws in _CATEGORY_KEYWORDS.items():
        key_words = key.split()
        if key in desc or all(w in words for w in key_words):
            return kws

    return None


def _fallback_description_from_prompt(raw_prompt: str, containers: list[dict]) -> str:
    """
    Recover a plausible target description straight from the user's raw text
    when interpretation returned none — used only as a safety net (see
    ``execute_prompt``). Never invents a filter that isn't actually present
    in what the user typed.
    """
    prompt_lower = raw_prompt.lower()

    for c in containers:
        if c["name"].lower() in prompt_lower:
            return c["name"]

    for key in _CATEGORY_KEYWORDS:
        if key in prompt_lower:
            return key

    # A single word the user used (e.g. "redis") is often the actual database
    # engine/image name, not the category word itself — check individual
    # tokens against every category's underlying keywords and against real
    # container names/images directly.
    words = re.findall(r"[a-z0-9][a-z0-9_-]{2,}", prompt_lower)
    all_keywords = {kw for kws in _CATEGORY_KEYWORDS.values() for kw in kws}
    for word in words:
        if word in all_keywords:
            return word
        if any(word in c["name"].lower() or word in c["image"].lower() for c in containers):
            return word

    return ""


def _resolve_targets(description: str, containers: list[dict]) -> list[str]:
    """
    Resolve a free-text description (an exact name, a partial name, or a
    category like "database") to real container names, most specific match
    first. Returns every match — a description can reasonably match more
    than one container (e.g. two containers both running redis).
    """
    if not description:
        return []
    desc = description.lower().strip()

    exact = [c["name"] for c in containers if c["name"].lower() == desc]
    if exact:
        return exact

    keywords = _match_category_keywords(desc)
    if keywords:
        matched = [c["name"] for c in containers if any(kw in c["image"].lower() for kw in keywords)]
        if matched:
            return matched

    return [c["name"] for c in containers if desc in c["name"].lower() or desc in c["image"].lower()]


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_MUTATING_CONTAINER_ACTIONS = {"start", "stop", "restart", "remove"}
_SINGLE_CONTAINER_READ_ACTIONS = {"logs", "stats", "inspect"}


def _dispatch_container(
    docker_service: DockerService, action: str, description: str, live_containers: list[dict]
) -> tuple[Optional[str], bool, list[str]]:
    """Returns (response_text, success, resolved_targets). response_text is None if unsupported."""
    if action == "list":
        if description:
            matched_names = _resolve_targets(description, live_containers)
            matched = [c for c in live_containers if c["name"] in matched_names]
            if not matched:
                return f"No containers matched \"{description}\".", False, []
            return _fmt_containers(matched), True, matched_names
        return _fmt_containers(live_containers), True, []

    if action in _MUTATING_CONTAINER_ACTIONS | _SINGLE_CONTAINER_READ_ACTIONS:
        targets = _resolve_targets(description, live_containers)
        if not targets:
            return f"I couldn't find a container matching \"{description}\".", False, []

        lines: list[str] = []
        success = True
        for name in targets:
            try:
                if action == "start":
                    lines.append(docker_service.start_container(name)["message"])
                elif action == "stop":
                    lines.append(docker_service.stop_container(name)["message"])
                elif action == "restart":
                    lines.append(docker_service.restart_container(name)["message"])
                elif action == "remove":
                    lines.append(docker_service.remove_container(name)["message"])
                elif action == "logs":
                    lines.append(_fmt_logs(docker_service.get_container_logs(name)))
                elif action == "stats":
                    lines.append(_fmt_stats(docker_service.get_container_stats(name)))
                elif action == "inspect":
                    lines.append(_fmt_container_detail(docker_service.get_container(name)))
            except DockerServiceError as exc:
                success = False
                lines.append(f"{name}: {exc}")
        separator = "\n\n" if action in _SINGLE_CONTAINER_READ_ACTIONS else "\n"
        return separator.join(lines), success, targets

    return None, False, []


def _dispatch(
    docker_service: DockerService, action: str, resource: str, description: str, live_containers: list[dict]
) -> tuple[Optional[str], bool, list[str]]:
    """Returns (response_text, success, resolved_targets); response_text is None for an unsupported combination."""
    if resource == "container":
        return _dispatch_container(docker_service, action, description, live_containers)

    if resource == "image":
        if action == "list":
            return _fmt_images(docker_service.list_images()), True, []
        if action == "pull":
            if not description:
                return "I need an image name to pull.", False, []
            try:
                return docker_service.pull_image(description)["message"], True, [description]
            except DockerServiceError as exc:
                return str(exc), False, [description]
        if action == "remove":
            if not description:
                return "I need an image name to remove.", False, []
            try:
                return docker_service.remove_image(description)["message"], True, [description]
            except DockerServiceError as exc:
                return str(exc), False, [description]
        if action == "inspect":
            if not description:
                return "I need an image name to inspect.", False, []
            try:
                return _fmt_image_detail(docker_service.inspect_image(description)), True, [description]
            except DockerServiceError as exc:
                return str(exc), False, [description]

    elif resource == "volume" and action == "list":
        return _fmt_volumes(docker_service.list_volumes()), True, []

    elif resource == "network" and action == "list":
        return _fmt_networks(docker_service.list_networks()), True, []

    elif resource == "system":
        if action == "info":
            return _fmt_info(docker_service.docker_info()), True, []
        if action == "version":
            return _fmt_version(docker_service.docker_version()), True, []

    return None, False, []


async def _fallback_chat(prompt: str) -> AiExecuteResponse:
    """Plain conversational reply when no Docker action was identified."""
    provider = ai_service.get_ai_provider()
    reply = await ai_service.generate_chat_response(prompt, provider)
    return AiExecuteResponse(response=reply, action=None, target=None, success=None)


def _build_describe_context(containers: list[dict], history_rows: list) -> str:
    """Serialize real container state and recent activity as grounding for a synthesized summary."""
    if containers:
        container_lines = "\n".join(
            f"- {c['name']}: image={c['image']}, status={c['status']}, created={c.get('created', 'unknown')}"
            for c in containers
        )
    else:
        container_lines = "(no containers currently exist)"

    if history_rows:
        history_lines = "\n".join(
            f"- {h.action or 'chat'} {h.target or ''} — "
            f"{'succeeded' if h.success else 'failed'} ({h.created_at:%Y-%m-%d %H:%M})"
            for h in history_rows
        )
    else:
        history_lines = "(no recent activity recorded)"

    return f"""Current Docker containers:
{container_lines}

Recent command activity (most recent first):
{history_lines}"""


async def _describe(prompt: str, description: str, db: Session, user_id: int, docker_service: DockerService) -> AiExecuteResponse:
    """
    Answer a narrative request ("summarize my container activity", "describe
    all my containers") by grounding a chat completion in the real container
    list and recent history, instead of either hallucinating or executing a
    Docker action. Never raises — a Docker/history fetch failure just means
    a thinner context, not a broken response.
    """
    try:
        containers = docker_service.list_containers(all_containers=True)
    except DockerServiceError:
        containers = []

    if description:
        matched_names = set(_resolve_targets(description, containers))
        if matched_names:
            containers = [c for c in containers if c["name"] in matched_names]

    try:
        history_rows = HistoryService.get_user_history(db=db, user_id=user_id, skip=0, limit=10)
    except Exception:
        history_rows = []

    context = _build_describe_context(containers, history_rows)
    grounded_prompt = (
        f"{context}\n\n"
        "Using ONLY the real data above, answer the user's request in clear natural language. "
        "Do not invent containers, images, or activity that isn't listed above.\n\n"
        f"User request: {prompt}"
    )

    provider = ai_service.get_ai_provider()
    reply = await ai_service.generate_chat_response(grounded_prompt, provider)
    return AiExecuteResponse(response=reply, action=None, target=None, success=None)


def _log_each_target(
    db: Session,
    user_id: int,
    prompt: str,
    action: str,
    resource: str,
    targets: list[str],
    success: bool,
    error_message: Optional[str],
    duration: float,
) -> None:
    """
    Record one history row per resolved target so Frequent Commands counts
    each container's actions individually, rather than one ambiguous row
    covering a whole batch.
    """
    for name in targets:
        HistoryService.save_history_and_log(
            db=db,
            user_id=user_id,
            prompt=prompt,
            action=action,
            resource=resource,
            target=name,
            success=success,
            error_message=error_message,
            execution_duration=duration,
        )


async def execute_prompt(db: Session, user_id: int, prompt: str, docker_service: DockerService) -> AiExecuteResponse:
    """
    Interpret ``prompt``, resolve its target description against live Docker
    state, dispatch it to the Docker SDK if it names a supported action, log
    the attempt to command history, and return a single unified response.
    Falls back to a conversational reply when the prompt isn't a
    recognizable Docker command.
    """
    intent = await _interpret(prompt)
    action, resource, description = intent["action"], intent["resource"], intent["target"]

    if action == "chat" or resource == "none":
        return await _fallback_chat(prompt)

    if action == "describe":
        return await _describe(prompt, description, db, user_id, docker_service)

    try:
        live_containers = docker_service.list_containers(all_containers=True)
    except DockerServiceError:
        live_containers = []

    if not description and resource == "container" and action in (_MUTATING_CONTAINER_ACTIONS | _SINGLE_CONTAINER_READ_ACTIONS):
        # A mutating/single-container action with no target is almost always
        # a dropped filter, not a genuine "apply to everything" request — a
        # small model occasionally strips a category word from phrasing like
        # "stop the redis containers" despite matching few-shot examples.
        # Recover it directly from the raw text if it's actually there.
        description = _fallback_description_from_prompt(prompt, live_containers)

    started_at = time.perf_counter()
    response_text, success, targets = _dispatch(docker_service, action, resource, description, live_containers)
    duration = time.perf_counter() - started_at

    if response_text is None:
        # No handler matched this (action, resource) combination at all.
        return await _fallback_chat(prompt)

    is_loggable_action = action in _MUTATING_CONTAINER_ACTIONS | _SINGLE_CONTAINER_READ_ACTIONS | {"pull", "remove"}
    if is_loggable_action and targets:
        _log_each_target(db, user_id, prompt, action, resource, targets, success, None if success else response_text, duration)

    return AiExecuteResponse(
        response=response_text,
        action=action,
        target=", ".join(targets) if targets else None,
        success=success,
    )
