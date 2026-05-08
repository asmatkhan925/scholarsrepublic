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

export type OpportunityListItem = {
  id: number;
  title: string;
  slug: string;
  opportunity_type: OpportunityType;
  status: "draft" | "published" | "archived";
  featured: boolean;
  verified_status: boolean;
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

export type RecommendedOpportunity = {
  opportunity: OpportunityListItem;
  match: OpportunityMatch;
};

export type RecommendedOpportunityResponse = {
  count: number;
  results: RecommendedOpportunity[];
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
