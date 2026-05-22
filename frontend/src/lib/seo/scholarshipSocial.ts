import type { OpportunityDetail } from "@/types/opportunity";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://scholarsrepublic.org").replace(
  /\/+$/,
  "",
);

const FALLBACK_DESCRIPTION =
  "View scholarship details, eligibility, documents, and official source on Scholars Republic.";
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

type ScholarshipValue = Partial<OpportunityDetail> & Record<string, unknown>;

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function formatAmount(amount: string | number, currency?: string | null) {
  const rawAmount = String(amount).trim();

  if (!rawAmount) {
    return "";
  }

  const numericAmount = Number(rawAmount);
  const amountText = Number.isFinite(numericAmount)
    ? new Intl.NumberFormat("en", {
        maximumFractionDigits: 0,
      }).format(numericAmount)
    : rawAmount;
  const currencyText = cleanText(currency);
  const symbol = CURRENCY_SYMBOLS[currencyText.toUpperCase()];

  if (symbol) {
    return `${symbol}${amountText}`;
  }

  return currencyText ? `${currencyText} ${amountText}` : amountText;
}

export function getScholarshipTitle(opportunity?: ScholarshipValue | null) {
  const title = cleanText(opportunity?.title);
  return title || "Scholarship Opportunity";
}

export function truncateText(text: string | null | undefined, maxLength: number) {
  const normalized = text?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  const clean = lastSpace > maxLength * 0.65 ? truncated.slice(0, lastSpace) : truncated;

  return `${clean.trimEnd()}…`;
}

export function formatFundingType(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const labels: Record<string, string> = {
    fully_funded: "Fully Funded",
    partial_funded: "Partially Funded",
    partially_funded: "Partially Funded",
    tuition_waiver: "Tuition Waiver",
    stipend: "Stipend",
    stipend_only: "Stipend Only",
    need_based: "Need Based",
    merit_based: "Merit Based",
    other: "Other Funding",
  };

  return labels[normalized] ?? titleCase(normalized);
}

export function getFundingLabel(opportunity?: ScholarshipValue | null) {
  return formatFundingType(cleanText(opportunity?.funding_type));
}

export function formatDeadline(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getDeadlineLabel(opportunity?: ScholarshipValue | null) {
  return formatDeadline(cleanText(opportunity?.deadline));
}

export function getCountryLabel(opportunity?: ScholarshipValue | null) {
  const country = cleanText(opportunity?.country);

  if (country) {
    return country;
  }

  const countryRef = opportunity?.country_ref_detail;

  if (countryRef && typeof countryRef === "object" && "name" in countryRef) {
    const name = cleanText((countryRef as { name?: unknown }).name);
    return name || null;
  }

  const pathway = opportunity?.pathway_detail;

  if (pathway && typeof pathway === "object" && "country" in pathway) {
    const pathwayCountry = cleanText((pathway as { country?: unknown }).country);
    return pathwayCountry || null;
  }

  return null;
}

export function getDegreeLabel(opportunity?: ScholarshipValue | null) {
  const degreeLevels = Array.isArray(opportunity?.degree_levels)
    ? opportunity.degree_levels.map(cleanText).filter(Boolean)
    : [];

  if (!degreeLevels?.length) {
    return null;
  }

  const visibleDegrees = degreeLevels.slice(0, 2).join(", ");
  return degreeLevels.length > 2 ? `${visibleDegrees} + more` : visibleDegrees;
}

export function getProviderLabel(opportunity?: ScholarshipValue | null) {
  const provider =
    cleanText(opportunity?.university_name) ||
    cleanText(opportunity?.provider_name) ||
    cleanText(opportunity?.company_name) ||
    cleanText(opportunity?.source_name);

  return provider || null;
}

export function getStipendLabel(opportunity?: ScholarshipValue | null) {
  const stipendSummary = cleanText(opportunity?.stipend_summary);

  if (stipendSummary) {
    return truncateText(stipendSummary, 82);
  }

  if (opportunity?.funding_amount !== null && opportunity?.funding_amount !== undefined) {
    const amount = formatAmount(
      opportunity.funding_amount as string | number,
      cleanText(opportunity.funding_currency),
    );

    if (amount) {
      const funding = getFundingLabel(opportunity);
      return funding ? `${amount} ${funding.toLowerCase()}` : amount;
    }
  }

  return null;
}

export function getScholarshipCardFacts(opportunity?: ScholarshipValue | null) {
  return [
    { label: "Country", value: getCountryLabel(opportunity) },
    { label: "Funding", value: getFundingLabel(opportunity) },
    { label: "Degree", value: getDegreeLabel(opportunity) },
    { label: "Deadline", value: getDeadlineLabel(opportunity) },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
}

export function buildScholarshipSocialDescription(opportunity?: ScholarshipValue | null) {
  const fields = [
    getCountryLabel(opportunity),
    getFundingLabel(opportunity),
    getDegreeLabel(opportunity),
  ];
  const deadline = getDeadlineLabel(opportunity);
  const stipend = getStipendLabel(opportunity);
  const summaryParts = fields.filter(Boolean);

  if (deadline) {
    summaryParts.push(`Deadline: ${deadline}`);
  }

  if (stipend && summaryParts.join(" • ").length < 95) {
    summaryParts.push(stipend);
  }

  const prefix = summaryParts.length ? `${summaryParts.join(" • ")}. ` : "";
  return truncateText(`${prefix}${FALLBACK_DESCRIPTION}`, 180);
}

export function getScholarshipOgImageUrl(slug: string) {
  return `${SITE_URL}/scholarships/${encodeURIComponent(slug)}/opengraph-image`;
}

export function getScholarshipCanonicalUrl(slug: string) {
  return `${SITE_URL}/scholarships/${encodeURIComponent(slug)}`;
}

export function getScholarshipSocialMetadata(
  opportunity: OpportunityDetail | null | undefined,
  slug: string,
) {
  const rawTitle = getScholarshipTitle(opportunity);
  const title = `${rawTitle} | Scholars Republic`;

  return {
    title,
    description: buildScholarshipSocialDescription(opportunity),
    canonicalUrl: getScholarshipCanonicalUrl(slug),
    ogImageUrl: getScholarshipOgImageUrl(slug),
    imageAlt: opportunity?.title
      ? `Open Graph preview image for ${rawTitle}`
      : "Scholars Republic scholarship preview",
  };
}
