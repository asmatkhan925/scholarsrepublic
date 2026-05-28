import axios from "axios";

import type { CountryListResponse, StudyFieldListResponse } from "@/types/reference";
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
import type {
  AIJobStatus,
  CreateSOPDraftPayload,
  GenerateSOPPayload,
  SOPDraft,
  SubmitAIJobResponse,
  UpdateSOPDraftPayload,
} from "@/types/ai";
import type {
  AdminOpportunityComment,
  AdminOpportunityCommentResponse,
  AdminOpportunityDuplicatePayload,
  AdminOpportunityDuplicateResponse,
  ApplicationQueryParams,
  ApplicationSummary,
  CreateApplicationPayload,
  CreateSavedOpportunityPayload,
  FacebookPostNowResponse,
  FacebookScheduleResponse,
  CreateScholarshipCommentPayload,
  DeadlineVerificationActionResponse,
  DeadlineVerificationApplyResponse,
  DeadlineVerificationPackage,
  DeadlineVerificationQueueResponse,
  OpportunityAdminPayload,
  OpportunityApplication,
  CreateOpportunityDraftPayload,
  OpportunityDraft,
  OpportunityDraftImportResponse,
  OpportunityDraftResponse,
  OpportunityDraftStatus,
  UpdateOpportunityDraftPayload,
  OpportunityApplicationResponse,
  OpportunityDetail,
  OpportunityListItem,
  OpportunityListResponse,
  OpportunityMatch,
  OpportunityPathwayDetail,
  OpportunityPathwayListResponse,
  OpportunityPathwayQueryParams,
  OpportunityQueryParams,
  RecommendedOpportunityResponse,
  SavedOpportunity,
  SavedOpportunityResponse,
  SavedOpportunitySlugsResponse,
  ScholarshipComment,
  ScholarshipCommentReply,
  ScholarshipCommentResponse,
  SocialImageState,
  UpdateApplicationPayload,
} from "@/types/opportunity";
import type { ProfileCompletion, StudentProfile, StudentProfilePayload } from "@/types/profile";
import { getAccessToken } from "@/lib/auth";

function resolvePublicApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000/api";
  }

  return null;
}

const API_BASE_URL = resolvePublicApiBaseUrl();

