import {
  buildScholarshipSocialDescription,
  getCountryLabel,
  getDeadlineLabel,
  getDegreeLabel,
  getFundingLabel,
  getProviderLabel,
  getScholarshipCanonicalUrl,
  getScholarshipOgImageUrl,
  getScholarshipTitle,
  getStipendLabel,
} from "@/lib/seo/scholarshipSocial";
import type { OpportunityDetail } from "@/types/opportunity";

type ShareSource = "facebook" | "whatsapp" | "linkedin" | "telegram" | "x" | "copy";

export type ScholarshipShareFacts = {
  title: string;
  country: string | null;
  provider: string | null;
  degree: string | null;
  funding: string | null;
  deadline: string | null;
  stipend: string | null;
  fields: string[];
  canonicalUrl: string;
};

const UTM_MEDIUM_BY_SOURCE: Record<ShareSource, "social" | "share"> = {
  facebook: "social",
  whatsapp: "social",
  linkedin: "social",
  telegram: "social",
  x: "social",
  copy: "share",
};

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function safeHashtag(value: string | null | undefined) {
  const normalized = cleanText(value).replace(/[^a-zA-Z0-9]/g, "");
  return normalized.length >= 2 && normalized.length <= 32 ? `#${normalized}` : null;
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line && line.trim())).join("\n");
}

export function buildScholarshipCanonicalUrl(slug: string) {
  return getScholarshipCanonicalUrl(slug);
}

export function withUtm(url: string, source: ShareSource) {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("utm_source", source);
    nextUrl.searchParams.set("utm_medium", UTM_MEDIUM_BY_SOURCE[source]);
    nextUrl.searchParams.set("utm_campaign", "scholarship_share");
    return nextUrl.toString();
  } catch {
    return url;
  }
}

export function buildScholarshipShareFacts(
  opportunity: OpportunityDetail,
  slug: string,
): ScholarshipShareFacts {
  return {
    title: getScholarshipTitle(opportunity),
    country: getCountryLabel(opportunity),
    provider: getProviderLabel(opportunity),
    degree: getDegreeLabel(opportunity),
    funding: getFundingLabel(opportunity),
    deadline: getDeadlineLabel(opportunity),
    stipend: getStipendLabel(opportunity),
    fields: opportunity.fields_of_study.map(cleanText).filter(Boolean).slice(0, 4),
    canonicalUrl: buildScholarshipCanonicalUrl(slug),
  };
}

function buildHashtags(facts: ScholarshipShareFacts) {
  const hashtags = ["#Scholarships", "#ScholarsRepublic"];
  const country = safeHashtag(facts.country);
  const degree = safeHashtag(facts.degree?.replace(/\+ more$/i, ""));

  if (country) {
    hashtags.push(country);
  }

  if (degree) {
    hashtags.push(degree);
  }

  if (facts.funding?.toLowerCase() === "fully funded") {
    hashtags.push("#FullyFunded");
  }

  return Array.from(new Set(hashtags)).join(" ");
}

export function buildFacebookPost(opportunity: OpportunityDetail, slug: string) {
  const facts = buildScholarshipShareFacts(opportunity, slug);
  const detailsUrl = withUtm(facts.canonicalUrl, "facebook");
  const factLines = [
    facts.country ? `📍 Country: ${facts.country}` : null,
    facts.provider ? `🏛 Provider: ${facts.provider}` : null,
    facts.degree ? `🎯 Degree: ${facts.degree}` : null,
    facts.funding ? `💰 Funding: ${facts.funding}` : null,
    facts.stipend ? `💵 Stipend: ${facts.stipend}` : null,
    facts.deadline ? `📅 Deadline: ${facts.deadline}` : null,
    facts.fields.length ? `📚 Fields: ${facts.fields.join(", ")}` : null,
  ];

  return compactLines([
    `🎓 ${facts.title}`,
    "",
    compactLines(factLines),
    "",
    "Read details and apply through the official source:",
    detailsUrl,
    "",
    buildHashtags(facts),
  ]);
}

export function buildWhatsAppMessage(opportunity: OpportunityDetail, slug: string) {
  const facts = buildScholarshipShareFacts(opportunity, slug);
  const detailsUrl = withUtm(facts.canonicalUrl, "whatsapp");

  return compactLines([
    `🎓 ${facts.title}`,
    "",
    facts.country ? `Country: ${facts.country}` : null,
    facts.degree ? `Degree: ${facts.degree}` : null,
    facts.funding ? `Funding: ${facts.funding}` : null,
    facts.deadline ? `Deadline: ${facts.deadline}` : null,
    "",
    "Details:",
    detailsUrl,
  ]);
}

export function buildLinkedInPost(opportunity: OpportunityDetail, slug: string) {
  const facts = buildScholarshipShareFacts(opportunity, slug);
  const detailsUrl = withUtm(facts.canonicalUrl, "linkedin");
  const factLines = [
    facts.country ? `• Country: ${facts.country}` : null,
    facts.provider ? `• Provider: ${facts.provider}` : null,
    facts.degree ? `• Degree level: ${facts.degree}` : null,
    facts.funding ? `• Funding: ${facts.funding}` : null,
    facts.deadline ? `• Deadline: ${facts.deadline}` : null,
  ];

  return compactLines([
    `Scholarship opportunity: ${facts.title}`,
    "",
    "Key details:",
    compactLines(factLines),
    "",
    "View details, eligibility, documents, and official source:",
    detailsUrl,
    "",
    "#Scholarships #HigherEducation #ScholarsRepublic",
  ]);
}

export function buildShareUrls(opportunity: OpportunityDetail, slug: string) {
  const facts = buildScholarshipShareFacts(opportunity, slug);
  const facebookUrl = withUtm(facts.canonicalUrl, "facebook");
  const linkedinUrl = withUtm(facts.canonicalUrl, "linkedin");
  const telegramUrl = withUtm(facts.canonicalUrl, "telegram");
  const xUrl = withUtm(facts.canonicalUrl, "x");
  const description = buildScholarshipSocialDescription(opportunity);
  const shortText = `${facts.title}${facts.deadline ? ` | Deadline: ${facts.deadline}` : ""}`;

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(facebookUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(opportunity, slug))}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      linkedinUrl,
    )}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(
      telegramUrl,
    )}&text=${encodeURIComponent(`${facts.title}\n${description}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shortText,
    )}&url=${encodeURIComponent(xUrl)}`,
    copyUrl: withUtm(facts.canonicalUrl, "copy"),
    ogImageUrl: getScholarshipOgImageUrl(slug, opportunity),
  };
}
