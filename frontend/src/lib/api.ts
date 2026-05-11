import axios from "axios";

import type { CountryListResponse, StudyFieldListResponse } from "@/types/reference";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types/auth";
import type { AIJobStatus, GenerateSOPPayload, SubmitAIJobResponse } from "@/types/ai";
import type {
  ApplicationQueryParams,
  ApplicationSummary,
  CreateApplicationPayload,
  CreateSavedOpportunityPayload,
  CreateScholarshipCommentPayload,
  OpportunityAdminPayload,
  OpportunityApplication,
  OpportunityApplicationResponse,
  OpportunityDetail,
  OpportunityListResponse,
  OpportunityMatch,
  OpportunityQueryParams,
  RecommendedOpportunityResponse,
  SavedOpportunity,
  SavedOpportunityResponse,
  SavedOpportunitySlugsResponse,
  ScholarshipComment,
  ScholarshipCommentReply,
  ScholarshipCommentResponse,
  UpdateApplicationPayload,
} from "@/types/opportunity";
import type { ProfileCompletion, StudentProfile, StudentProfilePayload } from "@/types/profile";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
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

export async function getCountries() {
  const response = await api.get<CountryListResponse>("/reference/countries/");
  return response.data;
}

export async function getStudyFields() {
  const response = await api.get<StudyFieldListResponse>("/reference/study-fields/");
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
  const response = await api.post<OpportunityDetail>("/admin/opportunities/", payload);
  return response.data;
}

export async function updateAdminOpportunity(id: number, payload: OpportunityAdminPayload) {
  const response = await api.put<OpportunityDetail>(`/admin/opportunities/${id}/`, payload);
  return response.data;
}

export async function patchAdminOpportunity(id: number, payload: Partial<OpportunityAdminPayload>) {
  const response = await api.patch<OpportunityDetail>(`/admin/opportunities/${id}/`, payload);
  return response.data;
}

export async function deleteAdminOpportunity(id: number) {
  await api.delete(`/admin/opportunities/${id}/`);
}

export async function getOpportunityMatch(slug: string) {
  const response = await api.get<OpportunityMatch>(`/opportunities/${slug}/match/`);
  return response.data;
}

export async function getScholarshipMatch(slug: string) {
  const response = await api.get<OpportunityMatch>(`/scholarships/${slug}/match/`);
  return response.data;
}

export async function getRecommendedOpportunities(params?: OpportunityQueryParams) {
  const response = await api.get<RecommendedOpportunityResponse>("/opportunities/recommended/", {
    params,
  });
  return response.data;
}

export async function getRecommendedScholarships(params?: OpportunityQueryParams) {
  const response = await api.get<RecommendedOpportunityResponse>("/scholarships/recommended/", {
    params,
  });
  return response.data;
}

export async function getSavedOpportunities() {
  const response = await api.get<SavedOpportunityResponse>("/saved-opportunities/");
  return response.data;
}

export async function createSavedOpportunity(payload: CreateSavedOpportunityPayload) {
  const response = await api.post<SavedOpportunity>("/saved-opportunities/", payload);
  return response.data;
}

export async function deleteSavedOpportunity(id: number) {
  await api.delete(`/saved-opportunities/${id}/`);
}

export async function getSavedOpportunitySlugs() {
  const response = await api.get<SavedOpportunitySlugsResponse>("/saved-opportunities/slugs/");
  return response.data;
}

export async function saveOpportunityBySlug(slug: string) {
  const response = await api.post<SavedOpportunity>(`/opportunities/${slug}/save/`);
  return response.data;
}

export async function unsaveOpportunityBySlug(slug: string) {
  await api.delete(`/opportunities/${slug}/save/`);
}

export async function saveScholarshipBySlug(slug: string) {
  const response = await api.post<SavedOpportunity>(`/scholarships/${slug}/save/`);
  return response.data;
}

export async function unsaveScholarshipBySlug(slug: string) {
  await api.delete(`/scholarships/${slug}/save/`);
}

export async function getApplications(params?: ApplicationQueryParams) {
  const response = await api.get<OpportunityApplicationResponse>("/applications/", {
    params,
  });
  return response.data;
}

export async function createApplication(payload: CreateApplicationPayload) {
  const response = await api.post<OpportunityApplication>("/applications/", payload);
  return response.data;
}

export async function getApplication(id: number) {
  const response = await api.get<OpportunityApplication>(`/applications/${id}/`);
  return response.data;
}

export async function patchApplication(id: number, payload: UpdateApplicationPayload) {
  const response = await api.patch<OpportunityApplication>(`/applications/${id}/`, payload);
  return response.data;
}

export async function deleteApplication(id: number) {
  await api.delete(`/applications/${id}/`);
}

export async function getApplicationSummary() {
  const response = await api.get<ApplicationSummary>("/applications/summary/");
  return response.data;
}

export async function startApplicationFromSaved(savedId: number) {
  const response = await api.post<OpportunityApplication>(
    `/saved-opportunities/${savedId}/start-application/`,
  );
  return response.data;
}

export async function startApplicationByOpportunitySlug(slug: string) {
  const response = await api.post<OpportunityApplication>(
    `/opportunities/${slug}/start-application/`,
  );
  return response.data;
}

export async function startApplicationByScholarshipSlug(slug: string) {
  const response = await api.post<OpportunityApplication>(
    `/scholarships/${slug}/start-application/`,
  );
  return response.data;
}

export async function getScholarshipComments(slug: string) {
  const response = await axios.get<ScholarshipCommentResponse>(
    `${API_BASE_URL}/scholarships/${slug}/comments/`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

export async function createScholarshipComment(
  slug: string,
  payload: CreateScholarshipCommentPayload,
) {
  const response = await api.post<ScholarshipComment>(`/scholarships/${slug}/comments/`, payload);
  return response.data;
}

export async function replyToScholarshipComment(
  slug: string,
  commentId: number,
  payload: CreateScholarshipCommentPayload,
) {
  const response = await api.post<ScholarshipCommentReply>(
    `/scholarships/${slug}/comments/${commentId}/replies/`,
    payload,
  );
  return response.data;
}

export async function deleteScholarshipComment(commentId: number) {
  await api.delete(`/scholarship-comments/${commentId}/`);
}

// AI tools

export async function submitSOPJob(payload: GenerateSOPPayload) {
  const response = await api.post<SubmitAIJobResponse>("/ai/sop/generate/", payload);
  return response.data;
}

export async function getAIJobStatus(jobId: number) {
  const response = await api.get<AIJobStatus>(`/ai/jobs/${jobId}/`);
  return response.data;
}