type PaginationParams = {
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

  const accessToken = getAccessToken();
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export type AdminOverviewResponse = {
  scholarships: {
    total: number;
    draft: number;
    published: number;
    archived: number;
    featured: number;
    unverified: number;
    expiring_soon: number;
  };
  drafts: {
    total: number;
    needs_review: number;
    new: number;
    validated: number;
    imported: number;
    error: number;
  };
  comments: {
    pending: number;
    active: number;
    deleted: number;
  };
  students: {
    total: number;
  };
  applications: {
    total: number;
    saved: number;
  };
};

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

export async function getOpportunityPathways(params?: OpportunityPathwayQueryParams) {
  const response = await api.get<OpportunityPathwayListResponse>("/opportunity-pathways/", {
    params,
  });
  return response.data;
}

export async function getOpportunityPathway(slug: string) {
  const response = await api.get<OpportunityPathwayDetail>(`/opportunity-pathways/${slug}/`);
  return response.data;
}

export async function getAdminOpportunityPathways(
  params?: OpportunityPathwayQueryParams & PaginationParams & { active?: boolean },
) {
  const response = await api.get<OpportunityPathwayListResponse>("/admin/opportunity-pathways/", {
    params,
  });
  return response.data;
}

export type AdminOpportunityPathwayPayload = {
  title: string;
  slug?: string;
  pathway_type: string;
  country_id?: number | null;
  parent_id?: number | null;
  description?: string;
  official_link?: string;
  display_order?: number;
  is_active?: boolean;
};

export async function createAdminOpportunityPathway(payload: AdminOpportunityPathwayPayload) {
  const response = await api.post<OpportunityPathwayDetail>(
    "/admin/opportunity-pathways/",
    payload,
  );
  return response.data;
}

export async function updateAdminOpportunityPathway(
  id: number,
  payload: Partial<AdminOpportunityPathwayPayload>,
) {
  const response = await api.patch<OpportunityPathwayDetail>(
    `/admin/opportunity-pathways/${id}/`,
    payload,
  );
  return response.data;
}

export async function deactivateAdminOpportunityPathway(id: number) {
  await api.delete(`/admin/opportunity-pathways/${id}/`);
}

export async function reactivateAdminOpportunityPathway(id: number) {
  const response = await api.patch<OpportunityPathwayDetail>(
    `/admin/opportunity-pathways/${id}/`,
    { is_active: true },
  );
  return response.data;
}

export async function getScholarships(params?: OpportunityQueryParams & PaginationParams) {
  const response = await api.get<OpportunityListResponse>("/scholarships/", {
    params,
  });
  return response.data;
}

export type ScholarshipPickerQueryParams = {
  q?: string;
  limit?: number;
};

export type ScholarshipPickerItem = OpportunityListItem & {
  is_saved: boolean;
  match_score: number | null;
};

export type ScholarshipPickerResponse = {
  count: number;
  results: ScholarshipPickerItem[];
};

export async function getScholarshipPicker(params?: ScholarshipPickerQueryParams) {
  const response = await api.get<ScholarshipPickerResponse>("/scholarships/picker/", {
    params,
  });
  return response.data;
}

export async function getScholarship(slug: string) {
  const response = await api.get<OpportunityDetail>(`/scholarships/${slug}/`);
  return response.data;
}

export async function getAdminOverview() {
  const response = await api.get<AdminOverviewResponse>("/admin/overview/");
  return response.data;
}

export async function getAdminOpportunities(params?: OpportunityQueryParams & PaginationParams) {
  const response = await api.get<OpportunityListResponse>("/admin/opportunities/", {
    params,
  });
  return response.data;
}

export async function getAdminOpportunity(id: number) {
  const response = await api.get<OpportunityDetail>(`/admin/opportunities/${id}/`);
  return response.data;
}

export async function checkAdminOpportunityDuplicates(
  payload: AdminOpportunityDuplicatePayload,
) {
  const response = await api.post<AdminOpportunityDuplicateResponse>(
    "/admin/opportunities/check-duplicates/",
    payload,
  );
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

export type AdminOpportunityDraftQueryParams = PaginationParams & {
  status?: OpportunityDraftStatus;
  search?: string;
  needs_review?: boolean;
};

export async function getAdminOpportunityDrafts(params?: AdminOpportunityDraftQueryParams) {
  const response = await api.get<OpportunityDraftResponse>("/admin/opportunity-drafts/", {
    params,
  });
  return response.data;
}

export async function getAdminOpportunityDraft(id: number) {
  const response = await api.get<OpportunityDraft>(`/admin/opportunity-drafts/${id}/`);
  return response.data;
}

export async function createAdminOpportunityDraft(payload: CreateOpportunityDraftPayload) {
  const response = await api.post<OpportunityDraft>("/admin/opportunity-drafts/", payload);
  return response.data;
}

export async function patchAdminOpportunityDraft(
  id: number,
  payload: UpdateOpportunityDraftPayload,
) {
  const response = await api.patch<OpportunityDraft>(`/admin/opportunity-drafts/${id}/`, payload);
  return response.data;
}

export async function validateAdminOpportunityDraft(id: number) {
  const response = await api.post<OpportunityDraft>(`/admin/opportunity-drafts/${id}/validate/`);
  return response.data;
}

export async function importAdminOpportunityDraft(id: number) {
  const response = await api.post<OpportunityDraftImportResponse>(
    `/admin/opportunity-drafts/${id}/import/`,
  );
  return response.data;
}

export async function deleteAdminOpportunityDraft(id: number) {
  await api.delete(`/admin/opportunity-drafts/${id}/`);
}

export type SocialImageUploadResponse = {
  ok: boolean;
  draft_id?: number;
  opportunity_id?: number;
  plan_id?: number;
  social_draft_id?: number;
} & SocialImageState;

function buildSocialImageFormData(image: File, imagePrompt?: string) {
  const formData = new FormData();
  formData.append("image", image);
  if (imagePrompt?.trim()) {
    formData.append("image_prompt", imagePrompt.trim());
  }
  formData.append("image_source", "gpt_uploaded");
  return formData;
}

export async function uploadAdminDraftSocialImage(
  draftId: number,
  image: File,
  imagePrompt?: string,
) {
  const response = await api.post<SocialImageUploadResponse>(
    `/admin/scholarships/drafts/${draftId}/social-image-upload/`,
    buildSocialImageFormData(image, imagePrompt),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

export async function uploadAdminOpportunitySocialImage(
  opportunityId: number,
  image: File,
  imagePrompt?: string,
) {
  const response = await api.post<SocialImageUploadResponse>(
    `/admin/scholarships/${opportunityId}/social-image-upload/`,
    buildSocialImageFormData(image, imagePrompt),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

export async function saveAdminDraftSocialPostReview(
  draftId: number,
  payload: { post_text: string; image_prompt?: string },
) {
  const response = await api.post<SocialImageUploadResponse>(
    `/admin/scholarships/drafts/${draftId}/social-post-review/`,
    payload,
  );
  return response.data;
}

export async function saveAdminOpportunitySocialPostReview(
  opportunityId: number,
  payload: { post_text: string; image_prompt?: string; link_url?: string },
) {
  const response = await api.post<SocialImageUploadResponse>(
    `/admin/scholarships/${opportunityId}/social-post-review/`,
    payload,
  );
  return response.data;
}

export async function postScholarshipToFacebookNow(
  opportunityId: number,
  payload?: { force?: boolean },
) {
  const response = await api.post<FacebookPostNowResponse>(
    `/admin/scholarships/${opportunityId}/facebook/post-now/`,
    payload ?? {},
  );
  return response.data;
}

export async function scheduleScholarshipFacebookPost(
  opportunityId: number,
  payload: { next_post_at: string },
) {
  const response = await api.post<FacebookScheduleResponse>(
    `/admin/scholarships/${opportunityId}/facebook/schedule/`,
    payload,
  );
  return response.data;
}

export async function prepareAdminDeadlineVerification(opportunityId: number) {
  const response = await api.post<DeadlineVerificationPackage>(
    `/admin/scholarships/${opportunityId}/deadline-verification-package/`,
    {},
  );
  return response.data;
}

export async function getAdminDeadlineVerificationQueue(payload?: {
  limit?: number;
  days?: number;
  only_near_deadline?: boolean;
  status?:
    | "all"
    | "near"
    | "needs_review"
    | "unclear"
    | "failed"
    | "confirmed"
    | "extended"
    | "image_stale"
    | "unchecked";
  include_expired?: boolean;
}) {
  const response = await api.post<DeadlineVerificationQueueResponse>(
    "/admin/scholarships/deadline-verification-queue/",
    payload ?? {},
  );
  return response.data;
}

export async function runAdminDeadlineVerificationAction(payload: {
  action: "prepare_packages" | "mark_reviewed" | "recheck";
  ids: number[];
}) {
  const response = await api.post<DeadlineVerificationActionResponse>(
    "/admin/scholarships/deadline-verification-actions/",
    payload,
  );
  return response.data;
}

export async function applyAdminDetectedDeadline(
  opportunityId: number,
  payload: { detected_deadline: string; evidence_text?: string; source_url?: string },
) {
  const response = await api.post<DeadlineVerificationApplyResponse>(
    `/admin/scholarships/${opportunityId}/deadline-apply/`,
    payload,
  );
  return response.data;
}

export type AdminCommentQueryParams = PaginationParams & {
  search?: string;
  status?: "pending" | "active" | "deleted";
  type?: "top_level" | "reply";
};

export async function getAdminOpportunityComments(params?: AdminCommentQueryParams) {
  const response = await api.get<AdminOpportunityCommentResponse>("/admin/comments/", {
    params,
  });
  return response.data;
}

export async function moderateAdminOpportunityComment(
  id: number,
  action: "approve" | "hide" | "delete",
) {
  const response = await api.patch<AdminOpportunityComment>(`/admin/comments/${id}/`, {
    action,
  });
  return response.data;
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

export async function getRecommendedScholarships(
  params?: OpportunityQueryParams & PaginationParams,
) {
  const response = await api.get<RecommendedOpportunityResponse>("/scholarships/recommended/", {
    params,
  });
  return response.data;
}

export async function getSavedOpportunities(params?: PaginationParams) {
  const response = await api.get<SavedOpportunityResponse>("/saved-opportunities/", {
    params,
  });
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

export async function getSOPDrafts() {
  const response = await api.get<SOPDraft[]>("/ai/sop-drafts/");
  return response.data;
}

export async function getSOPDraft(id: number) {
  const response = await api.get<SOPDraft>(`/ai/sop-drafts/${id}/`);
  return response.data;
}

export async function createSOPDraft(payload: CreateSOPDraftPayload) {
  const response = await api.post<SOPDraft>("/ai/sop-drafts/", payload);
  return response.data;
}

export async function patchSOPDraft(id: number, payload: UpdateSOPDraftPayload) {
  const response = await api.patch<SOPDraft>(`/ai/sop-drafts/${id}/`, payload);
  return response.data;
}

export async function deleteSOPDraft(id: number) {
  await api.delete(`/ai/sop-drafts/${id}/`);
}
