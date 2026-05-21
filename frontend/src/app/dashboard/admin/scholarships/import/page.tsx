"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileJson,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminNotice } from "@/components/admin/AdminUI";
import { DuplicateWarningPanel } from "@/components/admin/DuplicateWarningPanel";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  checkAdminOpportunityDuplicates,
  createAdminOpportunityDraft,
  getAdminOpportunityPathways,
  getCountries,
  getStudyFields,
  validateAdminOpportunityDraft,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AdminOpportunityDuplicateMatch,
  AdminOpportunityDuplicatePayload,
  OpportunityPathwayDetail,
  OpportunityDraft,
} from "@/types/opportunity";
import type { CountryOption, StudyFieldOption } from "@/types/reference";

type JsonPreview =
  | {
      valid: true;
      title: string;
      country: string;
      provider: string;
      degreeLevels: string[];
      fieldsOfStudy: string[];
      allStudyFields: boolean;
      funding: string;
      stipendAmount: string;
      stipendSummary: string;
      source: string;
      pathway: string;
      officialLink: string;
      sourceUrl: string;
      deadline: string;
      shortDescription: string;
      benefits: string;
      eligibility: string;
      howToApply: string;
      requiredDocuments: string[];
      scholarshipDetailUrl: string;
      warnings: string[];
      localWarnings: string[];
      missing: string[];
      checklist: ChecklistItem[];
      incompleteItems: string[];
    }
  | {
      valid: false;
      message: string;
    };

type ChecklistItem = {
  label: string;
  complete: boolean;
};

type ContextStatus = "idle" | "loading" | "loaded" | "error";

const PATHWAY_CONTEXT_LIMIT = 200;

const FUNDING_TYPE_VALUES = [
  "fully_funded",
  "partially_funded",
  "tuition_waiver",
  "stipend_only",
  "merit_based",
  "need_based",
  "self_funded",
];

const APPLICATION_TRACK_VALUES = [
  "direct",
  "embassy",
  "university",
  "professor",
  "regional",
  "portal",
  "other",
];

const DEGREE_LEVEL_EXAMPLES = [
  "Bachelor",
  "Master",
  "PhD",
  "Postdoctoral",
  "Diploma",
  "Exchange",
  "Research",
  "Short Course",
];

