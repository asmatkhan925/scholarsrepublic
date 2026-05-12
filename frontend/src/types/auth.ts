export type UserRole = "student" | "admin";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  date_joined: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};

export type RegisterResponse = {
  detail: string;
  email_sent?: boolean;
  user: User;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  password_confirm: string;
  next?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyEmailPayload = {
  uid: string;
  token: string;
};

export type VerifyEmailResponse = {
  detail: string;
  email: string;
  user: User;
};

export type ResendVerificationPayload = {
  email: string;
  next?: string;
};

export type ResendVerificationResponse = {
  detail: string;
  email_sent?: boolean;
  retry_after_seconds?: number;
};
