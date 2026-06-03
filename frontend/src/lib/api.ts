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
  ScholarshipResearchLeadActionResponse,
  ScholarshipResearchLeadResponse,
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

export type SocialSchedulerStatusResponse = {
  server_time: string;
  posted_today: number;
  skipped_today: number;
  failed_today: number;
  daily_cap: number;
  daily_remaining: number;
  per_run_cap: number;
  min_spacing_minutes: number;
  latest_posted_at: string | null;
  next_allowed_post_at: string | null;
  due_count: number;
  returned_count: number;
  reason: string;
  blocked_reason_counts: Record<string, number>;
  candidate_counts_by_tier: Record<string, number>;
  selected_counts_by_tier: Record<string, number>;
  candidate_counts_by_deadline_window: Record<string, number>;
  selected_counts_by_deadline_window: Record<string, number>;
  deadline_balance_policy: string;
  urgent_selected_count: number;
  advance_notice_selected_count: number;
  fallback_used: boolean;
  selection_policy: string;
  daily_target: number;
  per_run_target: number;
  strict_candidate_count: number;
  fallback_candidate_count: number;
  health_alerts: Array<{
    level: "info" | "warning" | "critical";
    code: string;
    title: string;
    message: string;
    suggested_action: string;
    related_url: string;
  }>;
  due_items: Array<{
    type: "opportunity" | "collection";
    plan_id: number;
    opportunity_id?: number;
    collection_id?: number;
    title?: string;
    collection_title?: string;
    message: string;
    image_url: string;
    image_source: string;
    link_url: string;
    auto_social_decision?: string;
    priority_score: number;
    priority_reason?: Record<string, unknown>;
    deadline_window?: string;
    deadline_window_label?: string;
    days_until_deadline?: number | null;
    auto_post_tier?: string;
    auto_post_tier_label?: string;
    auto_post_rank_score?: number;
    fallback_eligible?: boolean;
    hard_blocking_reasons?: string[];
    quality_warnings?: string[];
    next_post_at?: string | null;
  }>;
  individual_plans: {
    ready: number;
    due_ready: number;
    posted: number;
    failed: number;
    paused: number;
    draft: number;
    by_auto_social_decision: {
      individual: number;
      collection_candidate: number;
      website_only: number;
      manual_review: number;
    };
  };
  collections: {
    by_status: Record<string, number>;
    social_post_plans_by_status: Record<string, number>;
    next_plans: Array<{
      id: number;
      collection_id: number;
      collection_title: string;
      status: string;
      platform: string;
      priority_score: number;
      next_post_at: string | null;
      posted_at: string | null;
      link_url: string;
      facebook_post_id: string;
    }>;
  };
  recent_logs: {
    opportunities: Array<{
      created_at: string | null;
      status: string;
      title: string;
      plan_id: number | null;
      error_message: string;
    }>;
    collections: Array<{
      created_at: string | null;
      status: string;
      title: string;
      plan_id: number | null;
      error_message: string;
    }>;
  };
};

export type AdminOpportunitySocialPlan = {
  id: number;
  type: "opportunity";
  platform: string;
  status: string;
  enabled: boolean;
  opportunity_id: number;
  opportunity_title: string;
  opportunity_slug: string;
  opportunity_status: string;
  provider_name: string;
  country: string;
  deadline: string | null;
  days_until_deadline: number | null;
  deadline_window: string;
  deadline_window_label: string;
  post_text: string;
  link_url: string;
  image_url: string;
  image_source: string;
  has_image: boolean;
  has_caption: boolean;
  is_near_deadline: boolean;
  auto_post_eligible: boolean;
  fallback_eligible: boolean;
  auto_post_tier: string;
  auto_post_tier_label: string;
  auto_post_rank_score: number;
  ranking_explanation: string;
  hard_blocking_reasons: string[];
  quality_warnings: string[];
  blocking_reasons: string[];
  next_post_at: string | null;
  last_posted_at: string | null;
  priority_score: number;
  priority_reason: Record<string, unknown>;
  auto_social_decision: string;
  last_error: string;
  updated_at: string | null;
  admin_url: string;
};

export type AdminCollectionSocialPlan = {
  id: number;
  type: "collection";
  platform: string;
  status: string;
  collection_id: number;
  collection_title: string;
  collection_slug: string;
  collection_status: string;
  collection_type: string;
  deadline: string | null;
  days_until_deadline: number | null;
  deadline_window: string;
  deadline_window_label: string;
  post_text: string;
  link_url: string;
  image_url: string;
  image_source: string;
  has_image: boolean;
  has_caption: boolean;
  has_near_deadline_item: boolean;
  has_expired_item: boolean;
  auto_post_eligible: boolean;
  fallback_eligible: boolean;
  auto_post_tier: string;
  auto_post_tier_label: string;
  auto_post_rank_score: number;
  ranking_explanation: string;
  hard_blocking_reasons: string[];
  quality_warnings: string[];
  blocking_reasons: string[];
  next_post_at: string | null;
  posted_at: string | null;
  priority_score: number;
  facebook_post_id: string;
  updated_at: string | null;
  admin_url: string;
};

