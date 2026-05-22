import type { OpportunityDetail } from "@/types/opportunity";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://scholarsrepublic.org").replace(
  /\/+$/,
  "",
);

const FALLBACK_DESCRIPTION =
  "View scholarship details, eligibility, documents, and official source on Scholars Republic.";

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getScholarshipTitle(opportunity?: OpportunityDetail | null) {
  const title = opportunity?.title?.trim();
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
    need_based: "Need Based",
    merit_based: "Merit Based",
  };

  return labels[normalized] ?? titleCase(normalized);
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

export function getCountryLabel(opportunity?: OpportunityDetail | null) {
  const country = opportunity?.country?.trim();
  return country || null;
}

export function getDegreeLabel(opportunity?: OpportunityDetail | null) {
  const degreeLevels = opportunity?.degree_levels?.filter(Boolean).map((degree) => degree.trim());

  if (!degreeLevels?.length) {
    return null;
  }

  const visibleDegrees = degreeLevels.slice(0, 2).join(", ");
  return degreeLevels.length > 2 ? `${visibleDegrees} + more` : visibleDegrees;
}

export function getProviderLabel(opportunity?: OpportunityDetail | null) {
  const provider =
    opportunity?.university_name?.trim() ||
    opportunity?.provider_name?.trim() ||
    opportunity?.company_name?.trim();

  return provider || null;
}

export function buildScholarshipSocialDescription(opportunity?: OpportunityDetail | null) {
  const fields = [
    getCountryLabel(opportunity),
    formatFundingType(opportunity?.funding_type),
    getDegreeLabel(opportunity),
  ];
  const deadline = formatDeadline(opportunity?.deadline);
  const summaryParts = fields.filter(Boolean);

  if (deadline) {
    summaryParts.push(`Deadline: ${deadline}`);
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
    imageAlt: rawTitle,
  };
}
