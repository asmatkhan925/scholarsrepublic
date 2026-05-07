"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  createStudentProfile,
  getStudentProfile,
  patchStudentProfile,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  APPLICATION_FEE_PREFERENCES,
  COMMON_FIELDS_OF_STUDY,
  COMMON_SKILLS,
  COUNTRIES,
  DOCUMENT_OPTIONS,
  EDUCATION_LEVELS,
  FUNDING_PREFERENCES,
  GRADING_SYSTEMS,
  LANGUAGE_INSTRUCTION_PREFERENCES,
  PROVINCES,
  RESULT_STATUSES,
  SPECIAL_SCHOLARSHIP_CATEGORIES,
  STUDY_MODE_PREFERENCES,
  TARGET_DEGREE_LEVELS,
} from "@/lib/profile-options";
import type {
  ProfileCompletion,
  StudentProfile,
  StudentProfilePayload,
} from "@/types/profile";

type ArrayField =
  | "target_fields"
  | "target_countries"
  | "additional_documents"
  | "research_interests"
  | "skills"
  | "special_scholarship_categories";

type FieldName = keyof StudentProfilePayload;

const EMPTY_PROFILE: StudentProfilePayload = {
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
  need_based_support_required: false,
  can_pay_application_fee: false,
  max_application_fee_usd: null,
  can_self_fund_partial: false,
  special_scholarship_categories: [],
  email_alerts_enabled: true,
  whatsapp_alerts_enabled: false,
  profile_data_consent: false,
};