export type AdminSocialPlanListResponse<T> = {
  count: number;
  items: T[];
};

export type AdminSocialPlanQuery = {
  q?: string;
  status?: string;
  auto_social_decision?: string;
  collection_status?: string;
  due?: boolean;
  auto_post_eligible?: boolean;
  strict_best?: boolean;
  fallback_eligible?: boolean;
  hard_blocked?: boolean;
  missing_image?: boolean;
  missing_caption?: boolean;
  near_deadline?: boolean;
  deadline_window?: string;
  blocked?: boolean;
  limit?: number;
};

export type AdminSocialLogQuery = {
  type?: "all" | "opportunity" | "collection";
  status?: "all" | "posted" | "skipped" | "failed";
  date_from?: string;
  date_to?: string;
  q?: string;
  limit?: number;
};

export type AdminSocialLogItem = {
  id: number;
  type: "opportunity" | "collection";
  created_at: string | null;
  status: string;
  title: string;
  plan_id: number | null;
  facebook_post_id: string;
  error_message: string;
  link_url: string;
  admin_url: string;
  record_admin_url: string;
};

export type AdminSocialLogListResponse = {
  count: number;
  items: AdminSocialLogItem[];
  summary: {
    posted_today: number;
    failed_today: number;
    skipped_today: number;
    collection_posts_today: number;
    opportunity_posts_today: number;
  };
};

export type AdminSocialReelSourceOpportunity = {
  id: number;
  title: string;
  short_title?: string;
  slug: string;
  provider_name: string;
  country: string;
  degree?: string;
  deadline: string | null;
  deadline_label?: string;
  deadline_window?: string;
  deadline_window_label?: string;
  days_until_deadline?: number | null;
  priority_score?: number;
  selection_reason?: string;
};

export type AdminSocialReelPlan = {
  id: number;
  title: string;
  reel_type: "closing_soon" | "prepare_early" | "single_scholarship" | "collection";
  template_key: string;
  status:
    | "draft"
    | "ready_for_render"
    | "rendering"
    | "rendered"
    | "ready"
    | "posted"
    | "failed"
    | "paused"
    | "archived";
  scenes_json: Array<Record<string, unknown> | string>;
  script_text: string;
  voiceover_text: string;
  caption_text: string;
  hashtags: string;
  source_opportunity_ids: number[];
  source_opportunities: AdminSocialReelSourceOpportunity[];
  source_collection_id: number | null;
  source_collection_title: string;
  video_url: string;
  thumbnail_url: string;
  render_error: string;
  next_post_at: string | null;
  priority_score: number;
  deadline_window: string;
  expected_duration_seconds: number | null;
  audio_added: boolean;
  audio_path: string;
  audio_error: string;
  audio_status: "enabled" | "silent" | "missing_file" | "mix_failed_fallback" | string;
  renderer_used: "remotion" | "fallback" | "";
  renderer_error: string;
  music_configured: boolean;
  music_volume: number;
  music_license_metadata: {
    source_url?: string;
    source_name?: string;
    license_note?: string;
    downloaded_at?: string;
    filename?: string;
  };
  created_at: string | null;
  updated_at: string | null;
  admin_url: string;
};

export type AdminSocialReelPlanPayload = {
  title: string;
  reel_type: AdminSocialReelPlan["reel_type"];
  template_key?: string;
  status?: AdminSocialReelPlan["status"];
  scenes_json?: Array<Record<string, unknown> | string>;
  script_text?: string;
  voiceover_text?: string;
  caption_text?: string;
  hashtags?: string;
  source_opportunity_ids?: number[];
  source_collection_id?: number | null;
  next_post_at?: string | null;
  priority_score?: number;
  deadline_window?: string;
};

export type AdminSocialReelPlanListResponse = {
  count: number;
  items: AdminSocialReelPlan[];
};

export type AdminSocialReelPlanQuery = {
  q?: string;
  status?: string;
  reel_type?: string;
  limit?: number;
};

