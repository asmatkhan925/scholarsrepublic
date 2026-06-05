import { api } from "../client";

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
  audio_track_name: string;
  audio_error: string;
  audio_status: "enabled" | "silent" | "missing_file" | "mix_failed_fallback" | string;
  renderer_used: "remotion" | "fallback" | "";
  renderer_error: string;
  music_configured: boolean;
  music_paths: string[];
  music_track_count: number;
  music_volume: number;
  music_license_metadata: {
    source_url?: string;
    source_name?: string;
    license_note?: string;
    downloaded_at?: string;
    filename?: string;
  };
  facebook_post_id: string;
  facebook_video_id: string;
  posted_at: string | null;
  facebook_post_error: string;
  ready_for_facebook: boolean;
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
