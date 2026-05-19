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
import {
  createStudentProfile,
  getCountries,
  getStudentProfile,
  getStudyFields,
  patchStudentProfile,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  APPLICATION_FEE_PREFERENCES,
  COMMON_FIELDS_OF_STUDY,
  COMMON_SKILLS,
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
type CountryRegionMap = Record<string, readonly string[]>;
type FieldCategoryMap = Record<string, readonly string[]>;

const FALLBACK_STUDY_FIELD_CATEGORIES: FieldCategoryMap = {
  Popular: COMMON_FIELDS_OF_STUDY,
};

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
  const normalized = constrainProfilePayload(
    withProfileDefaults({
      ...payload,
      profile_source: payload.profile_source || "manual",
    }),
  );

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

function withProfileDefaults(payload: StudentProfilePayload): StudentProfilePayload {
  return {
    ...payload,
    nationality: payload.nationality || "Pakistan",
    current_country: payload.current_country || "Pakistan",
    profile_source: payload.profile_source || "manual",
  };
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
    <label className="grid gap-1.5 text-sm font-medium text-ink/80 dark:text-white/75">
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
        className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
      />
      {helper ? <span className="text-xs leading-5 text-ink/45 dark:text-white/45">{helper}</span> : null}
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
    <label className="grid gap-1.5 text-sm font-medium text-ink/80 dark:text-white/75">
      {label}
      <select
        value={getTextInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
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
    <label className="flex items-start gap-2 rounded-xl border border-pine/10 bg-white px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-mint/35 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:bg-white/10">
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
        <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>
        {helper ? <p className="mt-1 text-xs leading-5 text-ink/45 dark:text-white/45">{helper}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option);

          return (
            <label
              key={option}
              className={
                checked
                  ? "flex items-center gap-2 rounded-xl border border-pine bg-mint px-3 py-2 text-sm font-medium text-pine dark:border-pine/30 dark:bg-pine/15"
                  : "flex items-center gap-2 rounded-xl border border-pine/10 bg-white px-3 py-2 text-sm font-medium text-ink/65 transition hover:bg-mint/35 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:bg-white/10"
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

function StudyFieldSelect({
  label,
  value,
  fieldCategories,
  onChange,
}: {
  label: string;
  value: string;
  fieldCategories: FieldCategoryMap;
  onChange: (value: string) => void;
}) {
  const categoryNames = Object.keys(fieldCategories);
  const [category, setCategory] = useState(categoryNames[0] ?? "");

  const fieldsForCategory = category ? (fieldCategories[category] ?? []) : [];
  const listId = `study-field-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <div className="grid min-w-0 gap-1.5 md:col-span-2 xl:col-span-2">
      <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>

      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(9rem,12rem)_minmax(14rem,1fr)]">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          aria-label={`${label} category`}
        >
          {categoryNames.map((categoryName) => (
            <option key={categoryName} value={categoryName}>
              {categoryName}
            </option>
          ))}
        </select>

        <input
          list={listId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Select or write your field"
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
          aria-label={label}
        />

        <datalist id={listId}>
          {fieldsForCategory.map((fieldName) => (
            <option key={fieldName} value={fieldName} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

function StudyFieldMultiPicker({
  label,
  values,
  fieldCategories,
  onChange,
}: {
  label: string;
  values: string[];
  fieldCategories: FieldCategoryMap;
  onChange: (value: string[]) => void;
}) {
  const categoryNames = Object.keys(fieldCategories);
  const [category, setCategory] = useState(categoryNames[0] ?? "");
  const [field, setField] = useState("");

  const fieldsForCategory = category ? (fieldCategories[category] ?? []) : [];
  const availableFields = fieldsForCategory.filter((fieldName) => !values.includes(fieldName));
  const listId = `target-field-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  function addField(fieldName: string) {
    const cleaned = fieldName.trim();

    if (!cleaned || values.includes(cleaned)) {
      return;
    }

    onChange([...values, cleaned]);
    setField("");
  }

  function removeField(fieldName: string) {
    onChange(values.filter((item) => item !== fieldName));
  }

  return (
    <div className="grid min-w-0 gap-1.5">
      <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>

      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(9rem,12rem)_minmax(18rem,1fr)_auto]">
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setField("");
          }}
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          aria-label={`${label} category`}
        >
          {categoryNames.map((categoryName) => (
            <option key={categoryName} value={categoryName}>
              {categoryName}
            </option>
          ))}
        </select>

        <input
          list={listId}
          value={field}
          onChange={(event) => setField(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addField(field);
            }
          }}
          placeholder="Select or write target field"
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
          aria-label={label}
        />

        <datalist id={listId}>
          {availableFields.map((fieldName) => (
            <option key={fieldName} value={fieldName} />
          ))}
        </datalist>

        <Button
          type="button"
          onClick={() => addField(field)}
          disabled={!field.trim()}
          variant="outline"
        >
          Add
        </Button>
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((fieldName) => (
            <button
              key={fieldName}
              type="button"
              onClick={() => removeField(fieldName)}
              className="rounded-full border border-pine/15 bg-mint px-2.5 py-1 text-xs font-semibold text-pine transition hover:bg-saffron/20 dark:border-pine/25 dark:bg-pine/10"
            >
              {fieldName} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-ink/45 dark:text-white/45">
          Choose a suggestion or type your own field, then add it.
        </p>
      )}
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
      <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>

      <div className="grid gap-2 md:grid-cols-[12rem_1fr_auto]">
        <select
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setCountry("");
          }}
          className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
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
          className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
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
        <p className="text-xs leading-5 text-ink/45 dark:text-white/45">
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
    <label className="grid gap-1.5 text-sm font-medium text-ink/80 dark:text-white/75">
      {label}
      <input
        value={joinCommaList(values)}
        onChange={(event) => onChange(splitCommaList(event.target.value))}
        className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
        placeholder="Separate items with commas"
      />
      <span className="text-xs leading-5 text-ink/45 dark:text-white/45">{helper}</span>
    </label>
  );
}

