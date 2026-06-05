import type {
  DeadlineVerificationActionResponse,
  DeadlineVerificationApplyResponse,
  DeadlineVerificationPackage,
  DeadlineVerificationQueueResponse,
  FacebookPostNowResponse,
  FacebookScheduleResponse,
  ScholarshipResearchLeadActionResponse,
  ScholarshipResearchLeadResponse,
  SocialImageState,
} from "@/types/opportunity";

import { api } from "../client";

export type SocialImageUploadResponse = {
  ok: boolean;
  draft_id?: number;
  opportunity_id?: number;
  plan_id?: number;
  social_draft_id?: number;
} & SocialImageState;

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

function buildSocialImageFormData(image: File, imagePrompt?: string) {
  const formData = new FormData();
  formData.append("image", image);
  if (imagePrompt?.trim()) {
    formData.append("image_prompt", imagePrompt.trim());
  }
  formData.append("image_source", "gpt_uploaded");
  return formData;
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
