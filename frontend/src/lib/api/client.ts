import axios from "axios";

import { getRefreshToken, removeTokens, removeUser, saveTokens } from "@/lib/auth";

export function resolvePublicApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000/api";
  }

  return null;
}

export const API_BASE_URL = resolvePublicApiBaseUrl();

export type PaginationParams = {
  page?: number;
  page_size?: number;
};

export const api = axios.create({
  baseURL: API_BASE_URL ?? undefined,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL in production. Set it to the Django API base URL.",
    );
  }

  return config;
});

export type PendingRequest = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

export let isRefreshing = false;
export let pendingQueue: PendingRequest[] = [];

export function drainQueue(error: unknown, newToken: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (newToken) {
      resolve(newToken);
    } else {
      reject(error);
    }
  });
  pendingQueue = [];
}

export function redirectToLogin() {
  removeTokens();
  removeUser();
  if (typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalConfig = error.config as typeof error.config & { _retry?: boolean };

    if (originalConfig._retry) {
      redirectToLogin();
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newAccessToken) => {
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalConfig);
      });
    }

    originalConfig._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ access: string; refresh: string }>(
        `${API_BASE_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
      );

      saveTokens(data);
      setAuthToken(data.access);
      drainQueue(null, data.access);

      originalConfig.headers = originalConfig.headers ?? {};
      originalConfig.headers.Authorization = `Bearer ${data.access}`;
      return api(originalConfig);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function setAuthToken(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common.Authorization;
}

/**
 * Called on page load to bootstrap the session from the stored refresh token.
 * Returns the new access token (set in the axios header) or null if refresh fails.
 */
export async function bootstrapSessionFromRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ access: string; refresh: string }>(
      `${API_BASE_URL}/auth/token/refresh/`,
      { refresh: refreshToken },
    );
    saveTokens(data);
    setAuthToken(data.access);
    return data.access;
  } catch {
    clearAuthToken();
    return null;
  }
}
