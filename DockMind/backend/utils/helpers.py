from datetime import datetime


def format_bytes(size_bytes: int) -> str:
    """Convert bytes to human-readable string (KB, MB, GB)."""
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(units) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.2f} {units[i]}"


def format_uptime(started_at: str) -> str:
    """Calculate container uptime from ISO start timestamp."""
    try:
        start = datetime.fromisoformat(started_at.rstrip("Z"))
        delta = datetime.utcnow() - start
        hours, remainder = divmod(int(delta.total_seconds()), 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        return f"{seconds}s"
    except Exception:
        return "—"


def truncate(text: str, max_len: int = 100) -> str:
    """Truncate a string to max_len characters."""
    if not text:
        return ""
    return text if len(text) <= max_len else text[:max_len] + "..."
