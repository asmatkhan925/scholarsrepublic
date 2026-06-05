"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearAuthToken,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setAuthToken,
  verifyEmail as verifyEmailRequest,
} from "@/lib/api";
import {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  removeTokens,
  removeUser,
  saveTokens,
  saveUser,
} from "@/lib/auth";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  User,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<VerifyEmailResponse>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearAuthToken();
    removeTokens();
    removeUser();
    setUser(null);
  }, []);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    saveTokens(response.tokens);
    saveUser(response.user);
    setAuthToken(response.tokens.access);
    setUser(response.user);
    return response;
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      clearSession();
      setLoading(false);
      return null;
    }

    setAuthToken(accessToken);

    try {
      const currentUser = await getCurrentUser();
      saveUser(currentUser);
      setUser(currentUser);
      return currentUser;
    } catch {
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }

    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginUser(payload);
      return applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    return registerUser(payload);
  }, []);

  const verifyEmail = useCallback(async (payload: VerifyEmailPayload) => {
    return verifyEmailRequest(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await logoutUser(getRefreshToken());
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      verifyEmail,
      logout,
      refreshCurrentUser,
    }),
    [loading, login, logout, refreshCurrentUser, register, user, verifyEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
