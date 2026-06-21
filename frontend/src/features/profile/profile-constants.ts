import { COMMON_FIELDS_OF_STUDY } from "@/lib/profile-options";
import type { StudentProfilePayload } from "@/types/profile";

export type ArrayField =
  | "target_fields"
  | "target_countries"
  | "additional_documents"
  | "research_interests"
  | "skills"
  | "special_scholarship_categories";

export type FieldName = keyof StudentProfilePayload;
export type SelectOption = string | { label: string; value: string };
export type CountryRegionMap = Record<string, readonly string[]>;
export type FieldCategoryMap = Record<string, readonly string[]>;

export const FALLBACK_STUDY_FIELD_CATEGORIES: FieldCategoryMap = {
  Popular: COMMON_FIELDS_OF_STUDY,
};

export const EMPTY_PROFILE: StudentProfilePayload = {
  phone_number: "",
  whatsapp_number: "",
  date_of_birth: null,
  nationality: "Pakistan",
  current_country: "Pakistan",
  city: "",
  province: "",
  domicile: "",
  current_education_level: "",
  current_institution: "",
  current_field_of_study: "",
  graduation_year: null,
  result_status: "",
  grading_system: "",
  cgpa: null,
  percentage: null,
  division: "",
  target_degree_level: "",
  target_fields: [],
  target_countries: [],
  preferred_intake: "",
  study_mode_preference: "",
  funding_preference: "",
  application_fee_preference: "",
  language_instruction_preference: "",
  has_ielts: false,
  ielts_score: null,
  has_toefl: false,
  toefl_score: null,
  has_duolingo: false,
  duolingo_score: null,
  has_pte: false,
  pte_score: null,
  has_hsk: false,
  hsk_level: "",
  has_gre: false,
  gre_score: null,
  has_gmat: false,
  gmat_score: null,
  english_proficiency_certificate: false,
  has_cnic: false,
  has_domicile: false,
  has_passport: false,
  passport_expiry_date: null,
  has_transcript: false,
  has_degree: false,
  has_cv: false,
  has_sop: false,
  has_study_plan: false,
  has_recommendation_letters: false,
  recommendation_letters_count: 0,
  has_research_proposal: false,
  has_publications: false,
  has_english_proficiency_letter: false,
  has_income_certificate: false,
  has_bank_statement: false,
  has_police_clearance: false,
  has_medical_certificate: false,
  additional_documents: [],
  research_interests: [],
  has_research_experience: false,
  publications_count: 0,
  has_supervisor_acceptance: false,
  supervisor_country: "",
  supervisor_university: "",
  skills: [],
  work_experience_years: null,
  has_internship_experience: false,
  linkedin_url: "",
  portfolio_url: "",
  github_url: "",
  need_based_support_required: false,
  can_pay_application_fee: false,
  max_application_fee_usd: null,
  can_self_fund_partial: false,
  special_scholarship_categories: [],
  email_alerts_enabled: true,
  whatsapp_alerts_enabled: false,
  profile_data_consent: true,
  profile_source: "manual",
  ai_autofill_reviewed: false,
};

export const nullableFields: FieldName[] = [
  "date_of_birth",
  "passport_expiry_date",
  "graduation_year",
  "cgpa",
  "percentage",
  "ielts_score",
  "toefl_score",
  "duolingo_score",
  "pte_score",
  "gre_score",
  "gmat_score",
  "work_experience_years",
  "max_application_fee_usd",
];

export const numericFieldLimits: Partial<Record<FieldName, { min?: number; max?: number }>> = {
  graduation_year: { min: 1900, max: 2100 },
  cgpa: { min: 0, max: 5 },
  percentage: { min: 0, max: 100 },
  ielts_score: { min: 0, max: 9 },
  toefl_score: { min: 0, max: 120 },
  duolingo_score: { min: 0, max: 160 },
  pte_score: { min: 0, max: 90 },
  gre_score: { min: 0, max: 340 },
  gmat_score: { min: 0, max: 800 },
  recommendation_letters_count: { min: 0, max: 20 },
  publications_count: { min: 0, max: 500 },
  work_experience_years: { min: 0, max: 60 },
  max_application_fee_usd: { min: 0, max: 10000 },
};

function buildPreferredIntakeOptions() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const semesters = [
    { label: "Spring", month: 0 },
    { label: "Fall", month: 8 },
  ];
  const options: string[] = [];

  for (let year = currentYear; options.length < 10 && year <= currentYear + 8; year += 1) {
    for (const semester of semesters) {
      if (year === currentYear && semester.month < currentMonth) {
        continue;
      }

      options.push(`${semester.label} ${year}`);

      if (options.length === 10) {
        break;
      }
    }
  }

  return options;
}

export const PREFERRED_INTAKE_OPTIONS = buildPreferredIntakeOptions();

export const TODAY_DATE = new Date().toISOString().slice(0, 10);

export const HSK_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"];

export const phoneFields: FieldName[] = ["phone_number", "whatsapp_number"];

export const urlFields: FieldName[] = ["linkedin_url", "portfolio_url", "github_url"];

/** Maps backend missing-field labels → the section anchor they live in */
export const MISSING_FIELD_SECTION: Record<string, string> = {
  // Personal
  City: "#profile-personal",
  Province: "#profile-personal",
  Domicile: "#profile-personal",
  // Education
  "Current education level": "#profile-education",
  "Current institution": "#profile-education",
  "Current field of study": "#profile-education",
  "Academic score": "#profile-education",
  // Targets
  "Target degree level": "#profile-targets",
  "Target countries": "#profile-targets",
  "Target fields": "#profile-targets",
  "Funding preference": "#profile-targets",
  "Preferred intake": "#profile-targets",
  // Tests
  "Language test information": "#profile-tests",
  "English Proficiency / IELTS / TOEFL / Duolingo / PTE": "#profile-tests",
  // Documents
  "Available documents": "#profile-documents",
  CNIC: "#profile-documents",
  Passport: "#profile-documents",
  Transcript: "#profile-documents",
  Degree: "#profile-documents",
  CV: "#profile-documents",
  "SOP or Study Plan": "#profile-documents",
  "Recommendation Letters": "#profile-documents",
  "Research Proposal": "#profile-documents",
  // Consent
  "Profile data consent": "#profile-consent",
};

export const PROFILE_SECTION_LINKS = [
  { label: "Personal", href: "#profile-personal" },
  { label: "Education", href: "#profile-education" },
  { label: "Targets", href: "#profile-targets" },
  { label: "Tests", href: "#profile-tests" },
  { label: "Documents", href: "#profile-documents" },
  { label: "Research", href: "#profile-research" },
  { label: "Funding", href: "#profile-funding" },
  { label: "Alerts", href: "#profile-consent" },
];

/** Which missing-field / missing-document labels belong to each section */
export const SECTION_MISSING_LABELS: Record<string, string[]> = {
  "#profile-personal": ["City", "Province", "Domicile"],
  "#profile-education": [
    "Current education level",
    "Current institution",
    "Current field of study",
    "Academic score",
  ],
  "#profile-targets": [
    "Target degree level",
    "Target countries",
    "Target fields",
    "Funding preference",
    "Preferred intake",
  ],
  "#profile-tests": [
    "Language test information",
    "English Proficiency / IELTS / TOEFL / Duolingo / PTE",
  ],
  "#profile-documents": [
    "Available documents",
    "CNIC",
    "Domicile",
    "Passport",
    "Transcript",
    "Degree",
    "CV",
    "SOP or Study Plan",
    "Recommendation Letters",
    "Research Proposal",
  ],
  "#profile-consent": ["Profile data consent"],
};
