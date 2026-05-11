"use client";

import axios from "axios";
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Languages,
  Save,
  Target,
  UserRound,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import { createStudentProfile, getStudentProfile, patchStudentProfile } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  APPLICATION_FEE_PREFERENCES,
  COMMON_FIELDS_OF_STUDY,
  COMMON_SKILLS,
  COUNTRIES,
  COUNTRY_REGIONS,
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
import type { ProfileCompletion, StudentProfile, StudentProfilePayload } from "@/types/profile";

type ArrayField =
  | "target_fields"
  | "target_countries"
  | "additional_documents"
  | "research_interests"
  | "skills"
  | "special_scholarship_categories";

type FieldName = keyof StudentProfilePayload;
type SelectOption = string | { label: string; value: string };

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
  github_url: "",
  need_based_support_required: false,
  can_pay_application_fee: false,
  max_application_fee_usd: null,
  can_self_fund_partial: false,
  special_scholarship_categories: [],
  email_alerts_enabled: true,
  whatsapp_alerts_enabled: false,
  profile_data_consent: false,
  profile_source: "manual",
  ai_autofill_reviewed: false,
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

const numericFieldLimits: Partial<Record<FieldName, { min?: number; max?: number }>> = {
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

function clampNumericField(name: FieldName, value: StudentProfilePayload[FieldName]) {
  const limits = numericFieldLimits[name];

  if (
    !limits ||
    value === "" ||
    value === null ||
    typeof value === "boolean" ||
    Array.isArray(value)
  ) {
    return value;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  let next = parsed;

  if (typeof limits.min === "number" && next < limits.min) {
    next = limits.min;
  }

  if (typeof limits.max === "number" && next > limits.max) {
    next = limits.max;
  }

  return Number.isInteger(next) ? next : Number(next.toFixed(2));
}

function sanitizeFieldValue(name: FieldName, value: StudentProfilePayload[FieldName]) {
  if (phoneFields.includes(name) && typeof value === "string") {
    return sanitizePhoneNumber(value);
  }

  if (numericFieldLimits[name]) {
    return clampNumericField(name, value);
  }

  if (name === "date_of_birth" && typeof value === "string" && value > TODAY_DATE) {
    return TODAY_DATE;
  }

  if (name === "passport_expiry_date" && typeof value === "string" && value && value < TODAY_DATE) {
    return TODAY_DATE;
  }

  return value;
}

function constrainProfilePayload(payload: StudentProfilePayload): StudentProfilePayload {
  const next = { ...payload };

  for (const field of Object.keys(numericFieldLimits) as FieldName[]) {
    next[field] = clampNumericField(field, next[field]) as never;
  }

  next.phone_number = sanitizePhoneNumber(next.phone_number);
  next.whatsapp_number = sanitizePhoneNumber(next.whatsapp_number);

  if (next.date_of_birth && next.date_of_birth > TODAY_DATE) {
    next.date_of_birth = TODAY_DATE;
  }

  if (next.passport_expiry_date && next.passport_expiry_date < TODAY_DATE) {
    next.passport_expiry_date = TODAY_DATE;
  }

  return next;
}

function normalizePayload(payload: StudentProfilePayload): StudentProfilePayload {
  const normalized = constrainProfilePayload({
    ...payload,
    profile_source: payload.profile_source || "manual",
  });

  for (const field of nullableFields) {
    if (normalized[field] === "") {
      normalized[field] = null as never;
    }
  }

  for (const field of Object.keys(numericFieldLimits) as FieldName[]) {
    normalized[field] = clampNumericField(field, normalized[field]) as never;
  }

  for (const field of urlFields) {
    const value = normalized[field];

    if (typeof value === "string") {
      normalized[field] = normalizeUrlValue(value) as never;
    }
  }

  normalized.phone_number = sanitizePhoneNumber(normalized.phone_number);
  normalized.whatsapp_number = sanitizePhoneNumber(normalized.whatsapp_number);

  if (
    normalized.recommendation_letters_count === null ||
    normalized.recommendation_letters_count === ""
  ) {
    normalized.recommendation_letters_count = 0;
  }

  if (normalized.publications_count === null || normalized.publications_count === "") {
    normalized.publications_count = 0;
  }

  return constrainProfilePayload(normalized);
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

function getTextInputValue(value: StudentProfilePayload[FieldName]) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value ?? "";
}

function getReadinessTone(level: string): "mint" | "saffron" | "danger" | "sky" {
  if (level === "High") {
    return "mint";
  }

  if (level === "Medium") {
    return "saffron";
  }

  if (level === "Low") {
    return "danger";
  }

  return "sky";
}

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

const PREFERRED_INTAKE_OPTIONS = buildPreferredIntakeOptions();

const TODAY_DATE = new Date().toISOString().slice(0, 10);

const HSK_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"];

const phoneFields: FieldName[] = ["phone_number", "whatsapp_number"];

const urlFields: FieldName[] = ["linkedin_url", "portfolio_url", "github_url"];

function sanitizePhoneNumber(value: string) {
  const cleaned = value.replace(/[^0-9+()\-\s]/g, "");
  return cleaned.replace(/(?!^)\+/g, "");
}

function normalizeUrlValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isValidHttpUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasFutureDate(value: string | null) {
  return Boolean(value && value > TODAY_DATE);
}

function hasPastDate(value: string | null) {
  return Boolean(value && value < TODAY_DATE);
}

function validatePhoneField(label: string, value: string) {
  if (!value.trim()) {
    return null;
  }

  const digitCount = value.replace(/\D/g, "").length;

  if (digitCount < 7 || digitCount > 15) {
    return `${label} should contain 7 to 15 digits.`;
  }

  return null;
}

function validateProfilePayload(payload: StudentProfilePayload) {
  const phoneError = validatePhoneField("Phone number", payload.phone_number);
  if (phoneError) {
    return phoneError;
  }

  const whatsappError = validatePhoneField("WhatsApp number", payload.whatsapp_number);
  if (whatsappError) {
    return whatsappError;
  }

  if (hasFutureDate(payload.date_of_birth)) {
    return "Date of birth cannot be in the future.";
  }

  if (payload.has_passport && hasPastDate(payload.passport_expiry_date)) {
    return "Passport expiry date must be today or a future date.";
  }

  for (const field of urlFields) {
    const value = payload[field];

    if (typeof value === "string" && value && !isValidHttpUrl(value)) {
      return "Please enter valid profile links, for example https://linkedin.com/in/your-name.";
    }
  }

  return null;
}

function TextField({
  label,
  type = "text",
  helper,
  placeholder,
  value,
  min,
  max,
  step,
  inputMode,
  maxLength,
  onChange,
}: {
  label: string;
  type?: string;
  helper?: string;
  placeholder?: string;
  value: StudentProfilePayload[FieldName];
  min?: number | string;
  max?: number | string;
  step?: number | string;
  inputMode?: "text" | "tel" | "url" | "numeric" | "decimal";
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  function handleChange(rawValue: string) {
    if (type === "number") {
      if (rawValue === "") {
        onChange("");
        return;
      }

      if (!/^\d*\.?\d*$/.test(rawValue)) {
        return;
      }

      const parsed = Number(rawValue);

      if (Number.isNaN(parsed)) {
        return;
      }

      let next = parsed;
      const minValue = typeof min === "number" ? min : undefined;
      const maxValue = typeof max === "number" ? max : undefined;

      if (typeof minValue === "number" && next < minValue) {
        next = minValue;
      }

      if (typeof maxValue === "number" && next > maxValue) {
        next = maxValue;
      }

      onChange(String(next));
      return;
    }

    if (type === "tel") {
      onChange(sanitizePhoneNumber(rawValue));
      return;
    }

    onChange(rawValue);
  }

  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/80">
      {label}
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        maxLength={maxLength}
        value={getTextInputValue(value)}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
      />
      {helper ? <span className="text-xs leading-5 text-ink/45">{helper}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: StudentProfilePayload[FieldName];
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/80">
      {label}
      <select
        value={getTextInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
      >
        <option value="">Select</option>
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const labelText = typeof option === "string" ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {labelText}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-2xl border border-pine/10 bg-white px-3 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-mint/35">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-pine"
      />
      <span>{label}</span>
    </label>
  );
}

function MultiCheckboxField({
  label,
  values,
  options,
  helper,
  onToggle,
}: {
  label: string;
  values: string[];
  options: string[];
  helper?: string;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-medium text-ink/80">{label}</p>
        {helper ? <p className="mt-1 text-xs leading-5 text-ink/45">{helper}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option);

          return (
            <label
              key={option}
              className={
                checked
                  ? "flex items-center gap-2 rounded-2xl border border-pine bg-mint px-3 py-2 text-sm font-medium text-pine"
                  : "flex items-center gap-2 rounded-2xl border border-pine/10 bg-white px-3 py-2 text-sm font-medium text-ink/65 transition hover:bg-mint/35"
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="h-4 w-4 accent-pine"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CountryRegionPicker({
  label,
  values,
  countryRegions,
  onChange,
}: {
  label: string;
  values: string[];
  countryRegions: Record<string, readonly string[]>;
  onChange: (value: string[]) => void;
}) {
  const regionNames = Object.keys(countryRegions);
  const [region, setRegion] = useState(regionNames[0] ?? "");
  const [country, setCountry] = useState("");

  const countriesForRegion = region ? (countryRegions[region] ?? []) : [];

  function addCountry() {
    if (!country || values.includes(country)) {
      return;
    }

    onChange([...values, country]);
    setCountry("");
  }

  function removeCountry(countryName: string) {
    onChange(values.filter((item) => item !== countryName));
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-ink/80">{label}</p>

      <div className="grid gap-2 md:grid-cols-[12rem_1fr_auto]">
        <select
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setCountry("");
          }}
          className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
        >
          {regionNames.map((regionName) => (
            <option key={regionName} value={regionName}>
              {regionName}
            </option>
          ))}
        </select>

        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
        >
          <option value="">Select country</option>
          {countriesForRegion.map((countryName) => (
            <option key={countryName} value={countryName} disabled={values.includes(countryName)}>
              {countryName}
            </option>
          ))}
        </select>

        <Button type="button" onClick={addCountry} disabled={!country} variant="outline">
          Add
        </Button>
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((countryName) => (
            <button
              key={countryName}
              type="button"
              onClick={() => removeCountry(countryName)}
              className="rounded-2xl border border-pine/15 bg-mint px-3 py-1.5 text-sm font-medium text-pine transition hover:bg-saffron/20"
            >
              {countryName} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-ink/45">
          Select a region first, then add countries you are seriously considering.
        </p>
      )}
    </div>
  );
}

function CommaField({
  label,
  values,
  helper,
  onChange,
}: {
  label: string;
  values: string[];
  helper: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/80">
      {label}
      <input
        value={joinCommaList(values)}
        onChange={(event) => onChange(splitCommaList(event.target.value))}
        className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
        placeholder="Separate items with commas"
      />
      <span className="text-xs leading-5 text-ink/45">{helper}</span>
    </label>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-pine/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="text-base font-bold text-ink md:text-lg">{title}</h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
            </div>
          </div>
        </div>

        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

function ProfilePageContent() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);
  const [completion, setCompletion] = useState(completionFromProfile(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const pendingNavigationHrefRef = useRef<string | null>(null);
  const allowUnsafeNavigationRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getStudentProfile();

        if (mounted) {
          setForm(constrainProfilePayload({ ...EMPTY_PROFILE, ...profile }));
          setCompletion(completionFromProfile(profile));
          setProfileExists(true);
          setHasUnsavedChanges(false);
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

  function markUnsaved() {
    setHasUnsavedChanges(true);
    setMessage(null);
  }

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowUnsafeNavigationRef.current || !hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const href = anchor.href;

      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(href, window.location.href);

      if (
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search === nextUrl.search &&
        currentUrl.hash !== nextUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      pendingNavigationHrefRef.current = nextUrl.href;
      setPendingNavigationHref(nextUrl.href);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  function setField<K extends FieldName>(name: K, value: StudentProfilePayload[K]) {
    markUnsaved();

    const sanitizedValue = sanitizeFieldValue(name, value) as StudentProfilePayload[K];

    setForm((current) => ({
      ...current,
      [name]: sanitizedValue,
    }));
  }

  function toggleArrayValue(name: ArrayField, value: string) {
    markUnsaved();
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

  function textField(name: FieldName) {
    return {
      value: form[name],
      onChange: (value: string) => setField(name, value as never),
    };
  }

  function booleanField(name: FieldName) {
    return {
      checked: Boolean(form[name]),
      onChange: (value: boolean) => setField(name, value as never),
    };
  }

  function multiField(name: ArrayField) {
    return {
      values: form[name],
      onToggle: (value: string) => toggleArrayValue(name, value),
    };
  }

  function commaField(name: ArrayField) {
    return {
      values: form[name],
      onChange: (value: string[]) => setField(name, value as never),
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = normalizePayload(form);
      const profile = profileExists
        ? await patchStudentProfile(payload)
        : await createStudentProfile(payload);

      setForm(constrainProfilePayload({ ...EMPTY_PROFILE, ...profile }));
      setCompletion(completionFromProfile(profile));
      setProfileExists(true);
      setHasUnsavedChanges(false);

      const href = pendingNavigationHrefRef.current;
      pendingNavigationHrefRef.current = null;
      setPendingNavigationHref(null);

      if (href) {
        allowUnsafeNavigationRef.current = true;
        window.location.assign(href);
        return;
      }

      setMessage("Profile saved successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const preparedDocumentCount = useMemo(() => {
    const coreDocuments = [
      form.has_cnic,
      form.has_domicile,
      form.has_passport,
      form.has_transcript,
      form.has_degree,
      form.has_cv,
      form.has_sop,
      form.has_study_plan,
      form.has_recommendation_letters,
      form.has_research_proposal,
      form.has_publications,
      form.has_english_proficiency_letter,
      form.has_income_certificate,
      form.has_bank_statement,
      form.has_police_clearance,
      form.has_medical_certificate,
    ].filter(Boolean).length;

    return coreDocuments + form.additional_documents.length;
  }, [form]);

  const nextProfileSteps = useMemo(() => {
    return [
      ...completion.missing_profile_fields.slice(0, 3),
      ...completion.missing_core_documents.slice(0, 3),
    ].slice(0, 5);
  }, [completion]);

  if (loading) {
    return (
      <DashboardShell
        description="Loading your student profile."
        hideHeader
        title="Student Profile"
      >
        <Card>
          <CardContent className="p-6 text-sm text-ink/70">Loading profile form...</CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      description="Keep your profile updated so recommendations and match scores stay useful."
      hideHeader
      title="Student Profile"
    >
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-4 py-4 md:px-5">
            <div className="grid gap-4 xl:grid-cols-[1fr_20rem] xl:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
                  Student profile
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                  Improve your scholarship match.
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-ink/65 xl:whitespace-nowrap">
                  Fill the most important details first. You can save partial progress and return
                  later.
                </p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-white/90 p-4 shadow-sm">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                      Readiness
                    </p>
                    <p className="mt-1 text-3xl font-black text-pine">
                      {completion.scholarship_readiness_score}
                      <span className="text-base font-bold text-ink/45">/100</span>
                    </p>
                  </div>
                  <Badge tone={getReadinessTone(completion.readiness_level)}>
                    {completion.readiness_level}
                  </Badge>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-mint">
                  <div
                    className="h-full rounded-full bg-pine"
                    style={{ width: `${completion.completion_percentage}%` }}
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-ink/50">
                  {completion.completion_percentage}% profile complete
                </p>
              </div>
            </div>
          </div>

          <div className="grid divide-y divide-pine/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="px-4 py-3 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                Completion
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {completion.completion_percentage}%
              </p>
            </div>
            <div className="px-4 py-3 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Documents</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {preparedDocumentCount}
                <span className="text-sm font-medium text-ink/80/40">
                  /{DOCUMENT_OPTIONS.length}
                </span>
              </p>
            </div>
            <div className="px-4 py-3 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Targets</p>
              <p className="mt-1 text-2xl font-bold text-ink">{form.target_countries.length}</p>
            </div>
            <div className="px-4 py-3 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Fields</p>
              <p className="mt-1 text-2xl font-bold text-ink">{form.target_fields.length}</p>
            </div>
          </div>
        </section>

        {nextProfileSteps.length > 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Next details to complete</p>
                  <p className="mt-1 text-sm leading-6 text-ink/60">
                    These fields can improve your match score and recommendations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextProfileSteps.map((item) => (
                    <Badge key={item} tone="saffron">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-pine/10 bg-mint/40 p-4 text-sm font-medium text-pine">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <Section
          description="Basic contact and location details help match country-specific scholarships."
          icon={<UserRound size={20} aria-hidden="true" />}
          title="Personal details"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <TextField
              label="Phone number"
              type="tel"
              inputMode="tel"
              maxLength={20}
              {...textField("phone_number")}
            />
            <TextField
              label="WhatsApp number"
              type="tel"
              inputMode="tel"
              maxLength={20}
              {...textField("whatsapp_number")}
            />
            <TextField
              label="Date of birth"
              type="date"
              max={TODAY_DATE}
              {...textField("date_of_birth")}
            />
            <TextField label="Nationality" {...textField("nationality")} />
            <SelectField
              label="Current country"
              options={COUNTRIES}
              {...textField("current_country")}
            />
            <TextField label="City" {...textField("city")} />
            <SelectField label="Province" options={PROVINCES} {...textField("province")} />
            <TextField label="Domicile" {...textField("domicile")} />
          </div>
        </Section>

        <Section
          description="Education details are heavily used for scholarship eligibility and match scoring."
          icon={<GraduationCap size={20} aria-hidden="true" />}
          title="Education"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SelectField
              label="Current education level"
              options={EDUCATION_LEVELS}
              {...textField("current_education_level")}
            />
            <TextField label="Current institution" {...textField("current_institution")} />
            <TextField label="Current field of study" {...textField("current_field_of_study")} />
            <TextField
              label="Graduation year"
              type="number"
              min={1900}
              max={2100}
              {...textField("graduation_year")}
            />
            <SelectField
              label="Result status"
              options={RESULT_STATUSES}
              {...textField("result_status")}
            />
            <SelectField
              label="Grading system"
              options={GRADING_SYSTEMS}
              {...textField("grading_system")}
            />
            <TextField
              label="CGPA"
              type="number"
              min={0}
              max={5}
              step="0.01"
              {...textField("cgpa")}
            />
            <TextField
              label="Percentage"
              type="number"
              min={0}
              max={100}
              step="0.01"
              {...textField("percentage")}
            />
            <TextField label="Division" {...textField("division")} />
          </div>
        </Section>

        <Section
          description="Tell Scholars Republic what you want, so recommendations stay focused."
          icon={<Target size={20} aria-hidden="true" />}
          title="Scholarship targets"
        >
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SelectField
                label="Target degree level"
                options={TARGET_DEGREE_LEVELS}
                {...textField("target_degree_level")}
              />
              <SelectField
                label="Preferred intake"
                options={PREFERRED_INTAKE_OPTIONS}
                {...textField("preferred_intake")}
              />
              <SelectField
                label="Study mode"
                options={STUDY_MODE_PREFERENCES}
                {...textField("study_mode_preference")}
              />
              <SelectField
                label="Funding preference"
                options={FUNDING_PREFERENCES}
                {...textField("funding_preference")}
              />
              <SelectField
                label="Application fee preference"
                options={APPLICATION_FEE_PREFERENCES}
                {...textField("application_fee_preference")}
              />
              <SelectField
                label="Language preference"
                options={LANGUAGE_INSTRUCTION_PREFERENCES}
                {...textField("language_instruction_preference")}
              />
            </div>

            <CountryRegionPicker
              label="Target countries"
              values={form.target_countries}
              countryRegions={COUNTRY_REGIONS}
              onChange={(value) => setField("target_countries", value)}
            />

            <MultiCheckboxField
              label="Target fields"
              helper="Select the fields you want to study."
              options={COMMON_FIELDS_OF_STUDY}
              {...multiField("target_fields")}
            />
          </div>
        </Section>

        <Section
          description="Language tests and proficiency certificates can unlock more scholarship options."
          icon={<Languages size={20} aria-hidden="true" />}
          title="Language and tests"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <BooleanField label="I have IELTS" {...booleanField("has_ielts")} />
              <BooleanField label="I have TOEFL" {...booleanField("has_toefl")} />
              <BooleanField label="I have Duolingo" {...booleanField("has_duolingo")} />
              <BooleanField label="I have PTE" {...booleanField("has_pte")} />
              <BooleanField label="I have HSK" {...booleanField("has_hsk")} />
              <BooleanField label="I have GRE" {...booleanField("has_gre")} />
              <BooleanField label="I have GMAT" {...booleanField("has_gmat")} />
              <BooleanField
                label="I can provide English proficiency certificate"
                {...booleanField("english_proficiency_certificate")}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="IELTS score"
                type="number"
                min={0}
                max={9}
                step="0.5"
                {...textField("ielts_score")}
              />
              <TextField
                label="TOEFL score"
                type="number"
                min={0}
                max={120}
                {...textField("toefl_score")}
              />
              <TextField
                label="Duolingo score"
                type="number"
                min={0}
                max={160}
                {...textField("duolingo_score")}
              />
              <TextField
                label="PTE score"
                type="number"
                min={0}
                max={90}
                {...textField("pte_score")}
              />
              <SelectField label="HSK level" options={HSK_LEVELS} {...textField("hsk_level")} />
              <TextField
                label="GRE score"
                type="number"
                min={0}
                max={340}
                {...textField("gre_score")}
              />
              <TextField
                label="GMAT score"
                type="number"
                min={0}
                max={800}
                {...textField("gmat_score")}
              />
            </div>
          </div>
        </Section>

        <Section
          description="Documents decide whether you can apply quickly when deadlines are near."
          icon={<FileText size={20} aria-hidden="true" />}
          title="Documents"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <BooleanField label="CNIC" {...booleanField("has_cnic")} />
              <BooleanField label="Domicile" {...booleanField("has_domicile")} />
              <BooleanField label="Passport" {...booleanField("has_passport")} />
              <BooleanField label="Transcript" {...booleanField("has_transcript")} />
              <BooleanField label="Degree" {...booleanField("has_degree")} />
              <BooleanField label="CV" {...booleanField("has_cv")} />
              <BooleanField label="SOP" {...booleanField("has_sop")} />
              <BooleanField label="Study plan" {...booleanField("has_study_plan")} />
              <BooleanField
                label="Recommendation letters"
                {...booleanField("has_recommendation_letters")}
              />
              <BooleanField label="Research proposal" {...booleanField("has_research_proposal")} />
              <BooleanField label="Publications" {...booleanField("has_publications")} />
              <BooleanField
                label="English proficiency letter"
                {...booleanField("has_english_proficiency_letter")}
              />
              <BooleanField
                label="Income certificate"
                {...booleanField("has_income_certificate")}
              />
              <BooleanField label="Bank statement" {...booleanField("has_bank_statement")} />
              <BooleanField label="Police clearance" {...booleanField("has_police_clearance")} />
              <BooleanField
                label="Medical certificate"
                {...booleanField("has_medical_certificate")}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Passport expiry date"
                type="date"
                min={TODAY_DATE}
                {...textField("passport_expiry_date")}
              />
              <TextField
                label="Recommendation letters count"
                type="number"
                min={0}
                max={20}
                {...textField("recommendation_letters_count")}
              />
            </div>

            <CommaField
              label="Additional documents"
              helper="Add any extra documents you already have."
              {...commaField("additional_documents")}
            />
          </div>
        </Section>

        <Section
          description="Research, skills, work, and links help for graduate and research scholarships."
          icon={<BookOpen size={20} aria-hidden="true" />}
          title="Research and experience"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <BooleanField
                label="Research experience"
                {...booleanField("has_research_experience")}
              />
              <BooleanField
                label="Supervisor acceptance"
                {...booleanField("has_supervisor_acceptance")}
              />
              <BooleanField
                label="Internship experience"
                {...booleanField("has_internship_experience")}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Publications count"
                type="number"
                min={0}
                max={500}
                {...textField("publications_count")}
              />
              <TextField label="Supervisor country" {...textField("supervisor_country")} />
              <TextField label="Supervisor university" {...textField("supervisor_university")} />
              <TextField
                label="Work experience years"
                type="number"
                min={0}
                max={60}
                step="0.5"
                {...textField("work_experience_years")}
              />
              <TextField
                label="LinkedIn URL"
                type="text"
                inputMode="url"
                placeholder="linkedin.com/in/your-name"
                {...textField("linkedin_url")}
              />
              <TextField
                label="Portfolio URL"
                type="text"
                inputMode="url"
                placeholder="your-portfolio.com"
                {...textField("portfolio_url")}
              />
              <TextField
                label="GitHub URL"
                type="text"
                inputMode="url"
                placeholder="github.com/username"
                {...textField("github_url")}
              />
            </div>

            <CommaField
              label="Research interests"
              helper="Example: AI, public health, renewable energy"
              {...commaField("research_interests")}
            />

            <MultiCheckboxField
              label="Skills"
              helper="Select skills that strengthen your applications."
              options={COMMON_SKILLS}
              {...multiField("skills")}
            />
          </div>
        </Section>

        <Section
          description="Funding needs and alerts help us prioritize practical opportunities."
          icon={<BriefcaseBusiness size={20} aria-hidden="true" />}
          title="Funding and preferences"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <BooleanField
                label="I need need-based support"
                {...booleanField("need_based_support_required")}
              />
              <BooleanField
                label="I can pay application fee"
                {...booleanField("can_pay_application_fee")}
              />
              <BooleanField
                label="I can self-fund partially"
                {...booleanField("can_self_fund_partial")}
              />
            </div>

            <TextField
              label="Maximum application fee USD"
              type="number"
              min={0}
              max={10000}
              {...textField("max_application_fee_usd")}
            />

            <MultiCheckboxField
              label="Special scholarship categories"
              helper="Choose any category relevant to your applications."
              options={SPECIAL_SCHOLARSHIP_CATEGORIES}
              {...multiField("special_scholarship_categories")}
            />
          </div>
        </Section>

        <Section
          description="Control alerts and consent for using your profile to calculate scholarship matches."
          icon={<Bell size={20} aria-hidden="true" />}
          title="Alerts and consent"
        >
          <div className="grid gap-2 md:grid-cols-2">
            <BooleanField label="Email alerts enabled" {...booleanField("email_alerts_enabled")} />
            <BooleanField
              label="WhatsApp alerts enabled"
              {...booleanField("whatsapp_alerts_enabled")}
            />
            <BooleanField
              label="I agree to use this profile for scholarship matching"
              {...booleanField("profile_data_consent")}
            />
            <BooleanField label="AI autofill reviewed" {...booleanField("ai_autofill_reviewed")} />
          </div>
        </Section>

        {pendingNavigationHref && hasUnsavedChanges ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 px-4 py-5 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-[1.5rem] border border-pine/10 bg-white p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron/25 text-pine">
                  <Save size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink">You have unsaved changes</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">
                    Save your profile before leaving, or continue without saving these changes.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    pendingNavigationHrefRef.current = pendingNavigationHref;
                    formRef.current?.requestSubmit();
                  }}
                >
                  <Save size={16} aria-hidden="true" />
                  {saving ? "Saving..." : "Save and leave"}
                </Button>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const href = pendingNavigationHref;
                      allowUnsafeNavigationRef.current = true;
                      pendingNavigationHrefRef.current = null;
                      setHasUnsavedChanges(false);
                      setPendingNavigationHref(null);

                      if (href) {
                        window.location.assign(href);
                      }
                    }}
                  >
                    Leave without saving
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      pendingNavigationHrefRef.current = null;
                      setPendingNavigationHref(null);
                    }}
                  >
                    Keep editing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Card className="sticky bottom-3 z-10 border-pine/15 bg-white/95 shadow-lg backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-ink">Save your profile</p>
              <p className="text-sm leading-6 text-ink/60">
                {hasUnsavedChanges
                  ? "You have changes that are not saved yet."
                  : "Better profile data improves matches and recommendations."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/dashboard" variant="outline">
                Back to Dashboard
              </ButtonLink>
              <Button type="submit" disabled={saving}>
                <Save size={16} aria-hidden="true" />
                {saving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
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
