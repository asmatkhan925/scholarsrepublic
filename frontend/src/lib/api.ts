import axios from "axios";

import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";
import type {
  ProfileCompletion,
  StudentProfile,
  StudentProfilePayload,
} from "@/types/profile";
import type {
  OpportunityAdminPayload,
  OpportunityDetail,
  OpportunityListResponse,
  OpportunityQueryParams,
} from "@/types/opportunity";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export type HealthResponse = {
  status: "ok";
  message: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health/");
  return response.data;
}

export function setAuthToken(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common.Authorization;
}

export async function registerUser(payload: RegisterPayload) {
  const response = await api.post<AuthResponse>("/auth/register/", payload);
  return response.data;
}

export async function loginUser(payload: LoginPayload) {
  const response = await api.post<AuthResponse>("/auth/login/", payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<User>("/auth/me/");
  return response.data;
}

export async function logoutUser() {
  const response = await api.post<{ detail: string }>("/auth/logout/");
  return response.data;
}

export async function getStudentProfile() {
  const response = await api.get<StudentProfile>("/profile/");
  return response.data;
}

export async function createStudentProfile(payload: StudentProfilePayload) {
  const response = await api.post<StudentProfile>("/profile/", payload);
  return response.data;
}

export async function updateStudentProfile(payload: StudentProfilePayload) {
  const response = await api.put<StudentProfile>("/profile/", payload);
  return response.data;
}

export async function patchStudentProfile(payload: Partial<StudentProfilePayload>) {
  const response = await api.patch<StudentProfile>("/profile/", payload);
  return response.data;
}

export async function getProfileCompletion() {
  const response = await api.get<ProfileCompletion>("/profile/completion/");
  return response.data;
}

export async function getOpportunities(params?: OpportunityQueryParams) {
  const response = await api.get<OpportunityListResponse>("/opportunities/", {
    params,
  });
  return response.data;
}

export async function getOpportunity(slug: string) {
  const response = await api.get<OpportunityDetail>(`/opportunities/${slug}/`);
  return response.data;
}

export async function getScholarships(params?: OpportunityQueryParams) {
  const response = await api.get<OpportunityListResponse>("/scholarships/", {
    params,
  });
  return response.data;
}

export async function getScholarship(slug: string) {
  const response = await api.get<OpportunityDetail>(`/scholarships/${slug}/`);
  return response.data;
}

export async function getAdminOpportunities(params?: OpportunityQueryParams) {
  const response = await api.get<OpportunityListResponse>("/admin/opportunities/", {
    params,
  });
  return response.data;
}

export async function createAdminOpportunity(payload: OpportunityAdminPayload) {
  const response = await api.post<OpportunityDetail>(
    "/admin/opportunities/",
    payload,
  );
  return response.data;
}

export async function updateAdminOpportunity(
  id: number,
  payload: OpportunityAdminPayload,
) {
  const response = await api.put<OpportunityDetail>(
    `/admin/opportunities/${id}/`,
    payload,
  );
  return response.data;
}

export async function patchAdminOpportunity(
  id: number,
  payload: Partial<OpportunityAdminPayload>,
) {
  const response = await api.patch<OpportunityDetail>(
    `/admin/opportunities/${id}/`,
    payload,
  );
  return response.data;
}

export async function deleteAdminOpportunity(id: number) {
  await api.delete(`/admin/opportunities/${id}/`);
}