function extractJson(input: string): Record<string, unknown> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Paste the GPT JSON result first.");
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeFenceMatch ? codeFenceMatch[1].trim() : trimmed;

  if (candidate.startsWith("[")) {
    throw new Error("Paste one scholarship JSON object, not a bulk array.");
  }

  function parseCandidate(value: string) {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      throw new Error(
        'Paste one JSON object with the shape {"confidence": "...", "opportunity": {...}}.',
      );
    }

    return parsed;
  }

  try {
    return parseCandidate(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Could not find a JSON object in the pasted text.");
    }

    return parseCandidate(candidate.slice(firstBrace, lastBrace + 1));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getText(value: unknown) {
  if (typeof value === "number") {
    return String(value).trim();
  }

  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(value: unknown) {
  return value === true;
}

function humanize(value: string) {
  if (!value) {
    return "";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDraftPayload(parsed: Record<string, unknown>, createMissingReferences = true) {
  const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;
  const title = getText(opportunity.title) || "Imported scholarship draft";

  return {
    title,
    rawPayload: {
      ...(isRecord(parsed.opportunity) ? parsed : { opportunity }),
      create_missing_references: createMissingReferences,
    },
  };
}

function slugifyForScholarshipUrl(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

function buildScholarshipDetailUrl(title: string) {
  const slug = slugifyForScholarshipUrl(title);
  return slug
    ? `https://scholarsrepublic.org/scholarships/${slug}`
    : "https://scholarsrepublic.org/scholarships";
}

function getTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildDuplicatePayloadFromOpportunity(
  opportunity: Record<string, unknown>,
): AdminOpportunityDuplicatePayload {
  return {
    title: getText(opportunity.title),
    slug: getText(opportunity.slug),
    official_link: getText(opportunity.official_link),
    source_url: getText(opportunity.source_url),
    provider_name: getText(opportunity.provider_name),
    university_name: getText(opportunity.university_name),
    country: getText(opportunity.country),
    deadline: getText(opportunity.deadline),
    degree_levels: getTextList(opportunity.degree_levels),
    pathway_id: getNumber(opportunity.pathway_id),
    pathway: getText(opportunity.pathway),
  };
}

function summarizeText(value: string) {
  if (!value) {
    return "Not provided";
  }

  return value.length > 280 ? `${value.slice(0, 277).trim()}...` : value;
}

function buildCompletenessChecklist(opportunity: Record<string, unknown>): ChecklistItem[] {
  return [
    { label: "Title", complete: Boolean(getText(opportunity.title)) },
    { label: "Country", complete: Boolean(getText(opportunity.country)) },
    {
      label: "Official link or source URL",
      complete: Boolean(getText(opportunity.official_link) || getText(opportunity.source_url)),
    },
    { label: "Short description", complete: Boolean(getText(opportunity.short_description)) },
    { label: "Description", complete: Boolean(getText(opportunity.description)) },
    { label: "Eligibility", complete: Boolean(getText(opportunity.eligibility)) },
    { label: "Benefits", complete: Boolean(getText(opportunity.benefits)) },
    { label: "How to apply", complete: Boolean(getText(opportunity.how_to_apply)) },
    {
      label: "Deadline or rolling deadline",
      complete: Boolean(
        getText(opportunity.deadline) || getBoolean(opportunity.is_rolling_deadline),
      ),
    },
    {
      label: "Funding type or stipend",
      complete: Boolean(getText(opportunity.funding_type) || getText(opportunity.funding_amount)),
    },
    { label: "Degree levels", complete: getTextList(opportunity.degree_levels).length > 0 },
    {
      label: "Fields or all study fields",
      complete:
        getTextList(opportunity.fields_of_study).length > 0 ||
        getBoolean(opportunity.all_study_fields),
    },
  ];
}

function looksLikeAmountText(value: string) {
  if (!value) {
    return false;
  }

  return /(\$|€|£|USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD)\s?\d|\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD|€|£|\$)/i.test(
    value,
  );
}

function buildLocalJsonWarnings(opportunity: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const fundingAmount = getText(opportunity.funding_amount);
  const fundingCurrency = getText(opportunity.funding_currency);
  const stipendSummary = getText(opportunity.stipend_summary);

  if (!fundingAmount && stipendSummary && looksLikeAmountText(stipendSummary)) {
    warnings.push(
      "Stipend amount appears to be in stipend_summary. Move the numeric amount to funding_amount and currency to funding_currency.",
    );
  }

  if (fundingAmount && !fundingCurrency) {
    warnings.push("Funding amount is provided but funding_currency is missing.");
  }

  if (fundingCurrency && !fundingAmount) {
    warnings.push("Funding currency is provided but funding_amount is missing.");
  }

  if (stipendSummary.length > 120) {
    warnings.push(
      "stipend_summary should be a short note only. Put full funding explanation in benefits.",
    );
  }

  return warnings;
}

function formatPromptList(items: string[], fallback: string) {
  const cleaned = [...new Set(items.map((item) => item.trim()).filter(Boolean))];

  if (cleaned.length === 0) {
    return fallback;
  }

  return cleaned.map((item) => `- ${item}`).join("\n");
}

function getReferenceCreationWarnings(items: string[]) {
  return items.filter((item) => {
    const value = item.toLowerCase();
    return (
      value.includes("will be created") ||
      value.includes("new country") ||
      value.includes("new eligible country") ||
      value.includes("new study field") ||
      value.includes("new pathway")
    );
  });
}

function buildPathwayContext(pathways: OpportunityPathwayDetail[]) {
  const activePathways = pathways.filter((pathway) => pathway.is_active);

  if (activePathways.length === 0) {
    return "No pathway context loaded. Use pathway_id null and pathway blank unless the admin provides one.";
  }

  return [...activePathways]
    .sort((first, second) => {
      const firstCountry = first.country || "";
      const secondCountry = second.country || "";
      const countrySort = firstCountry.localeCompare(secondCountry);

      if (countrySort !== 0) {
        return countrySort;
      }

      const pathSort = (first.full_path || first.title).localeCompare(
        second.full_path || second.title,
      );

      if (pathSort !== 0) {
        return pathSort;
      }

      return first.display_order - second.display_order;
    })
    .slice(0, PATHWAY_CONTEXT_LIMIT)
    .map((pathway) => {
      const country = pathway.country || "No country";
      const fullPath = pathway.full_path || pathway.title;

      return `ID: ${pathway.id} | slug: ${pathway.slug} | full_path: ${fullPath} | type: ${pathway.pathway_type} | country: ${country}`;
    })
    .join("\n");
}

function buildCountryContext(countries: CountryOption[]) {
  if (countries.length === 0) {
    return "No country context loaded. Use exact source wording for country and add a warning if host or eligible countries are unclear.";
  }

  return [...countries]
    .sort((first, second) => {
      const orderSort = first.display_order - second.display_order;

      return orderSort || first.name.localeCompare(second.name);
    })
    .map((country) => country.name)
    .join(", ");
}

function buildStudyFieldContext(studyFields: StudyFieldOption[]) {
  if (studyFields.length === 0) {
    return "No study field context loaded. Use broad study field names only when clearly supported by the source.";
  }

  const fieldNames = [...studyFields]
    .sort((first, second) => {
      const categorySort = first.category.localeCompare(second.category);

      if (categorySort !== 0) {
        return categorySort;
      }

      const orderSort = first.display_order - second.display_order;

      return orderSort || first.name.localeCompare(second.name);
    })
    .map((field) => field.name);

  if (!fieldNames.some((fieldName) => fieldName.toLowerCase() === "all fields")) {
    fieldNames.push("All Fields");
  }

  return fieldNames.join(", ");
}

function ContextStatusItem({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: ContextStatus;
}) {
  const statusLabel =
    status === "loading"
      ? "Loading"
      : status === "loaded"
        ? `${count} loaded`
        : status === "error"
          ? "Unavailable"
          : "Pending";
  const dotClass =
    status === "loaded"
      ? "bg-pine"
      : status === "error"
        ? "bg-saffron"
        : "bg-ink/25 dark:bg-white/25";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#101214]">
      <span className="min-w-0 text-xs font-semibold text-ink/60 dark:text-white/55">{label}</span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink/70 dark:text-white/65">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        {statusLabel}
      </span>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#101214]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 text-ink/75 dark:text-white/68">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function PreviewList({
  label,
  items,
  emptyLabel = "Not provided",
  tone = "neutral",
}: {
  label: string;
  items: string[];
  emptyLabel?: string;
  tone?: "mint" | "saffron" | "sky" | "neutral" | "danger";
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#101214]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} tone={tone}>
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-semibold text-ink/45 dark:text-white/40">{emptyLabel}</p>
      )}
    </div>
  );
}

function CompletenessChecklist({ items }: { items: ChecklistItem[] }) {
  const completeCount = items.filter((item) => item.complete).length;

  return (
    <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink dark:text-white">Completeness checklist</p>
          <p className="text-xs font-semibold text-ink/50 dark:text-white/45">
            {completeCount} of {items.length} recommended fields detected before creating the review
            draft.
          </p>
        </div>
        <Badge tone={completeCount === items.length ? "mint" : "saffron"}>
          {completeCount === items.length ? "Looks complete" : "Needs review"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-xl border border-pine/10 bg-white px-2.5 py-2 text-xs font-semibold text-ink/65 dark:border-white/10 dark:bg-[#101214] dark:text-white/60"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${item.complete ? "bg-pine" : "bg-saffron"}`}
              aria-hidden="true"
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminScholarshipImportContent() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [validateImmediately, setValidateImmediately] = useState(true);
  const [createMissingReferences, setCreateMissingReferences] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFixPrompt, setCopiedFixPrompt] = useState(false);
  const [copiedJsonRepairPrompt, setCopiedJsonRepairPrompt] = useState(false);
  const [copiedFacebookPostPrompt, setCopiedFacebookPostPrompt] = useState(false);
  const [copiedFacebookImagePrompt, setCopiedFacebookImagePrompt] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<OpportunityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<AdminOpportunityDuplicateMatch[]>([]);
  const [pathways, setPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [studyFields, setStudyFields] = useState<StudyFieldOption[]>([]);
  const [pathwayContextStatus, setPathwayContextStatus] = useState<ContextStatus>("idle");
  const [countryContextStatus, setCountryContextStatus] = useState<ContextStatus>("idle");
  const [studyFieldContextStatus, setStudyFieldContextStatus] = useState<ContextStatus>("idle");
  const hasExactDuplicate = duplicateMatches.some((match) => match.confidence === "exact");
  const contextHasWarning =
    pathwayContextStatus === "error" ||
    countryContextStatus === "error" ||
    studyFieldContextStatus === "error";

  const pathwayContext = useMemo(() => buildPathwayContext(pathways), [pathways]);
  const countryContext = useMemo(() => buildCountryContext(countries), [countries]);
  const studyFieldContext = useMemo(() => buildStudyFieldContext(studyFields), [studyFields]);

  const gptPrompt = useMemo(
    () => `You are preparing ONE scholarship draft for Scholars Republic.

Use only facts from the official source URL/text below. Do not invent deadlines, benefits, eligibility, host countries, eligible countries, IELTS rules, funding, fees, documents, application steps, providers, universities, degree levels, study fields, or pathway data.

PLATFORM CONTEXT

Available Scholars Republic pathways:
${pathwayContext}

Allowed countries:
${countryContext}

Allowed study fields:
${studyFieldContext}

Allowed funding_type values:
${FUNDING_TYPE_VALUES.join(", ")}

Allowed application_track values:
${APPLICATION_TRACK_VALUES.join(", ")}

Degree level examples:
${DEGREE_LEVEL_EXAMPLES.join(", ")}

PATHWAY RULES
- Prefer the most specific matching pathway.
- Use pathway_id only if it appears in the available pathway list above.
- Also fill pathway with the selected pathway slug.
- If a child pathway matches, use the child pathway rather than only the parent.
- If no confident pathway matches, use pathway_id null and pathway empty.
- Never invent pathway IDs or pathway slugs.

COUNTRY RULES
- country means host country.
- eligible_countries means applicant eligibility.
- Use exact country names from the allowed country list when possible.
- If a country is clearly stated in the source but missing from allowed countries, still include it and set country_region when clear.
- If the source says "international students" but does not list countries, do not invent countries.
- Add a warning for unclear eligible countries.

STUDY FIELD RULES
- Use exact allowed study field names where possible.
- If source says all fields, all programmes, any discipline, or equivalent, set all_study_fields true and fields_of_study ["All Fields"].
- If only specific programmes are listed, map them to the closest allowed broader fields.
- If a study field is clearly stated in the source but missing from allowed study fields, still include it and add study_field_categories when clear.
- Do not invent narrow fields outside the platform list.

DEADLINE RULES
- Use YYYY-MM-DD only if the exact date is clear.
- If rolling/open deadline, set is_rolling_deadline true and deadline empty.
- If unclear, leave deadline empty and add a warning.

FUNDING RULES
- If only tuition is waived, use tuition_waiver.
- If stipend only, use stipend_only.
- If broad support is provided, summarize benefits.
- If exact amount is clear, fill funding_amount and funding_currency.
- If amount is unclear, use funding_amount null and funding_currency empty.

Stipend and amount rules:
- \`funding_amount\` must contain only the numeric scholarship/stipend amount.
- \`funding_currency\` must contain only the currency code or symbol, such as USD, EUR, GBP, CNY, PKR, TRY, or €.
- \`stipend_summary\` is optional and must be very short, for example "monthly stipend", "annual amount", or "amount varies".
- Do not put the amount only in \`stipend_summary\`.
- Do not put a long sentence or benefit explanation in \`stipend_summary\`.
- Put the full funding explanation in \`benefits\`, not in \`stipend_summary\`.
- If the source gives an exact amount, fill both \`funding_amount\` and \`funding_currency\`.
- If the source gives no exact amount, set:
  "funding_amount": null,
  "funding_currency": "",
  "stipend_summary": ""

REFERENCE DATA RULES
- create_missing_references should be true for admin imports.
- If country/pathway/study field is not available in platform context but is clearly present in official source, still include it.
- Add the needed metadata when the source supports it: country_region, study_field_categories, pathway_title, pathway_parent, pathway_country, pathway_type.
- Do not invent new reference values.
- Only include new country, study field, or pathway if clearly stated by the source.
- If unsure, leave the value blank and add a warning.

LANGUAGE AND TEST RULES
- Set ielts_required, toefl_required, duolingo_required, hsk_required only when clearly stated.
- Set english_proficiency_certificate_accepted only when clearly stated.
- Do not assume "no IELTS" unless the source clearly says IELTS is not required or alternatives are accepted.

APPLICATION FEE RULES
- Set application_fee_required true only if clearly stated.
- If fee is not mentioned, use false and add missing_information item "Application fee not clearly mentioned."

REQUIRED DOCUMENT RULES
- Include only documents explicitly mentioned.
- Do not add generic documents unless the source says so.

WRITING RULES
- short_description: 1-2 concise sentences.
- description: clear student-facing summary.
- benefits: complete but concise.
- eligibility: complete but concise.
- how_to_apply: clear steps.
- Keep language neutral and professional.

CONFIDENCE RULES
- Use high only when title, host country, source URL, deadline/rolling status, funding, eligibility, benefits, application steps, degree levels, and study fields are clear.
- Use medium if most major facts are clear.
- Use low if important facts are missing.

OUTPUT RULE
Return valid JSON only. No markdown. No commentary. No array. Only one scholarship.

Return this exact backend-compatible JSON shape:
{
  "confidence": "low | medium | high",
  "create_missing_references": true,
  "opportunity": {
    "title": "",
    "opportunity_type": "scholarship",
    "application_track": "direct",
    "provider_name": "",
    "university_name": "",
    "department_name": "",
    "lab_name": "",
    "professor_name": "",
    "pathway_id": null,
    "pathway": "",
    "pathway_title": "",
    "pathway_parent": "",
    "pathway_country": "",
    "pathway_type": "",
    "country": "",
    "country_region": "",
    "official_link": "",
    "source_url": "",
    "source_name": "",
    "short_description": "",
    "description": "",
    "benefits": "",
    "eligibility": "",
    "how_to_apply": "",
    "deadline": "",
    "is_rolling_deadline": false,
    "degree_levels": [],
    "fields_of_study": [],
    "study_field_categories": {},
    "all_study_fields": false,
    "eligible_countries": [],
    "funding_type": "",
    "funding_amount": null,
    "funding_currency": "",
    "stipend_summary": "",
    "application_fee_required": false,
    "ielts_required": false,
    "toefl_required": false,
    "duolingo_required": false,
    "hsk_required": false,
    "english_proficiency_certificate_accepted": false,
    "required_documents": [],
    "tags": [],
    "warnings": [],
    "missing_information": []
  }
}

Official source URL:
${sourceUrl || "PASTE_OFFICIAL_URL_HERE"}

Official source text:
${sourceText || "PASTE_OFFICIAL_SOURCE_TEXT_HERE"}`,
    [countryContext, pathwayContext, sourceText, sourceUrl, studyFieldContext],
  );
  const jsonPreview = useMemo<JsonPreview | null>(() => {
    if (!jsonText.trim()) {
      return null;
    }

    try {
      const parsed = extractJson(jsonText);
      const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;
      const officialLink = getText(opportunity.official_link);
      const sourceUrlValue = getText(opportunity.source_url);
      const deadlineValue = getText(opportunity.deadline);
      const allStudyFields = getBoolean(opportunity.all_study_fields);
      const title = getText(opportunity.title) || "Title not detected";
      const slug = getText(opportunity.slug);
      const fundingAmount = getText(opportunity.funding_amount);
      const fundingCurrency = getText(opportunity.funding_currency);
      const stipendSummary = getText(opportunity.stipend_summary);
      const checklist = buildCompletenessChecklist(opportunity);
      const localWarnings = buildLocalJsonWarnings(opportunity);
      const incompleteItems = checklist
        .filter((item) => !item.complete)
        .map((item) => item.label);

      return {
        valid: true,
        title,
        country: getText(opportunity.country) || "Country missing",
        provider:
          getText(opportunity.provider_name) ||
          getText(opportunity.university_name) ||
          "Provider/university missing",
        degreeLevels: getTextList(opportunity.degree_levels),
        fieldsOfStudy: getTextList(opportunity.fields_of_study),
        allStudyFields,
        funding: humanize(getText(opportunity.funding_type)) || "Funding type missing",
        stipendAmount:
          fundingAmount && fundingCurrency
            ? `${fundingCurrency} ${fundingAmount}`
            : fundingAmount || "Not listed",
        stipendSummary,
        source: officialLink || sourceUrlValue || "Source missing",
        pathway:
          typeof opportunity.pathway_id === "number"
            ? `Pathway ID ${opportunity.pathway_id}`
            : getText(opportunity.pathway),
        officialLink,
        sourceUrl: sourceUrlValue,
        deadline:
          deadlineValue ||
          (getBoolean(opportunity.is_rolling_deadline) ? "Rolling deadline" : "Deadline missing"),
        shortDescription: getText(opportunity.short_description),
        benefits: getText(opportunity.benefits),
        eligibility: getText(opportunity.eligibility),
        howToApply: getText(opportunity.how_to_apply),
        requiredDocuments: getTextList(opportunity.required_documents),
        scholarshipDetailUrl: slug
          ? `https://scholarsrepublic.org/scholarships/${slug}`
          : buildScholarshipDetailUrl(title),
        warnings: getTextList(opportunity.warnings),
        localWarnings,
        missing: getTextList(opportunity.missing_information),
        checklist,
        incompleteItems,
      };
    } catch (previewError) {
      return {
        valid: false,
        message: getErrorMessage(previewError) ?? "Could not parse the pasted JSON.",
      };
    }
  }, [jsonText]);

  const gptFixPrompt = useMemo(() => {
    if (!jsonText.trim() || !jsonPreview?.valid) {
      return "";
    }

    const backendValidationWarnings = createdDraft?.validation_warnings ?? [];
    const warnings = [
      ...jsonPreview.warnings,
      ...jsonPreview.localWarnings,
      ...backendValidationWarnings,
    ];
    const missing = [
      ...jsonPreview.missing,
      ...jsonPreview.incompleteItems.map((item) => `Incomplete: ${item}`),
    ];
    const warningList = formatPromptList(
      warnings,
      "No major warnings detected. Improve clarity only if the source supports it.",
    );
    const missingList = formatPromptList(
      missing,
      "No major missing or incomplete fields detected.",
    );

    return `You are fixing ONE Scholars Republic scholarship JSON draft.

I will provide:
1. The current JSON draft.
2. The warning messages produced by the Scholars Republic admin importer.
3. Missing or incomplete fields.
4. The official source URL/text.
5. Platform context.

Your job:
Return an improved version of the same JSON object.

Rules:
- Use only facts from the official source URL/text.
- Do not invent missing deadlines, benefits, eligibility, countries, IELTS rules, fees, documents, funding amounts, or application steps.
- Fix only what is supported by the source.
- If a warning cannot be fixed from the source, keep the value blank/null/false and keep or add a warning.
- Do not remove true warnings just to make the JSON look clean.
- Return valid JSON only.
- No markdown.
- No commentary.
- No array.
- Keep the same backend-compatible JSON shape.
- Do not change the scholarship into a different opportunity.
- Preserve correct existing values unless they conflict with warnings or the source.
- Preserve create_missing_references.
- Fix missing reference metadata when the source supports it, including country_region, study_field_categories, pathway_title, pathway_parent, pathway_country, and pathway_type.

Warnings to fix:
${warningList}

Missing or incomplete fields:
${missingList}

Platform context:
Available Scholars Republic pathways:
${pathwayContext}

Allowed countries:
${countryContext}

Allowed study fields:
${studyFieldContext}

Allowed funding_type values:
${FUNDING_TYPE_VALUES.join(", ")}

Allowed application_track values:
${APPLICATION_TRACK_VALUES.join(", ")}

Important field rules:
- pathway_id must be selected only from the available pathway list.
- pathway must match the selected pathway slug.
- country means host country.
- eligible_countries means applicant eligibility.
- funding_amount must be numeric amount only.
- funding_currency must be currency only, such as USD, EUR, GBP, CNY, PKR, TRY, or €.
- stipend_summary must be short only, such as "monthly stipend", "annual amount", or "amount varies".
- Full funding explanation belongs in benefits, not stipend_summary.
- If no exact amount is in the source, use funding_amount null and funding_currency "".
- If deadline is unclear, use deadline "" and add a warning.
- If application fee is not mentioned, use application_fee_required false and add missing_information.
- If IELTS/test requirement is unclear, do not assume.

Current JSON draft:
${jsonText}

Official source URL:
${sourceUrl || "Not provided"}

Official source text:
${sourceText || "Not provided"}

Return this exact JSON shape:
{
  "confidence": "low | medium | high",
  "create_missing_references": true,
  "opportunity": {
    "title": "",
    "opportunity_type": "scholarship",
    "application_track": "direct",
    "provider_name": "",
    "university_name": "",
    "department_name": "",
    "lab_name": "",
    "professor_name": "",
    "pathway_id": null,
    "pathway": "",
    "pathway_title": "",
    "pathway_parent": "",
    "pathway_country": "",
    "pathway_type": "",
    "country": "",
    "country_region": "",
    "official_link": "",
    "source_url": "",
    "source_name": "",
    "short_description": "",
    "description": "",
    "benefits": "",
    "eligibility": "",
    "how_to_apply": "",
    "deadline": "",
    "is_rolling_deadline": false,
    "degree_levels": [],
    "fields_of_study": [],
    "study_field_categories": {},
    "all_study_fields": false,
    "eligible_countries": [],
    "funding_type": "",
    "funding_amount": null,
    "funding_currency": "",
    "stipend_summary": "",
    "application_fee_required": false,
    "ielts_required": false,
    "toefl_required": false,
    "duolingo_required": false,
    "hsk_required": false,
    "english_proficiency_certificate_accepted": false,
    "required_documents": [],
    "tags": [],
    "warnings": [],
    "missing_information": []
  }
}`;
  }, [
    countryContext,
    createdDraft?.validation_warnings,
    jsonPreview,
    jsonText,
    pathwayContext,
    sourceText,
    sourceUrl,
    studyFieldContext,
  ]);

  const jsonRepairPrompt = useMemo(() => {
    if (!jsonText.trim() || jsonPreview?.valid !== false) {
      return "";
    }

    return `Fix the following text into one valid JSON object only.

Rules:
- Return JSON only.
- No markdown.
- No commentary.
- No code fence.
- Do not change facts.
- Do not add new facts.
- Preserve the Scholars Republic scholarship JSON shape if present.
- If multiple objects are present, keep only the scholarship draft object.

Text to repair:
${jsonText}`;
  }, [jsonPreview, jsonText]);

  const facebookPostPrompt = useMemo(() => {
    if (!jsonPreview?.valid) {
      return "";
    }

    const fieldText = jsonPreview.allStudyFields
      ? "All Fields"
      : jsonPreview.fieldsOfStudy.length
        ? jsonPreview.fieldsOfStudy.join(", ")
        : "Not listed";

    return `You are writing a Facebook post for Scholars Republic.

Write one professional, student-friendly Facebook post about this scholarship.

Use only the scholarship information below.
Do not invent benefits, eligibility, deadline, IELTS status, funding amount, countries, or documents.
If a detail is missing, do not mention it.
Do not overpromise.
Do not write fake urgency.
Do not claim “fully funded” unless funding type or benefits clearly support it.

Tone:
- clear
- motivational
- trustworthy
- suitable for Pakistani and international students
- not too long
- no exaggerated marketing

Post requirements:
- Start with a strong first line.
- Mention scholarship title.
- Mention host country if available.
- Mention university/provider if available.
- Mention degree level if available.
- Mention funding/stipend only if available.
- Mention deadline if available.
- Mention key eligible fields if available.
- Add a short call to action.
- Include the Scholars Republic detail-page link exactly as provided.
- Add 5 to 8 relevant hashtags.
- Keep the post readable on Facebook.
- Use emojis lightly, not in every line.
- Do not use markdown tables.
- Do not return JSON.

Scholarship data:
Title: ${jsonPreview.title}
Provider/University: ${jsonPreview.provider}
Country: ${jsonPreview.country}
Pathway: ${jsonPreview.pathway || "Not listed"}
Degree levels: ${jsonPreview.degreeLevels.length ? jsonPreview.degreeLevels.join(", ") : "Not listed"}
Fields of study: ${fieldText}
Funding type: ${jsonPreview.funding}
Stipend amount: ${jsonPreview.stipendAmount}
Stipend note: ${jsonPreview.stipendSummary || "Not listed"}
Deadline: ${jsonPreview.deadline}
Short description: ${jsonPreview.shortDescription || "Not listed"}
Benefits: ${jsonPreview.benefits || "Not listed"}
Eligibility: ${jsonPreview.eligibility || "Not listed"}
How to apply: ${jsonPreview.howToApply || "Not listed"}
Official source: ${jsonPreview.officialLink || jsonPreview.sourceUrl || sourceUrl || "Not listed"}

Scholars Republic detail page:
${jsonPreview.scholarshipDetailUrl}

Important:
Use this Scholars Republic link in the post:
${jsonPreview.scholarshipDetailUrl}

Return only the Facebook post text.`;
  }, [jsonPreview, sourceUrl]);

  const facebookImagePrompt = useMemo(() => {
    if (!jsonPreview?.valid) {
      return "";
    }

    const fieldText = jsonPreview.allStudyFields
      ? "All Fields"
      : jsonPreview.fieldsOfStudy.length
        ? jsonPreview.fieldsOfStudy.slice(0, 3).join(", ")
        : "Not listed";
    const fundingText =
      jsonPreview.stipendAmount !== "Not listed" ? jsonPreview.stipendAmount : jsonPreview.funding;

    return `Create a clean social media scholarship announcement image for Scholars Republic.

Image format:
- Primary size: 1080 x 1350 portrait for Facebook/Instagram feed.
- Also keep the layout safe for 1080 x 1080 square crop.
- Modern academic style.
- Clean white/cream background with deep green and gold accents.
- Use clear hierarchy and enough spacing.
- Do not clutter the design.
- No fake university logo.
- No fake official seal.
- No copyrighted logos unless provided by the user.
- Use simple academic icons only, such as graduation cap, calendar, globe, university building, document icon.

Brand text:
Scholars Republic

Main headline:
${jsonPreview.title}

Important information blocks:
- Country: ${jsonPreview.country}
- Provider: ${jsonPreview.provider}
- Degree: ${jsonPreview.degreeLevels.length ? jsonPreview.degreeLevels.join(", ") : "Not listed"}
- Funding: ${fundingText}
- Deadline: ${jsonPreview.deadline}
- Fields: ${fieldText}

Call to action:
Apply / Read details on ScholarsRepublic.org

Footer:
scholarsrepublic.org

Design structure:
Top: small Scholars Republic brand label.
Center: large scholarship title, maximum 2–3 lines.
Middle: 4 to 5 clean info cards with icons.
Bottom: call-to-action button style text and website URL.
Use strong contrast and readable typography.
Avoid tiny text.
Avoid long paragraphs.
Make it look like a professional scholarship announcement poster.

Important:
If any value is “Not listed”, do not put that value on the image.
Keep the poster clean and accurate.

Return only the image-generation prompt.`;
  }, [jsonPreview]);

  const referenceCreationWarnings = useMemo(() => {
    if (!jsonPreview?.valid) {
      return [];
    }

    return getReferenceCreationWarnings([
      ...jsonPreview.warnings,
      ...jsonPreview.localWarnings,
      ...(createdDraft?.validation_warnings ?? []),
    ]);
  }, [createdDraft?.validation_warnings, jsonPreview]);

  useEffect(() => {
    let mounted = true;

    setPathwayContextStatus("loading");
    setCountryContextStatus("loading");
    setStudyFieldContextStatus("loading");

    async function loadPathways() {
      try {
        const response = await getAdminOpportunityPathways({
          active: true,
          page_size: PATHWAY_CONTEXT_LIMIT,
        });

        if (mounted) {
          setPathways(response.results.filter((pathway) => pathway.is_active));
          setPathwayContextStatus("loaded");
        }
      } catch {
        if (mounted) {
          setPathways([]);
          setPathwayContextStatus("error");
        }
      }
    }

    async function loadCountries() {
      try {
        const response = await getCountries();

        if (mounted) {
          setCountries(response.results);
          setCountryContextStatus("loaded");
        }
      } catch {
        if (mounted) {
          setCountries([]);
          setCountryContextStatus("error");
        }
      }
    }

    async function loadStudyFields() {
      try {
        const response = await getStudyFields();

        if (mounted) {
          setStudyFields(response.results);
          setStudyFieldContextStatus("loaded");
        }
      } catch {
        if (mounted) {
          setStudyFields([]);
          setStudyFieldContextStatus("error");
        }
      }
    }

    void loadPathways();
    void loadCountries();
    void loadStudyFields();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkDuplicates() {
      if (!jsonText.trim()) {
        setDuplicateMatches([]);
        return;
      }

      try {
        const parsed = extractJson(jsonText);
        const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;
        const payload = buildDuplicatePayloadFromOpportunity(opportunity);

        if (!payload.title && !payload.official_link && !payload.source_url) {
          setDuplicateMatches([]);
          return;
        }

        const response = await checkAdminOpportunityDuplicates(payload);
        if (mounted) {
          setDuplicateMatches(response.matches);
        }
      } catch {
        if (mounted) {
          setDuplicateMatches([]);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void checkDuplicates();
    }, 400);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [jsonText]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(gptPrompt);
    setCopiedPrompt(true);

    window.setTimeout(() => {
      setCopiedPrompt(false);
    }, 1800);
  }

  async function copyFixPrompt() {
    if (!gptFixPrompt) {
      return;
    }

    await navigator.clipboard.writeText(gptFixPrompt);
    setCopiedFixPrompt(true);

    window.setTimeout(() => {
      setCopiedFixPrompt(false);
    }, 1800);
  }

  async function copyJsonRepairPrompt() {
    if (!jsonRepairPrompt) {
      return;
    }

    await navigator.clipboard.writeText(jsonRepairPrompt);
    setCopiedJsonRepairPrompt(true);

    window.setTimeout(() => {
      setCopiedJsonRepairPrompt(false);
    }, 1800);
  }

  async function copyFacebookPostPrompt() {
    if (!facebookPostPrompt) {
      return;
    }

    await navigator.clipboard.writeText(facebookPostPrompt);
    setCopiedFacebookPostPrompt(true);

    window.setTimeout(() => {
      setCopiedFacebookPostPrompt(false);
    }, 1800);
  }

  async function copyFacebookImagePrompt() {
    if (!facebookImagePrompt) {
      return;
    }

    await navigator.clipboard.writeText(facebookImagePrompt);
    setCopiedFacebookImagePrompt(true);

    window.setTimeout(() => {
      setCopiedFacebookImagePrompt(false);
    }, 1800);
  }

  async function handleCreateDraft() {
    setCreating(true);
    setError(null);
    setCreatedDraft(null);

    try {
      const parsed = extractJson(jsonText);
      const { title, rawPayload } = normalizeDraftPayload(parsed, createMissingReferences);
      const draft = await createAdminOpportunityDraft({
        title,
        raw_payload: rawPayload,
      });

      if (validateImmediately) {
        const validated = await validateAdminOpportunityDraft(draft.id);
        setCreatedDraft(validated);
      } else {
        setCreatedDraft(draft);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Import Scholarship"
      description="Use GPT output to create a structured scholarship draft for review."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="px-4 py-4 md:px-5">
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to admin workbench
              </Link>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Import scholarship
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Paste one official source, use GPT, then create a private review draft.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copyPrompt()} size="sm" variant="primary">
                  {copiedPrompt ? (
                    <CheckCircle2 size={15} aria-hidden="true" />
                  ) : (
                    <Clipboard size={15} aria-hidden="true" />
                  )}
                  {copiedPrompt ? "Prompt copied" : "Copy GPT prompt"}
                </Button>

                <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="outline">
                  Review drafts
                </ButtonLink>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                <div className="flex gap-2">
                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <p>
                    This importer accepts one scholarship JSON object at a time. GPT output becomes
                    a private review draft, not a published scholarship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        {createdDraft ? (
          <div className="rounded-2xl border border-pine/20 bg-pine/5 p-3 text-sm text-pine dark:border-pine/20 dark:bg-pine/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Review draft created: {createdDraft.title}</p>
                <p className="mt-1 text-xs font-semibold text-pine/75">
                  Status: {createdDraft.status} · Errors: {createdDraft.validation_errors.length} ·
                  Warnings: {createdDraft.validation_warnings.length}
                </p>
              </div>

              <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="secondary">
                Review draft
              </ButtonLink>
              <ButtonLink
                href={`/dashboard/admin/scholarships/drafts/${createdDraft.id}/edit`}
                size="sm"
                variant="outline"
              >
                Edit draft
              </ButtonLink>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-4">
            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <Search size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">1. Official source</h2>
                </div>

                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    Official source URL
                    <input
                      value={sourceUrl}
                      onChange={(event) => setSourceUrl(event.target.value)}
                      className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                      placeholder="https://official-scholarship-page..."
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    Official source text
                    <textarea
                      value={sourceText}
                      onChange={(event) => setSourceText(event.target.value)}
                      rows={8}
                      className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                      placeholder="Paste the official page content, eligibility, benefits, deadline, and how to apply..."
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <FileJson size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    2. Paste one GPT JSON result
                  </h2>
                </div>

                <label className="mt-3 grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Structured JSON
                  <textarea
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    rows={15}
                    className="font-mono rounded-xl border border-pine/15 bg-white px-3 py-2 text-xs leading-5 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                    placeholder='Paste GPT JSON here. It should include {"opportunity": {...}}'
                  />
                </label>

                {jsonPreview ? (
                  <div
                    className={`mt-3 rounded-2xl border p-3 text-sm leading-6 ${
                      jsonPreview.valid
                        ? "border-pine/10 bg-[#f7faf8] text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300"
                    }`}
                  >
                    {jsonPreview.valid ? (
                      <div className="grid gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="mint">Valid JSON</Badge>
                          <Badge tone="neutral">Single scholarship</Badge>
                          <Badge
                            tone={jsonPreview.source === "Source missing" ? "saffron" : "neutral"}
                          >
                            {jsonPreview.source === "Source missing"
                              ? "Source missing"
                              : "Source detected"}
                          </Badge>
                          <Badge
                            tone={jsonPreview.deadline === "Deadline missing" ? "saffron" : "sky"}
                          >
                            {jsonPreview.deadline}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pine">
                            Scholarship review preview
                          </p>
                          <h3 className="mt-1 text-lg font-black leading-snug text-ink dark:text-white">
                            {jsonPreview.title}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-ink/55 dark:text-white/50">
                            {jsonPreview.provider} · {jsonPreview.country}
                          </p>
                        </div>

                        <CompletenessChecklist items={jsonPreview.checklist} />

                        <DuplicateWarningPanel matches={duplicateMatches} />

                        <div className="grid gap-2 md:grid-cols-2">
                          <PreviewList
                            label="Degree levels"
                            items={jsonPreview.degreeLevels}
                            tone="neutral"
                          />
                          <PreviewList
                            label="Fields of study"
                            items={
                              jsonPreview.allStudyFields && jsonPreview.fieldsOfStudy.length === 0
                                ? ["All Fields"]
                                : jsonPreview.fieldsOfStudy
                            }
                            emptyLabel={jsonPreview.allStudyFields ? "All fields" : "Not provided"}
                            tone="sky"
                          />
                          <PreviewField
                            label="Funding"
                            value={jsonPreview.funding}
                          />
                          <PreviewField label="Stipend amount" value={jsonPreview.stipendAmount} />
                          {jsonPreview.stipendSummary ? (
                            <PreviewField label="Stipend note" value={jsonPreview.stipendSummary} />
                          ) : null}
                          <PreviewField label="Deadline" value={jsonPreview.deadline} />
                          <PreviewField label="Official link" value={jsonPreview.officialLink} />
                          <PreviewField label="Source URL" value={jsonPreview.sourceUrl} />
                          <PreviewField
                            label="Pathway"
                            value={jsonPreview.pathway || "Select manually before import"}
                          />
                        </div>

                        <div className="grid gap-2">
                          <PreviewField
                            label="Benefits summary"
                            value={summarizeText(jsonPreview.benefits)}
                          />
                          <PreviewField
                            label="Eligibility summary"
                            value={summarizeText(jsonPreview.eligibility)}
                          />
                          <PreviewField
                            label="How to apply summary"
                            value={summarizeText(jsonPreview.howToApply)}
                          />
                        </div>

                        <PreviewList
                          label="Required documents"
                          items={jsonPreview.requiredDocuments}
                          emptyLabel="No required documents detected"
                          tone="neutral"
                        />
                        <PreviewList
                          label="Warnings from GPT JSON"
                          items={jsonPreview.warnings}
                          emptyLabel="No warnings from GPT"
                          tone="saffron"
                        />
                        <PreviewList
                          label="Missing information"
                          items={jsonPreview.missing}
                          emptyLabel="No missing information listed"
                          tone="danger"
                        />
                        <PreviewList
                          label="Local importer warnings"
                          items={jsonPreview.localWarnings}
                          emptyLabel="No local importer warnings"
                          tone="saffron"
                        />
                        <PreviewList
                          label="Incomplete recommended fields"
                          items={jsonPreview.incompleteItems}
                          emptyLabel="No incomplete recommended fields"
                          tone="saffron"
                        />
                        {referenceCreationWarnings.length > 0 ? (
                          <PreviewList
                            label="Reference data to be created"
                            items={referenceCreationWarnings}
                            emptyLabel="No reference data will be created"
                            tone="sky"
                          />
                        ) : null}
                        {createdDraft?.validation_warnings.length ? (
                          <PreviewList
                            label="Backend validation warnings"
                            items={createdDraft.validation_warnings}
                            emptyLabel="No backend validation warnings"
                            tone="saffron"
                          />
                        ) : null}

                        <div
                          className={`rounded-2xl border px-3 py-3 ${
                            jsonPreview.warnings.length +
                              jsonPreview.localWarnings.length +
                              jsonPreview.missing.length +
                              jsonPreview.incompleteItems.length +
                              (createdDraft?.validation_warnings.length ?? 0) >
                            0
                              ? "border-saffron/30 bg-saffron/10 dark:border-saffron/25 dark:bg-saffron/10"
                              : "border-pine/15 bg-mint/30 dark:border-pine/20 dark:bg-pine/10"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-ink dark:text-white">
                                Fix JSON with GPT
                              </p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/50">
                                {jsonPreview.warnings.length +
                                  jsonPreview.localWarnings.length +
                                  jsonPreview.missing.length +
                                  jsonPreview.incompleteItems.length +
                                  (createdDraft?.validation_warnings.length ?? 0) >
                                0
                                  ? "Copy a repair prompt containing the current JSON, detected warnings, missing fields, and platform context. Paste it into GPT, then paste the corrected JSON back here."
                                  : "No major issues detected, but you can still ask GPT to polish the JSON while preserving facts."}
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => void copyFixPrompt()}
                              size="sm"
                              variant="outline"
                            >
                              {copiedFixPrompt ? (
                                <CheckCircle2 size={15} aria-hidden="true" />
                              ) : (
                                <Clipboard size={15} aria-hidden="true" />
                              )}
                              {copiedFixPrompt ? "Fix prompt copied" : "Copy GPT fix prompt"}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-pine/10 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#101214]">
                          <div className="flex flex-col gap-3">
                            <div>
                              <p className="text-sm font-bold text-ink dark:text-white">
                                Facebook marketing prompts
                              </p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/50">
                                Create a Facebook post and image design prompt from the parsed
                                scholarship JSON. Use these after you review the draft information.
                              </p>
                            </div>

                            <PreviewField
                              label="Expected Scholars Republic detail link"
                              value={jsonPreview.scholarshipDetailUrl}
                            />
                            <p className="-mt-1 text-xs font-medium leading-5 text-ink/55 dark:text-white/45">
                              Verify the final link after publishing, especially if the backend adds
                              a duplicate slug suffix.
                            </p>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                onClick={() => void copyFacebookPostPrompt()}
                                size="sm"
                                variant="outline"
                              >
                                {copiedFacebookPostPrompt ? (
                                  <CheckCircle2 size={15} aria-hidden="true" />
                                ) : (
                                  <Clipboard size={15} aria-hidden="true" />
                                )}
                                {copiedFacebookPostPrompt
                                  ? "Facebook post prompt copied"
                                  : "Copy Facebook post prompt"}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => void copyFacebookImagePrompt()}
                                size="sm"
                                variant="outline"
                              >
                                {copiedFacebookImagePrompt ? (
                                  <CheckCircle2 size={15} aria-hidden="true" />
                                ) : (
                                  <Clipboard size={15} aria-hidden="true" />
                                )}
                                {copiedFacebookImagePrompt
                                  ? "Image prompt copied"
                                  : "Copy Facebook image prompt"}
                              </Button>
                            </div>

                            <div className="grid gap-1 text-xs font-medium leading-5 text-ink/55 dark:text-white/45">
                              <p>The post prompt uses only parsed JSON information.</p>
                              <p>
                                The image prompt is for Canva/Figma/GPT image tools; it does not
                                generate or upload an image automatically.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <p className="font-semibold">{jsonPreview.message}</p>
                        <div className="rounded-2xl border border-red-200 bg-white px-3 py-3 dark:border-red-400/25 dark:bg-[#101214]">
                          <p className="text-sm font-bold text-ink dark:text-white">
                            Repair invalid JSON
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/50">
                            GPT returned text that could not be parsed as one JSON object. Copy
                            this prompt to ask GPT to return valid JSON only.
                          </p>
                          <Button
                            type="button"
                            onClick={() => void copyJsonRepairPrompt()}
                            size="sm"
                            variant="outline"
                            className="mt-3"
                          >
                            {copiedJsonRepairPrompt ? (
                              <CheckCircle2 size={15} aria-hidden="true" />
                            ) : (
                              <Clipboard size={15} aria-hidden="true" />
                            )}
                            {copiedJsonRepairPrompt
                              ? "JSON repair prompt copied"
                              : "Copy JSON repair prompt"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/70 dark:text-white/65">
                  <input
                    type="checkbox"
                    checked={validateImmediately}
                    onChange={(event) => setValidateImmediately(event.target.checked)}
                    className="h-4 w-4 rounded border-pine/20 text-pine focus:ring-pine"
                  />
                  Validate review draft immediately after creating
                </label>
                <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-ink/70 dark:text-white/65">
                  <input
                    type="checkbox"
                    checked={createMissingReferences}
                    onChange={(event) => setCreateMissingReferences(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-pine/20 text-pine focus:ring-pine"
                  />
                  <span>
                    Create missing reference data during import
                    <span className="mt-1 block text-xs font-medium leading-5 text-ink/55 dark:text-white/45">
                      If GPT JSON contains a new country, eligible country, study field, or pathway
                      that is not in Scholars Republic yet, the importer will create it and show a
                      warning. Turn this off if you want unknown references to be rejected or
                      selected manually.
                    </span>
                  </span>
                </label>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => void handleCreateDraft()}
                    disabled={creating || hasExactDuplicate}
                    size="sm"
                    variant="primary"
                  >
                    {creating ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles size={15} aria-hidden="true" />
                    )}
                    {hasExactDuplicate
                      ? "Existing scholarship found"
                      : creating
                        ? "Creating review draft..."
                        : "Create review draft"}
                  </Button>

                  <ButtonLink
                    href="/dashboard/admin/scholarships/drafts"
                    size="sm"
                    variant="outline"
                  >
                    Open review drafts
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="grid gap-4 content-start">
            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">GPT prompt preview</h2>
                </div>

                <div className="mt-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink dark:text-white">Prompt context</p>
                      <p className="mt-0.5 text-xs font-semibold text-ink/50 dark:text-white/45">
                        Live platform lists are included in the copied prompt when available.
                      </p>
                    </div>
                    {contextHasWarning ? <Badge tone="saffron">Partial context</Badge> : null}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <ContextStatusItem
                      label="Pathways loaded"
                      count={pathways.length}
                      status={pathwayContextStatus}
                    />
                    <ContextStatusItem
                      label="Countries loaded"
                      count={countries.length}
                      status={countryContextStatus}
                    />
                    <ContextStatusItem
                      label="Study fields loaded"
                      count={studyFields.length}
                      status={studyFieldContextStatus}
                    />
                  </div>

                  {contextHasWarning ? (
                    <p className="mt-3 rounded-xl border border-saffron/25 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-ink/65 dark:text-white/58">
                      Some context could not be loaded. The prompt still works and includes fallback
                      instructions for missing context.
                    </p>
                  ) : null}
                </div>

                <pre className="mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl border border-pine/10 bg-[#f7faf8] p-3 text-xs leading-5 text-ink/70 dark:border-white/10 dark:bg-[#101214] dark:text-white/65">
                  {gptPrompt}
                </pre>

                <button
                  type="button"
                  onClick={() => void copyPrompt()}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  {copiedPrompt ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : (
                    <Clipboard size={14} aria-hidden="true" />
                  )}
                  {copiedPrompt ? "Copied" : "Copy prompt"}
                </button>
              </CardContent>
            </Card>

            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-pine">
                  After creating
                </h2>

                <div className="mt-3 grid gap-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Review warnings and errors in the review drafts queue.
                  </p>
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Convert only clean review drafts to scholarship drafts, then review again before
                    publishing.
                  </p>
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Verify official source and deadline before marking as verified.
                  </p>
                </div>

                <a
                  href="/admin/opportunities/opportunitydraft/add/"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Django fallback
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function AdminScholarshipImportPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminScholarshipImportContent />
    </ProtectedRoute>
  );
}
