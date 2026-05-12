BLOCKED_PREFIXES = (
    "/api/",
    "/login",
    "/register",
    "/verify-email",
)


def clean_next_path(value: object) -> str:
    if not isinstance(value, str):
        return ""

    next_path = value.strip()

    if len(next_path) > 512:
        return ""

    if not next_path.startswith("/") or next_path.startswith("//"):
        return ""

    lowered = next_path.lower()
    if any(lowered == prefix.rstrip("/") or lowered.startswith(prefix) for prefix in BLOCKED_PREFIXES):
        return ""

    return next_path
