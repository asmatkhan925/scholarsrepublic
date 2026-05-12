const DEFAULT_NEXT_PATH = "/dashboard";

export function getSafeNextPath(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_NEXT_PATH;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 512) {
    return DEFAULT_NEXT_PATH;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  const blockedPrefixes = ["/api", "/login", "/register", "/verify-email"];

  if (
    blockedPrefixes.some(
      (prefix) =>
        trimmed === prefix ||
        trimmed.startsWith(`${prefix}?`) ||
        trimmed.startsWith(`${prefix}/`),
    )
  ) {
    return DEFAULT_NEXT_PATH;
  }

  return trimmed;
}

export function buildAuthPath(
  pathname: "/login" | "/register",
  nextPath: string,
  extraParams?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();

  if (nextPath && nextPath !== DEFAULT_NEXT_PATH) {
    params.set("next", nextPath);
  }

  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
