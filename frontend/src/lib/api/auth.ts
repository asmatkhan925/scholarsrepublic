import type {
  AuthResponse,
  LoginPayload,
  PasswordResetConfirmPayload,
  PasswordResetConfirmResponse,
  PasswordResetRequestPayload,
  PasswordResetRequestResponse,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResendVerificationResponse,
  User,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from "@/types/auth";

import { api } from "./client";

export async function registerUser(payload: RegisterPayload) {
  const response = await api.post<RegisterResponse>("/auth/register/", payload);
  return response.data;
}

export async function loginUser(payload: LoginPayload) {
  const response = await api.post<AuthResponse>("/auth/login/", payload);
  return response.data;
}

export async function verifyEmail(payload: VerifyEmailPayload) {
  const response = await api.post<VerifyEmailResponse>("/auth/verify-email/", payload);
  return response.data;
}

export async function resendVerificationEmail(payload: ResendVerificationPayload) {
  const response = await api.post<ResendVerificationResponse>(
    "/auth/resend-verification/",
    payload,
  );
  return response.data;
}

export async function requestPasswordReset(payload: PasswordResetRequestPayload) {
  const response = await api.post<PasswordResetRequestResponse>(
    "/auth/password-reset/request/",
    payload,
  );
  return response.data;
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload) {
  const response = await api.post<PasswordResetConfirmResponse>(
    "/auth/password-reset/confirm/",
    payload,
  );
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<User>("/auth/me/");
  return response.data;
}

export async function logoutUser(refreshToken?: string | null) {
  const response = await api.post<{ detail: string }>("/auth/logout/", {
    refresh: refreshToken ?? undefined,
  });
  return response.data;
}
