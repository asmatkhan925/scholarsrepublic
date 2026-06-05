import type { OpportunityStatus } from "@/types/opportunity";

export type ScholarshipEditForm = {
  title: string;
  provider_name: string;
  university_name: string;
  country: string;
  pathway_id: number | null;
  status: OpportunityStatus;
  featured: boolean;
  verified_status: boolean;
  verification_note: string;
  short_description: string;
  description: string;
  benefits: string;
  eligibility: string;
  how_to_apply: string;
  official_link: string;
  source_url: string;
  source_name: string;
  deadline: string;
  is_rolling_deadline: boolean;
  funding_type: string;
  funding_amount: string;
  funding_currency: string;
  stipend_summary: string;
  degree_levels: string;
  fields_of_study: string;
  eligible_countries: string;
  required_documents: string;
  tags: string;
  application_fee_required: boolean;
  ielts_required: boolean;
  toefl_required: boolean;
  duolingo_required: boolean;
  hsk_required: boolean;
  english_proficiency_certificate_accepted: boolean;
};

export const emptyForm: ScholarshipEditForm = {
  title: "",
  provider_name: "",
  university_name: "",
  country: "",
  pathway_id: null,
  status: "draft",
  featured: false,
  verified_status: false,
  verification_note: "",
  short_description: "",
  description: "",
  benefits: "",
  eligibility: "",
  how_to_apply: "",
  official_link: "",
  source_url: "",
  source_name: "",
  deadline: "",
  is_rolling_deadline: false,
  funding_type: "",
  funding_amount: "",
  funding_currency: "",
  stipend_summary: "",
  degree_levels: "",
  fields_of_study: "",
  eligible_countries: "",
  required_documents: "",
  tags: "",
  application_fee_required: false,
  ielts_required: false,
  toefl_required: false,
  duolingo_required: false,
  hsk_required: false,
  english_proficiency_certificate_accepted: false,
};

export const fundingOptions = [
  ["", "Not selected"],
  ["fully_funded", "Fully funded"],
  ["partially_funded", "Partially funded"],
  ["tuition_waiver", "Tuition waiver"],
  ["stipend_only", "Stipend only"],
  ["need_based", "Need based"],
  ["merit_based", "Merit based"],
  ["self_funded", "Self funded"],
  ["other", "Other"],
];
