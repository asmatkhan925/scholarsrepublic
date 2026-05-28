export type OpportunityStatus = "draft" | "published" | "archived";

export type OpportunityType =
  | "scholarship"
  | "job"
  | "internship"
  | "fellowship"
  | "exchange_program"
  | "research_position"
  | "admission"
  | "competition"
  | "training"
  | "mentorship_program";

export type OpportunityPathwayDetail = {
  id: number;
  title: string;
  slug: string;
  pathway_type: string;
  pathway_type_display?: string;
  country: string;
  country_id: number | null;
  country_ref?: number | null;
  parent: string;
  parent_id: number | null;
  parent_slug: string | null;
  full_path: string;
  description: string;
  official_link: string;
  display_order: number;
  is_active: boolean;
  children_count: number;
  published_opportunity_count: number;
  created_at?: string;
  updated_at?: string;
};

export type OpportunityListItem = {
  id: number;
  title: string;
  slug: string;
  opportunity_type: OpportunityType;
  status: OpportunityStatus;
  featured: boolean;
  verified_status: boolean;
  pathway_detail?: OpportunityPathwayDetail | null;
  application_track?: string;
  department_name?: string;
  lab_name?: string;
  professor_name?: string;
  provider_name: string;
  organization_type: string;
  university_name: string;
  company_name: string;
  country: string;
  city: string;
  location_type: string;
  short_description: string;
  funding_type: string;
  funding_amount: string | number | null;
  funding_currency: string;
  stipend_summary: string;
  degree_levels: string[];
  fields_of_study: string[];
  eligible_countries: string[];
  deadline: string | null;
  is_rolling_deadline: boolean;
  application_fee_required: boolean;
  hec_required: boolean;
  ielts_required: boolean;
  english_proficiency_certificate_accepted: boolean;
  required_skills: string[];
  employment_type: string;
  experience_level: string;
  tags: string[];
  is_expired: boolean;
  days_until_deadline: number | null;
  published_at: string | null;
  updated_at: string;
};

export type OpportunityDetail = OpportunityListItem & {
  verification_note: string;
  last_verified_at: string | null;
  description: string;
  benefits: string;
  eligibility: string;
  how_to_apply: string;
  official_link: string;
  source_url: string;
  source_name: string;
  target_regions: string[];
  gender_eligibility: string;
  min_cgpa: string | null;
  min_percentage: string | null;
  min_education_level: string;
  application_fee_amount: string | null;
  application_fee_currency: string;
  toefl_required: boolean;
  duolingo_required: boolean;
  hsk_required: boolean;
  min_experience_years: string | null;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string;
  application_open_date: string | null;
  application_method: string;
  required_documents: string[];
  search_keywords?: string;
  is_saved: boolean;
  saved_opportunity_id: number | null;
  is_tracking: boolean;
  application_id: number | null;
  social_image: SocialImageState | null;
  deadline_last_checked_at: string | null;
  deadline_check_status: string;
  deadline_check_confidence: string;
  deadline_check_note: string;
  deadline_check_source_url: string;
  deadline_check_evidence: string;
  deadline_previous_value: string | null;
  deadline_updated_from_source_at: string | null;
  created_at: string;
};

export type OpportunityListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OpportunityListItem[];
};

export type OpportunityPathwayListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OpportunityPathwayDetail[];
};

export type AdminOpportunityDuplicateConfidence = "exact" | "high" | "medium" | "low";

export type AdminOpportunityDuplicateMatch = {
  id: number;
  title: string;
  slug: string;
  status: OpportunityStatus;
  confidence: AdminOpportunityDuplicateConfidence;
  reasons: string[];
  deadline: string | null;
  country: string;
  provider_name: string;
  pathway_detail?: Pick<OpportunityPathwayDetail, "id" | "title" | "slug" | "full_path"> | null;
};

export type AdminOpportunityDuplicatePayload = {
  title?: string;
  slug?: string;
  official_link?: string;
  source_url?: string;
  provider_name?: string;
  university_name?: string;
  country?: string;
  deadline?: string;
  degree_levels?: string[];
  pathway_id?: number | null;
  pathway?: string;
  exclude_id?: number | null;
};

export type AdminOpportunityDuplicateResponse = {
  matches: AdminOpportunityDuplicateMatch[];
};

export type MatchBreakdown = {
  eligibility: number;
  degree_level: number;
  field_fit: number;
  country_preference: number;
  funding_fee: number;
  language_test: number;
  academic_requirement: number;
  document_readiness: number;
  deadline_safety: number;
};