const nullableFields: FieldName[] = [
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

function normalizePayload(payload: StudentProfilePayload): StudentProfilePayload {
  const normalized = { ...payload };

  for (const field of nullableFields) {
    if (normalized[field] === "") {
      normalized[field] = null as never;
    }
  }

  if (normalized.recommendation_letters_count === "") {
    normalized.recommendation_letters_count = 0;
  }

  if (normalized.publications_count === "") {
    normalized.publications_count = 0;
  }

  return normalized;
}

function completionFromProfile(profile: StudentProfile | null): ProfileCompletion {
  return {
    completion_percentage: profile?.completion_percentage ?? 0,
    scholarship_readiness_score: profile?.scholarship_readiness_score ?? 0,
    readiness_level: profile?.readiness_level ?? "Low",
    missing_profile_fields: profile?.missing_profile_fields ?? [],
    missing_core_documents: profile?.missing_core_documents ?? [],
  };
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCommaList(value: string[]) {
  return value.join(", ");
}

function ProfilePageContent() {
  const [form, setForm] = useState<StudentProfilePayload>(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);
  const [completion, setCompletion] = useState<ProfileCompletion>(
    completionFromProfile(null),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getStudentProfile();
        if (mounted) {
          setForm({ ...EMPTY_PROFILE, ...profile });
          setCompletion(completionFromProfile(profile));
          setProfileExists(true);
        }
      } catch (requestError) {
        if (mounted) {
          if (axios.isAxiosError(requestError) && requestError.response?.status === 404) {
            setMessage("Create your scholarship readiness profile.");
          } else {
            setError(getErrorMessage(requestError));
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends FieldName>(name: K, value: StudentProfilePayload[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleArrayValue(name: ArrayField, value: string) {
    setForm((current) => {
      const values = current[name];
      return {
        ...current,
        [name]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = normalizePayload(form);
      const profile = profileExists
        ? await patchStudentProfile(payload)
        : await createStudentProfile(payload);

      setForm({ ...EMPTY_PROFILE, ...profile });
      setCompletion(completionFromProfile(profile));
      setProfileExists(true);
      setMessage("Profile saved successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const readinessTone = useMemo(() => {
    if (completion.readiness_level === "High") {
      return "bg-mint text-pine";
    }

    if (completion.readiness_level === "Medium") {
      return "bg-saffron/20 text-ink";
    }

    return "bg-red-50 text-red-700";
  }, [completion.readiness_level]);

  function TextField({
    label,
    name,
    type = "text",
    helper,
    placeholder,
  }: {
    label: string;
    name: FieldName;
    type?: string;
    helper?: string;
    placeholder?: string;
  }) {
    const value = form[name];

    return (
      <label className="grid gap-2 text-sm font-medium text-ink">
        {label}
        <input
          type={type}
          value={value === null ? "" : String(value)}
          onChange={(event) => setField(name, event.target.value as never)}
          placeholder={placeholder}
          className="rounded border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
        />
        {helper && <span className="text-xs font-normal text-ink/55">{helper}</span>}
      </label>
    );
  }

  function SelectField({
    label,
    name,
    options,
  }: {
    label: string;
    name: FieldName;
    options: Array<string | { label: string; value: string }>;
  }) {
    return (
      <label className="grid gap-2 text-sm font-medium text-ink">
        {label}
        <select
          value={String(form[name] ?? "")}
          onChange={(event) => setField(name, event.target.value as never)}
          className="rounded border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
        >
          <option value="">Select</option>
          {options.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const labelText = typeof option === "string" ? option : option.label;
            return (
              <option key={value} value={value}>
                {labelText}
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  function BooleanField({ label, name }: { label: string; name: FieldName }) {
    return (
      <label className="flex items-start gap-3 rounded border border-ink/10 bg-skyglass px-3 py-2 text-sm text-ink/75">
        <input
          type="checkbox"
          checked={Boolean(form[name])}
          onChange={(event) => setField(name, event.target.checked as never)}
          className="mt-1 h-4 w-4 accent-pine"
        />
        <span>{label}</span>
      </label>
    );
  }

  function MultiCheckboxField({
    label,
    name,
    options,
    helper,
  }: {
    label: string;
    name: ArrayField;
    options: string[];
    helper?: string;
  }) {
    return (
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-ink">{label}</legend>
        {helper && <p className="text-sm text-ink/60">{helper}</p>}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-start gap-3 rounded border border-ink/10 bg-white px-3 py-2 text-sm text-ink/75"
            >
              <input
                type="checkbox"
                checked={form[name].includes(option)}
                onChange={() => toggleArrayValue(name, option)}
                className="mt-1 h-4 w-4 accent-pine"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  function CommaField({
    label,
    name,
    helper,
  }: {
    label: string;
    name: ArrayField;
    helper: string;
  }) {
    return (
      <label className="grid gap-2 text-sm font-medium text-ink">
        {label}
        <textarea
          rows={3}
          value={joinCommaList(form[name])}
          onChange={(event) => setField(name, splitCommaList(event.target.value) as never)}
          className="rounded border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
        />
        <span className="text-xs font-normal text-ink/55">{helper}</span>
      </label>
    );
  }

  function Section({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) {
    return (
      <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{description}</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{children}</div>
      </section>
    );
  }

  if (loading) {
    return (
      <DashboardShell
        title="Scholarship Readiness Profile"
        description="Loading your profile..."
      >
        <div className="rounded border border-ink/10 bg-white p-6 text-sm text-ink/70">
          Loading profile form...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Scholarship Readiness Profile"
      description="Complete your profile so Scholars Republic can recommend the best scholarships and show what documents you still need."
    >
      <form onSubmit={handleSubmit} className="grid gap-6">
        <section className="grid gap-4 rounded border border-ink/10 bg-white p-5 shadow-soft lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-ink/65">Profile completion</p>
            <p className="mt-2 text-4xl font-semibold text-ink">
              {completion.completion_percentage}%
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink/65">
              Scholarship readiness
            </p>
            <p className="mt-2 text-4xl font-semibold text-ink">
              {completion.scholarship_readiness_score}
              <span className="text-lg text-ink/55">/100</span>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink/65">Readiness level</p>
            <span className={`mt-3 inline-flex rounded px-3 py-2 text-sm font-semibold ${readinessTone}`}>
              {completion.readiness_level}
            </span>
          </div>
        </section>

        {message && (
          <p className="rounded border border-pine/20 bg-mint px-4 py-3 text-sm text-pine">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <Section
          title="Basic Information"
          description="Contact and Pakistan-first location details used for eligibility and support communication."
        >
          <TextField label="Phone number" name="phone_number" />
          <TextField label="WhatsApp number" name="whatsapp_number" />
          <TextField label="Date of birth" name="date_of_birth" type="date" />
          <TextField label="Nationality" name="nationality" />
          <TextField label="Current country" name="current_country" />
          <TextField label="City" name="city" />
          <SelectField label="Province" name="province" options={PROVINCES} />
          <TextField label="Domicile" name="domicile" />
        </Section>

        <Section
          title="Current Education"
          description="Your academic level and result information help check scholarship eligibility later."
        >
          <SelectField
            label="Current education level"
            name="current_education_level"
            options={EDUCATION_LEVELS}
          />
          <TextField label="Current institution" name="current_institution" />
          <TextField
            label="Current field of study"
            name="current_field_of_study"
            placeholder="Computer Science"
          />
          <TextField label="Graduation year" name="graduation_year" type="number" />
          <SelectField
            label="Result status"
            name="result_status"
            options={RESULT_STATUSES}
          />
          <SelectField
            label="Grading system"
            name="grading_system"
            options={GRADING_SYSTEMS}
          />
          <TextField label="CGPA" name="cgpa" type="number" />
          <TextField label="Percentage" name="percentage" type="number" />
          <TextField label="Division" name="division" placeholder="First Division" />
        </Section>

        <Section
          title="Target Study Plan"
          description="Tell us where and what you want to study. These fields will power recommendations in the next phases."
        >
          <SelectField
            label="Target degree level"
            name="target_degree_level"
            options={TARGET_DEGREE_LEVELS}
          />
          <TextField label="Preferred intake" name="preferred_intake" />
          <SelectField
            label="Study mode preference"
            name="study_mode_preference"
            options={STUDY_MODE_PREFERENCES}
          />
          <SelectField
            label="Funding preference"
            name="funding_preference"
            options={FUNDING_PREFERENCES}
          />
          <SelectField
            label="Application fee preference"
            name="application_fee_preference"
            options={APPLICATION_FEE_PREFERENCES}
          />
          <SelectField
            label="Language instruction preference"
            name="language_instruction_preference"
            options={LANGUAGE_INSTRUCTION_PREFERENCES}
          />
          <div className="lg:col-span-2">
            <MultiCheckboxField
              label="Target countries"
              name="target_countries"
              options={COUNTRIES}
            />
          </div>
          <div className="lg:col-span-2">
            <MultiCheckboxField
              label="Target fields"
              name="target_fields"
              options={COMMON_FIELDS_OF_STUDY}
            />
          </div>
        </Section>

        <Section
          title="Tests and Language"
          description="Language test information is optional now, but it strongly affects future scholarship readiness."
        >
          <BooleanField label="I have IELTS" name="has_ielts" />
          <TextField label="IELTS score" name="ielts_score" type="number" />
          <BooleanField label="I have TOEFL" name="has_toefl" />
          <TextField label="TOEFL score" name="toefl_score" type="number" />
          <BooleanField label="I have Duolingo" name="has_duolingo" />
          <TextField label="Duolingo score" name="duolingo_score" type="number" />
          <BooleanField label="I have PTE" name="has_pte" />
          <TextField label="PTE score" name="pte_score" type="number" />
          <BooleanField label="I have HSK" name="has_hsk" />
          <TextField label="HSK level" name="hsk_level" placeholder="HSK4" />
          <BooleanField label="I have GRE" name="has_gre" />
          <TextField label="GRE score" name="gre_score" type="number" />
          <BooleanField label="I have GMAT" name="has_gmat" />
          <TextField label="GMAT score" name="gmat_score" type="number" />
          <BooleanField
            label="I have an English proficiency certificate"
            name="english_proficiency_certificate"
          />
        </Section>

        <Section
          title="Documents"
          description="These documents are used to show missing requirements and readiness for fully funded applications."
        >
          <BooleanField label="CNIC ready" name="has_cnic" />
          <BooleanField label="Domicile ready" name="has_domicile" />
          <BooleanField label="Passport ready" name="has_passport" />
          <TextField
            label="Passport expiry date"
            name="passport_expiry_date"
            type="date"
          />
          <BooleanField label="Transcript ready" name="has_transcript" />
          <BooleanField label="Degree ready" name="has_degree" />
          <BooleanField label="CV ready" name="has_cv" />
          <BooleanField label="SOP ready" name="has_sop" />
          <BooleanField label="Study plan ready" name="has_study_plan" />
          <BooleanField
            label="Recommendation letters ready"
            name="has_recommendation_letters"
          />
          <TextField
            label="Recommendation letters count"
            name="recommendation_letters_count"
            type="number"
          />
          <BooleanField label="Research proposal ready" name="has_research_proposal" />
          <BooleanField label="Publications available" name="has_publications" />
          <BooleanField
            label="English proficiency letter ready"
            name="has_english_proficiency_letter"
          />
          <BooleanField label="Income certificate ready" name="has_income_certificate" />
          <BooleanField label="Bank statement ready" name="has_bank_statement" />
          <BooleanField label="Police clearance ready" name="has_police_clearance" />
          <BooleanField label="Medical certificate ready" name="has_medical_certificate" />
          <div className="lg:col-span-2">
            <MultiCheckboxField
              label="Additional documents"
              name="additional_documents"
              options={DOCUMENT_OPTIONS}
              helper="Select any extra documents or test reports you already have."
            />
          </div>
        </Section>

        <Section
          title="Research, Skills, and Career"
          description="Useful for MS, MPhil, PhD, and future internship or career modules."
        >
          <CommaField
            label="Research interests"
            name="research_interests"
            helper="Comma-separated, for example: machine learning, education policy."
          />
          <BooleanField
            label="I have research experience"
            name="has_research_experience"
          />
          <TextField label="Publications count" name="publications_count" type="number" />
          <BooleanField
            label="I have supervisor acceptance"
            name="has_supervisor_acceptance"
          />
          <TextField label="Supervisor country" name="supervisor_country" />
          <TextField label="Supervisor university" name="supervisor_university" />
          <BooleanField
            label="I have internship experience"
            name="has_internship_experience"
          />
          <TextField
            label="Work experience years"
            name="work_experience_years"
            type="number"
          />
          <TextField label="LinkedIn URL" name="linkedin_url" type="url" />
          <TextField label="Portfolio URL" name="portfolio_url" type="url" />
          <div className="lg:col-span-2">
            <MultiCheckboxField
              label="Skills"
              name="skills"
              options={COMMON_SKILLS}
            />
          </div>
        </Section>

        <Section
          title="Financial Preferences and Special Categories"
          description="Optional eligibility preferences. Select only the categories you want scholarships for."
        >
          <BooleanField
            label="I need need-based support"
            name="need_based_support_required"
          />
          <BooleanField
            label="I can pay application fees"
            name="can_pay_application_fee"
          />
          <TextField
            label="Maximum application fee in USD"
            name="max_application_fee_usd"
            type="number"
          />
          <BooleanField
            label="I can self-fund partially"
            name="can_self_fund_partial"
          />
          <div className="lg:col-span-2">
            <MultiCheckboxField
              label="Special scholarship categories"
              name="special_scholarship_categories"
              options={SPECIAL_SCHOLARSHIP_CATEGORIES}
            />
          </div>
        </Section>

        <Section
          title="Alerts and Consent"
          description="We use this information only to recommend scholarships and show your application readiness."
        >
          <BooleanField label="Email alerts enabled" name="email_alerts_enabled" />
          <BooleanField label="WhatsApp alerts enabled" name="whatsapp_alerts_enabled" />
          <BooleanField
            label="I agree that my profile data can be used for scholarship recommendations inside Scholars Republic"
            name="profile_data_consent"
          />
        </Section>

        <section className="sticky bottom-0 z-10 -mx-4 border-t border-ink/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink/65">
              You can save partial progress and return later.
            </p>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
              >
                Back to dashboard
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90 disabled:opacity-60"
              >
                <Save size={16} aria-hidden="true" />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </DashboardShell>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
