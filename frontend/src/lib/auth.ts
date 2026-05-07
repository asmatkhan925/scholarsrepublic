import type { AuthTokens, User } from "@/types/auth";

const ACCESS_TOKEN_KEY = "scholars_republic_access_token";
const REFRESH_TOKEN_KEY = "scholars_republic_refresh_token";
const USER_KEY = "scholars_republic_user";

function hasBrowserStorage() {
  return typeof window !== "undefined";
}

export function saveTokens(tokens: AuthTokens) {
  if (!hasBrowserStorage()) {
    return;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function getAccessToken() {
  if (!hasBrowserStorage()) {
    return null;
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!hasBrowserStorage()) {
    return null;
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function removeTokens() {
  if (!hasBrowserStorage()) {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function saveUser(user: User) {
  if (!hasBrowserStorage()) {
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  if (!hasBrowserStorage()) {
    return null;
  }

  const storedUser = localStorage.getItem(USER_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function removeUser() {
  if (!hasBrowserStorage()) {
    return;
  }
  localStorage.removeItem(USER_KEY);
}
