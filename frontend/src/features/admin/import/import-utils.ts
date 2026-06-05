import type { AdminOpportunityDuplicatePayload, OpportunityPathwayDetail } from "@/types/opportunity";
import type { CountryOption, StudyFieldOption } from "@/types/reference";

export type JsonPreview =
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

export type ChecklistItem = {
  label: string;
  complete: boolean;
};

export type ContextStatus = "idle" | "loading" | "loaded" | "error";

export const PATHWAY_CONTEXT_LIMIT = 200;

export const FUNDING_TYPE_VALUES = [
  "fully_funded",
  "partially_funded",
  "tuition_waiver",
  "stipend_only",
  "merit_based",
  "need_based",
  "self_funded",
];

export const APPLICATION_TRACK_VALUES = [
  "direct",
  "embassy",
  "university",
  "professor",
  "regional",
  "portal",
  "other",
];

export const DEGREE_LEVEL_EXAMPLES = [
  "Bachelor",
  "Master",
  "PhD",
  "Postdoctoral",
  "Diploma",
  "Exchange",
  "Research",
  "Short Course",
];

export function extractJson(input: string): Record<string, unknown> {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getText(value: unknown) {
  if (typeof value === "number") {
    return String(value).trim();
  }

  return typeof value === "string" ? value.trim() : "";
}

export function getBoolean(value: unknown) {
  return value === true;
}

export function humanize(value: string) {
  if (!value) {
    return "";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeDraftPayload(parsed: Record<string, unknown>, createMissingReferences = true) {
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

export function slugifyForScholarshipUrl(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

export function buildScholarshipDetailUrl(title: string) {
  const slug = slugifyForScholarshipUrl(title);
  return slug
    ? `https://scholarsrepublic.org/scholarships/${slug}`
    : "https://scholarsrepublic.org/scholarships";
}

export function getTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildDuplicatePayloadFromOpportunity(
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

export function summarizeText(value: string) {
  if (!value) {
    return "Not provided";
  }

  return value.length > 280 ? `${value.slice(0, 277).trim()}...` : value;
}

export function buildCompletenessChecklist(opportunity: Record<string, unknown>): ChecklistItem[] {
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

export function looksLikeAmountText(value: string) {
  if (!value) {
    return false;
  }

  return /(\$|€|£|USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD)\s?\d|\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD|€|£|\$)/i.test(
    value,
  );
}

export function buildLocalJsonWarnings(opportunity: Record<string, unknown>): string[] {
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

export function formatPromptList(items: string[], fallback: string) {
  const cleaned = [...new Set(items.map((item) => item.trim()).filter(Boolean))];

  if (cleaned.length === 0) {
    return fallback;
  }

  return cleaned.map((item) => `- ${item}`).join("\n");
}

export function getReferenceCreationWarnings(items: string[]) {
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

export function buildPathwayContext(pathways: OpportunityPathwayDetail[]) {
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

export function buildCountryContext(countries: CountryOption[]) {
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

export function buildStudyFieldContext(studyFields: StudyFieldOption[]) {
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