const PROFILE_SECTION_LINKS = [
  { label: "Personal", href: "#profile-personal" },
  { label: "Education", href: "#profile-education" },
  { label: "Targets", href: "#profile-targets" },
  { label: "Tests", href: "#profile-tests" },
  { label: "Documents", href: "#profile-documents" },
  { label: "Research", href: "#profile-research" },
  { label: "Funding", href: "#profile-funding" },
  { label: "Consent", href: "#profile-consent" },
];

function ProfileSectionNav() {
  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-[4.75rem] z-30 overflow-x-auto rounded-2xl border border-pine/10 bg-white/95 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#181b1d]/95"
    >
      <div className="flex min-w-max items-center gap-1">
        <span className="hidden rounded-xl px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-pine sm:inline-flex">
          Sections
        </span>

        {PROFILE_SECTION_LINKS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold text-ink/65 transition hover:bg-mint hover:text-pine dark:text-white/62 dark:hover:bg-pine/15 dark:hover:text-pine"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Section({
  id,
  title,
  description,
  icon,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Card className="dark:border-white/10 dark:bg-[#181b1d]">
        <CardContent className="p-3 md:p-4">
          <div className="mb-3 flex flex-col gap-2 border-b border-pine/10 pb-2 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
                {icon}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="text-base font-bold text-ink dark:text-white md:text-lg">
                    {title}
                  </h2>
                </div>
                <p className="mt-0.5 text-sm leading-5 text-ink/60 dark:text-white/58">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div>{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}

function ProfilePageContent() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);
  const [completion, setCompletion] = useState(completionFromProfile(null));
  const [countryRegions, setCountryRegions] = useState<CountryRegionMap>(
    COUNTRY_REGIONS as CountryRegionMap,
  );
  const [studyFieldCategories, setStudyFieldCategories] = useState<FieldCategoryMap>(
    FALLBACK_STUDY_FIELD_CATEGORIES,
  );
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
          setForm(constrainProfilePayload(withProfileDefaults({ ...EMPTY_PROFILE, ...profile })));
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

  useEffect(() => {
    let mounted = true;

    async function loadCountries() {
      try {
        const response = await getCountries();

        if (mounted && Object.keys(response.regions).length > 0) {
          setCountryRegions(response.regions);
        }
      } catch {
        // Keep frontend fallback countries if reference API is unavailable.
      }
    }

    void loadCountries();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadStudyFields() {
      try {
        const response = await getStudyFields();

        if (mounted && Object.keys(response.categories).length > 0) {
          setStudyFieldCategories(response.categories);
        }
      } catch {
        // Keep frontend fallback study fields if reference API is unavailable.
      }
    }

    void loadStudyFields();

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
      const validationError = validateProfilePayload(payload);

      if (validationError) {
        setError(validationError);
        setSaving(false);
        return;
      }

      const profile = profileExists
        ? await patchStudentProfile(payload)
        : await createStudentProfile(payload);

      setForm(constrainProfilePayload(withProfileDefaults({ ...EMPTY_PROFILE, ...profile })));
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

  const countryOptions = useMemo(() => {
    return Array.from(new Set(Object.values(countryRegions).flat())).sort();
  }, [countryRegions]);
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
        <Card className="dark:border-white/10 dark:bg-[#181b1d]">
          <CardContent className="p-6 text-sm text-ink/70 dark:text-white/60">Loading profile form...</CardContent>
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
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-3 py-3 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_36rem] xl:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
                  Student profile
                </p>
                <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
                  Improve your scholarship match.
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                  Fill the most important details first. You can save partial progress and return
                  later.
                </p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-white/90 p-2.5 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5">
                <div className="grid gap-1.5 lg:grid-cols-[10rem_1fr] lg:items-stretch">
                  <div className="rounded-xl border border-pine/10 bg-mint/45 px-2.5 py-2 dark:border-white/10 dark:bg-pine/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                        Readiness
                      </p>
                      <Badge tone={getReadinessTone(completion.readiness_level)}>
                        {completion.readiness_level}
                      </Badge>
                    </div>

                    <div className="mt-1 flex items-end justify-between gap-2">
                      <p className="text-2xl font-black leading-none text-pine">
                        {completion.scholarship_readiness_score}
                        <span className="text-sm font-bold text-ink/45 dark:text-white/45">/100</span>
                      </p>
                      <span className="text-[11px] font-semibold text-ink/50 dark:text-white/45">
                        {completion.completion_percentage}%
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-pine"
                        style={{ width: `${completion.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                        Complete
                      </p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                        {completion.completion_percentage}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                        Docs
                      </p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                        {preparedDocumentCount}
                        <span className="text-[11px] font-bold text-ink/40 dark:text-white/40">
                          /{DOCUMENT_OPTIONS.length}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                        Targets
                      </p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                        {form.target_countries.length}
                      </p>
                    </div>

                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                        Fields
                      </p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                        {form.target_fields.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>

        <ProfileSectionNav />

        {nextProfileSteps.length > 0 ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">Next details to complete</p>
                  <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/58">
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
          <div className="rounded-2xl border border-pine/10 bg-mint/40 p-4 text-sm font-medium text-pine dark:border-pine/20 dark:bg-pine/10">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <Section
          id="profile-personal"
          description="Basic contact and location details help match country-specific scholarships."
          icon={<UserRound size={20} aria-hidden="true" />}
          title="Personal details"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <SelectField
              label="Nationality"
              options={countryOptions}
              {...textField("nationality")}
            />
            <SelectField
              label="Current country"
              options={countryOptions}
              {...textField("current_country")}
            />
            <TextField label="City" {...textField("city")} />
            <SelectField label="Province" options={PROVINCES} {...textField("province")} />
            <TextField label="Domicile" {...textField("domicile")} />
          </div>
        </Section>

        <Section
          id="profile-education"
          description="Education details are heavily used for scholarship eligibility and match scoring."
          icon={<GraduationCap size={20} aria-hidden="true" />}
          title="Education"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              label="Current education level"
              options={EDUCATION_LEVELS}
              {...textField("current_education_level")}
            />
            <TextField label="Current institution" {...textField("current_institution")} />
            <StudyFieldSelect
              label="Current field of study"
              value={String(form.current_field_of_study || "")}
              fieldCategories={studyFieldCategories}
              onChange={(value) => setField("current_field_of_study", value)}
            />
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
          id="profile-targets"
          description="Tell Scholars Republic what you want, so recommendations stay focused."
          icon={<Target size={20} aria-hidden="true" />}
          title="Scholarship targets"
        >
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              countryRegions={countryRegions}
              onChange={(value) => setField("target_countries", value)}
            />

            <StudyFieldMultiPicker
              label="Target fields"
              values={form.target_fields}
              fieldCategories={studyFieldCategories}
              onChange={(value) => setField("target_fields", value)}
            />
          </div>
        </Section>

        <Section
          id="profile-tests"
          description="Language tests and proficiency certificates can unlock more scholarship options."
          icon={<Languages size={20} aria-hidden="true" />}
          title="Language and tests"
        >
          <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div className="grid gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-pine">
                Tests and certificates
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                <BooleanField label="IELTS" {...booleanField("has_ielts")} />
                <BooleanField label="TOEFL" {...booleanField("has_toefl")} />
                <BooleanField label="Duolingo" {...booleanField("has_duolingo")} />
                <BooleanField label="PTE" {...booleanField("has_pte")} />
                <BooleanField label="HSK" {...booleanField("has_hsk")} />
                <BooleanField label="GRE" {...booleanField("has_gre")} />
                <BooleanField label="GMAT" {...booleanField("has_gmat")} />
                <BooleanField
                  label="English proficiency certificate"
                  {...booleanField("english_proficiency_certificate")}
                />
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-pine">
                Scores
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <TextField
                  label="IELTS"
                  type="number"
                  min={0}
                  max={9}
                  step="0.5"
                  {...textField("ielts_score")}
                />
                <TextField
                  label="TOEFL"
                  type="number"
                  min={0}
                  max={120}
                  {...textField("toefl_score")}
                />
                <TextField
                  label="Duolingo"
                  type="number"
                  min={0}
                  max={160}
                  {...textField("duolingo_score")}
                />
                <TextField
                  label="PTE"
                  type="number"
                  min={0}
                  max={90}
                  {...textField("pte_score")}
                />
                <SelectField label="HSK level" options={HSK_LEVELS} {...textField("hsk_level")} />
                <TextField
                  label="GRE"
                  type="number"
                  min={0}
                  max={340}
                  {...textField("gre_score")}
                />
                <TextField
                  label="GMAT"
                  type="number"
                  min={0}
                  max={800}
                  {...textField("gmat_score")}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="profile-documents"
          description="Documents decide whether you can apply quickly when deadlines are near."
          icon={<FileText size={20} aria-hidden="true" />}
          title="Documents"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
          id="profile-research"
          description="Research, skills, work, and links help for graduate and research scholarships."
          icon={<BookOpen size={20} aria-hidden="true" />}
          title="Research and experience"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          id="profile-funding"
          description="Funding needs and alerts help us prioritize practical opportunities."
          icon={<BriefcaseBusiness size={20} aria-hidden="true" />}
          title="Funding and preferences"
        >
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
          id="profile-consent"
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 px-4 py-5 backdrop-blur-sm dark:bg-black/55 sm:items-center">
            <div className="w-full max-w-md rounded-[1.5rem] border border-pine/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#181b1d]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron/25 text-pine">
                  <Save size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink dark:text-white">You have unsaved changes</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
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

        <Card className="sticky bottom-3 z-10 border-pine/15 bg-white/95 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#181b1d]/95">
          <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-ink dark:text-white">Save your profile</p>
              <p className="text-sm leading-6 text-ink/60 dark:text-white/58">
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