export type OpportunityMatch = {
  score: number;
  readiness_level: "Low" | "Medium" | "High";
  breakdown: MatchBreakdown;
  matched_reasons: string[];
  missing_requirements: string[];
  warnings: string[];
  suggestions: string[];
};

export type ScholarshipCommentReply = {
  id: number;
  user: number;
  user_name: string;
  user_role: string;
  body: string;
  moderation_status: "pending" | "active" | "deleted";
  is_deleted: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
};

export type ScholarshipComment = {
  id: number;
  user: number;
  user_name: string;
  user_role: string;
  body: string;
  is_deleted: boolean;
  replies: ScholarshipCommentReply[];
  can_delete: boolean;
  created_at: string;
  updated_at: string;
};

export type ScholarshipCommentResponse = {
  count: number;
  results: ScholarshipComment[];
};

export type AdminOpportunityComment = {
  id: number;
  opportunity: number;
  opportunity_title: string;
  opportunity_slug: string;
  opportunity_status: string;
  parent: number | null;
  parent_id: number | null;
  user: number;
  user_name: string;
  user_email: string;
  user_role: string;
  body: string;
  moderation_status: "pending" | "active" | "deleted";
  is_deleted: boolean;
  replies_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminOpportunityCommentResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminOpportunityComment[];
};

export type CreateScholarshipCommentPayload = {
  body: string;
};

export type RecommendedOpportunity = {
  opportunity: OpportunityListItem & {
    is_saved?: boolean;
    saved_opportunity_id?: number | null;
    is_tracking?: boolean;
    application_id?: number | null;
  };
  match: OpportunityMatch;
};

export type RecommendedOpportunityResponse = {
  count: number;
  results: RecommendedOpportunity[];
};

export type SavedOpportunity = {
  id: number;
  opportunity: number;
  opportunity_detail: OpportunityListItem;
  notes: string;
  application_id: number | null;
  is_tracking: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedOpportunityResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: SavedOpportunity[];
};

export type SavedOpportunitySlugsResponse = {
  slugs: string[];
  ids: number[];
};

export type CreateSavedOpportunityPayload = {
  opportunity_id?: number;
  opportunity_slug?: string;
  notes?: string;
};

export type ApplicationStatus =
  | "preparing"
  | "documents_pending"
  | "documents_ready"
  | "applied"
  | "interview"
  | "result_waiting"
  | "selected"
  | "rejected"
  | "withdrawn"
  | "deferred";

export type ApplicationPriority = "low" | "medium" | "high";

export type ChecklistItem = {
  label: string;
  done: boolean;
  url?: string;
};

export type OpportunityApplication = {
  id: number;
  user: number;
  opportunity: number;
  opportunity_detail: OpportunityListItem;
  saved_opportunity: number | null;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  notes: string;
  next_step: string;
  reminder_at: string | null;
  submitted_at: string | null;
  decision_at: string | null;
  personal_deadline: string | null;
  checklist_snapshot: ChecklistItem[];
  required_documents: string[];
  latest_sop_draft: {
    id: number;
    title: string;
    updated_at: string;
  } | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityApplicationResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OpportunityApplication[];
};

export type CreateApplicationPayload = {
  opportunity_id?: number;
  opportunity_slug?: string;
  saved_opportunity_id?: number;
  status?: ApplicationStatus;
  priority?: ApplicationPriority;
  notes?: string;
  next_step?: string;
  reminder_at?: string | null;
  personal_deadline?: string | null;
  checklist_snapshot?: ChecklistItem[];
};

export type UpdateApplicationPayload = Partial<{
  status: ApplicationStatus;
  priority: ApplicationPriority;
  notes: string;
  next_step: string;
  reminder_at: string | null;
  submitted_at: string | null;
  decision_at: string | null;
  personal_deadline: string | null;
  checklist_snapshot: ChecklistItem[];
}>;

export type ApplicationSummary = {
  total: number;
  counts_by_status: Record<ApplicationStatus, number>;
  upcoming_deadlines: OpportunityApplication[];
  recently_updated: OpportunityApplication[];
};

export type ApplicationQueryParams = {
  status?: ApplicationStatus;
  priority?: ApplicationPriority;
  opportunity_type?: OpportunityType;
  search?: string;
  ordering?: string;
};