export type AdminSocialReelGeneratePreview = {
  ok: boolean;
  id: number | null;
  title: string;
  reel_type: AdminSocialReelPlan["reel_type"] | "";
  template_key: string;
  status: string;
  source_opportunity_ids: number[];
  source_opportunities: AdminSocialReelSourceOpportunity[];
  scenes_json: Array<Record<string, unknown> | string>;
  caption_text: string;
  hashtags: string;
  priority_score: number;
  deadline_window: string;
  expected_duration_seconds: number | null;
  selection_reason: string;
  skip_reason: string;
  dry_run: boolean;
  video_url: string;
};

export type AdminSocialReelGenerateResponse = {
  ok: true;
  created_count: number;
  rendered_count: number;
  skipped_reasons: string[];
  plans: AdminSocialReelGeneratePreview[];
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
  const response = await api.patch<OpportunityPathwayDetail>(`/admin/opportunity-pathways/${id}/`, {
    is_active: true,
  });
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

export async function getSocialSchedulerStatus() {
  const response = await api.get<SocialSchedulerStatusResponse>(
    "/admin/social/scheduler-status/",
  );
  return response.data;
}

export async function getAdminSocialLogs(params?: AdminSocialLogQuery) {
  const response = await api.get<AdminSocialLogListResponse>("/admin/social/logs/", {
    params,
  });
  return response.data;
}

export async function getAdminOpportunitySocialPlans(params?: AdminSocialPlanQuery) {
  const response = await api.get<AdminSocialPlanListResponse<AdminOpportunitySocialPlan>>(
    "/admin/social/opportunity-plans/",
    { params },
  );
  return response.data;
}

export async function saveAdminOpportunitySocialPlanCaption(planId: number, postText: string) {
  const response = await api.post<AdminOpportunitySocialPlan>(
    `/admin/social/opportunity-plans/${planId}/caption/`,
    { post_text: postText },
  );
  return response.data;
}

export async function getAdminCollectionSocialPlans(params?: AdminSocialPlanQuery) {
  const response = await api.get<AdminSocialPlanListResponse<AdminCollectionSocialPlan>>(
    "/admin/social/collection-plans/",
    { params },
  );
  return response.data;
}

export async function saveAdminCollectionSocialPlanCaption(planId: number, postText: string) {
  const response = await api.post<AdminCollectionSocialPlan>(
    `/admin/social/collection-plans/${planId}/caption/`,
    { post_text: postText },
  );
  return response.data;
}

export async function getAdminSocialReelPlans(params?: AdminSocialReelPlanQuery) {
  const response = await api.get<AdminSocialReelPlanListResponse>("/admin/social/reels/", {
    params,
  });
  return response.data;
}

export async function createAdminSocialReelPlan(payload: AdminSocialReelPlanPayload) {
  const response = await api.post<AdminSocialReelPlan>("/admin/social/reels/", payload);
  return response.data;
}

export async function getAdminSocialReelPlan(id: number) {
  const response = await api.get<AdminSocialReelPlan>(`/admin/social/reels/${id}/`);
  return response.data;
}

export async function generateAdminSocialReelPlans(payload: {
  reel_type?: "auto" | AdminSocialReelPlan["reel_type"];
  template_key?: string;
  limit?: number;
  render?: boolean;
  dry_run?: boolean;
  force?: boolean;
}) {
  const response = await api.post<AdminSocialReelGenerateResponse>(
    "/admin/social/reels/generate/",
    payload,
  );
  return response.data;
}

export async function renderAdminSocialReelPlan(id: number, payload?: { force?: boolean }) {
  const response = await api.post<{ result: Record<string, unknown>; plan: AdminSocialReelPlan }>(
    `/admin/social/reels/${id}/render/`,
    payload ?? {},
  );
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

export async function checkAdminOpportunityDuplicates(payload: AdminOpportunityDuplicatePayload) {
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
    | "needs_verification"
    | "recently_verified"
    | "confirmed"
    | "extended"
    | "needs_review"
    | "unclear"
    | "failed"
    | "all"
    | "near"
    | "image_stale"
    | "unchecked";
  include_expired?: boolean;
  include_recently_verified?: boolean;
  freshness_days?: number;
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

export async function getAdminScholarshipResearchLeads(params?: {
  review_status?: string;
  country?: string;
  degree_level?: string;
  provider_name?: string;
  duplicate_status?: string;
  limit?: number;
}) {
  const response = await api.get<ScholarshipResearchLeadResponse>(
    "/admin/scholarships/research-leads/",
    { params },
  );
  return response.data;
}

export async function updateAdminScholarshipResearchLeadStatus(
  id: number,
  action: "ready_for_draft" | "reject" | "imported" | "needs_review",
) {
  const response = await api.post<ScholarshipResearchLeadActionResponse>(
    `/admin/scholarships/research-leads/${id}/`,
    { action },
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
