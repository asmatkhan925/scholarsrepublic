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
  country: string;
  country_id: number | null;
  parent: string;
  parent_id: number | null;
  full_path: string;
  description: string;
  official_link: string;
};

export type OpportunityListItem = {
  id: number;
  title: string;
  slug: string;
  opportunity_type: OpportunityType;
  status: "draft" | "published" | "archived";
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
  funding_amount: string | null;
  funding_currency: string;
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
  search_keywords: string;
  is_saved: boolean;
  saved_opportunity_id: number | null;
  is_tracking: boolean;
  application_id: number | null;
  created_at: string;
};

export type OpportunityListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OpportunityListItem[];
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

export type CreateScholarshipCommentPayload = {
  body: string;
};

export type RecommendedOpportunity = {
  opportunity: OpportunityListItem;
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
  ordering?: string;
};

export type OpportunityAdminPayload = Partial<OpportunityDetail> & {
  title: string;
};