export type OpportunityQueryParams = {
  search?: string;
  opportunity_type?: OpportunityType;
  pathway?: string;
  pathway_id?: number;
  pathway_type?: string;
  application_track?: string;
  exact_pathway?: boolean;
  missing_pathway?: boolean;
  country?: string;
  degree_level?: string;
  field?: string;
  funding_type?: string;
  verified?: boolean;
  featured?: boolean;
  no_ielts?: boolean;
  no_application_fee?: boolean;
  hec_required?: boolean;
  remote?: boolean;
  include_expired?: boolean;
  expired?: boolean;
  ordering?: string;
  status?: OpportunityStatus;
};

export type OpportunityPathwayQueryParams = {
  search?: string;
  country?: string;
  country_id?: number;
  pathway_type?: string;
  parent?: string;
  parent_id?: number;
  root_only?: boolean;
  active?: boolean;
  page?: number;
  page_size?: number;
};

export type OpportunityAdminPayload = Partial<OpportunityDetail> & {
  title: string;
  pathway_id?: number | null;
};

export type SocialImageState = {
  image_url: string;
  image_source: string;
  image_status: string;
  image_error: string;
  image_is_stale?: boolean;
  image_prompt: string;
  post_text: string;
  link_url: string;
  plan_status: string;
  next_post_at: string | null;
  saved_at: string | null;
};

export type FacebookPostNowResponse = {
  ok: boolean;
  status: string;
  plan_id?: number;
  opportunity_id?: number;
  facebook_post_id?: string;
  facebook_post_url?: string;
  latest_facebook_post_url?: string;
  image_source?: string;
  image_url?: string;
  message?: string;
  caption?: string;
  error?: string;
};

export type FacebookScheduleResponse = {
  ok: boolean;
  status: string;
  plan_id: number;
  opportunity_id: number;
  next_post_at: string;
  message: string;
  link_url: string;
};

export type DeadlineVerificationPackage = {
  opportunity_id: number;
  title: string;
  provider: string;
  current_deadline: string | null;
  official_link: string;
  source_url: string;
  page_text_excerpt: string;
  candidate_dates: { date: string; evidence: string }[];
  deterministic_assessment?: {
    status: string;
    confidence: string;
    reason: string;
    detected_deadline: string | null;
  };
  fetch_error?: string;
  instructions: string;
};

export type DeadlineVerificationQueueItem = {
  id: number;
  title: string;
  provider: string;
  country: string;
  degree_level: string;
  deadline: string | null;
  days_left: number | null;
  official_link: string;
  source_url: string;
  deadline_check_status: string;
  deadline_check_confidence: string;
  deadline_last_checked_at: string | null;
  priority_reason: string;
  recently_verified: boolean;
  needs_verification: boolean;
  verification_fresh_until: string | null;
};

export type DeadlineVerificationQueueResponse = {
  ok: boolean;
  count: number;
  stats: {
    total_pending: number;
    near_deadline: number;
    unclear: number;
    failed: number;
    extended: number;
    stale_social_image: number;
  };
  items: DeadlineVerificationQueueItem[];
};

export type DeadlineVerificationActionResponse = {
  ok: boolean;
  action: string;
  updated?: number;
  count?: number;
  packages?: DeadlineVerificationPackage[];
};

export type DeadlineVerificationApplyResponse = {
  ok: boolean;
  log_id: number | null;
  status: string;
  confidence: string;
  detected_deadline: string | null;
  evidence_text: string;
  source_url: string;
  deadline_previous_value: string | null;
  deadline_updated_from_source_at: string | null;
};

export type OpportunityDraftStatus = "new" | "validated" | "imported" | "error";

export type OpportunityDraft = {
  id: number;
  title: string;
  slug: string;
  raw_payload: Record<string, unknown>;
  status: OpportunityDraftStatus;
  source_url: string;
  source_name: string;
  confidence: string;
  validation_warnings: string[];
  validation_errors: string[];
  created_opportunity: number | null;
  created_opportunity_detail: OpportunityListItem | null;
  created_by: number | null;
  created_by_email: string;
  social_image: SocialImageState | null;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityDraftResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OpportunityDraft[];
};

export type OpportunityDraftImportResponse = {
  detail?: string;
  draft: OpportunityDraft;
  opportunity?: OpportunityListItem;
};

export type CreateOpportunityDraftPayload = {
  title: string;
  raw_payload: Record<string, unknown>;
  status?: OpportunityDraftStatus;
};

export type UpdateOpportunityDraftPayload = Partial<{
  title: string;
  raw_payload: Record<string, unknown>;
}>;
