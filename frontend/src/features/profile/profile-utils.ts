import type { ProfileCompletion, StudentProfile, StudentProfilePayload } from "@/types/profile";
import {
  FieldName,
  nullableFields,
  numericFieldLimits,
  phoneFields,
  TODAY_DATE,
  urlFields,
} from "./profile-constants";

export function clampNumericField(name: FieldName, value: StudentProfilePayload[FieldName]) {
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

export function sanitizePhoneNumber(value: string) {
  const cleaned = value.replace(/[^0-9+()\-\s]/g, "");
  return cleaned.replace(/(?!^)\+/g, "");
}

export function normalizeUrlValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function sanitizeFieldValue(name: FieldName, value: StudentProfilePayload[FieldName]) {
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

export function constrainProfilePayload(payload: StudentProfilePayload): StudentProfilePayload {
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

export function withProfileDefaults(payload: StudentProfilePayload): StudentProfilePayload {
  return {
    ...payload,
    nationality: payload.nationality || "Pakistan",
    current_country: payload.current_country || "Pakistan",
    profile_source: payload.profile_source || "manual",
  };
}

export function normalizePayload(payload: StudentProfilePayload): StudentProfilePayload {
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

export function completionFromProfile(profile: StudentProfile | null): ProfileCompletion {
  return {
    completion_percentage: profile?.completion_percentage ?? 0,
    scholarship_readiness_score: profile?.scholarship_readiness_score ?? 0,
    readiness_level: profile?.readiness_level ?? "Low",
    missing_profile_fields: profile?.missing_profile_fields ?? [],
    missing_core_documents: profile?.missing_core_documents ?? [],
  };
}

export function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaList(value: string[]) {
  return value.join(", ");
}

export function getTextInputValue(value: StudentProfilePayload[FieldName]) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value ?? "";
}

export function getReadinessTone(level: string): "mint" | "saffron" | "danger" | "sky" {
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

export function isValidHttpUrl(value: string) {
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

export function hasFutureDate(value: string | null) {
  return Boolean(value && value > TODAY_DATE);
}

export function hasPastDate(value: string | null) {
  return Boolean(value && value < TODAY_DATE);
}

export function validatePhoneField(label: string, value: string) {
  if (!value.trim()) {
    return null;
  }

  const digitCount = value.replace(/\D/g, "").length;

  if (digitCount < 7 || digitCount > 15) {
    return `${label} should contain 7 to 15 digits.`;
  }

  return null;
}

export function validateProfilePayload(payload: StudentProfilePayload) {
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
