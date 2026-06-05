import type { AuthTokens, User } from "@/types/auth";

const REFRESH_TOKEN_KEY = "scholars_republic_refresh_token";
const USER_KEY = "scholars_republic_user";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<User>;
  return (
    typeof user.id === "number" &&
    typeof user.email === "string" &&
    typeof user.full_name === "string" &&
    (user.role === "student" || user.role === "admin") &&
    typeof user.is_active === "boolean" &&
    typeof user.email_verified === "boolean" &&
    typeof user.date_joined === "string"
  );
}

export function saveTokens(tokens: Pick<AuthTokens, "refresh">) {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  // Access token is intentionally not persisted to storage — it lives only in
  // memory (the axios default Authorization header) so XSS cannot read it.
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function getRefreshToken() {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }

  return storage.getItem(REFRESH_TOKEN_KEY);
}

export function removeTokens() {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(REFRESH_TOKEN_KEY);
}

export function saveUser(user: User) {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }

  const storedUser = storage.getItem(USER_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    if (isStoredUser(parsedUser)) {
      return parsedUser;
    }
  } catch {
    // Invalid localStorage state should not break app startup.
  }

  storage.removeItem(USER_KEY);
  return null;
}

export function removeUser() {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(USER_KEY);
}
