import type { OpportunityDetail } from "@/types/opportunity";

import type { ScholarshipEditForm } from "./types";

export function listToText(value: string[] | undefined) {
  return Array.isArray(value) ? value.join("\n") : "";
}

export function textToList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function buildForm(opportunity: OpportunityDetail): ScholarshipEditForm {
  return {
    title: opportunity.title || "",
    provider_name: opportunity.provider_name || "",
    university_name: opportunity.university_name || "",
    country: opportunity.country || "",
    pathway_id: opportunity.pathway_detail?.id ?? null,
    status: opportunity.status,
    featured: Boolean(opportunity.featured),
    verified_status: Boolean(opportunity.verified_status),
    verification_note: opportunity.verification_note || "",
    short_description: opportunity.short_description || "",
    description: opportunity.description || "",
    benefits: opportunity.benefits || "",
    eligibility: opportunity.eligibility || "",
    how_to_apply: opportunity.how_to_apply || "",
    official_link: opportunity.official_link || "",
    source_url: opportunity.source_url || "",
    source_name: opportunity.source_name || "",
    deadline: dateInputValue(opportunity.deadline),
    is_rolling_deadline: Boolean(opportunity.is_rolling_deadline),
    funding_type: opportunity.funding_type || "",
    funding_amount:
      opportunity.funding_amount === null || opportunity.funding_amount === undefined
        ? ""
        : String(opportunity.funding_amount),
    funding_currency: opportunity.funding_currency || "",
    stipend_summary: opportunity.stipend_summary || "",
    degree_levels: listToText(opportunity.degree_levels),
    fields_of_study: listToText(opportunity.fields_of_study),
    eligible_countries: listToText(opportunity.eligible_countries),
    required_documents: listToText(opportunity.required_documents),
    tags: listToText(opportunity.tags),
    application_fee_required: Boolean(opportunity.application_fee_required),
    ielts_required: Boolean(opportunity.ielts_required),
    toefl_required: Boolean(opportunity.toefl_required),
    duolingo_required: Boolean(opportunity.duolingo_required),
    hsk_required: Boolean(opportunity.hsk_required),
    english_proficiency_certificate_accepted: Boolean(
      opportunity.english_proficiency_certificate_accepted,
    ),
  };
}

export function getPublishReadiness(form: ScholarshipEditForm) {
  const issues: string[] = [];

  if (!form.title.trim()) issues.push("Title missing");
  if (!form.country.trim()) issues.push("Country missing");
  if (!form.official_link.trim() && !form.source_url.trim()) issues.push("Official source missing");
  if (!form.is_rolling_deadline && !form.deadline) issues.push("Deadline missing");
  if (!form.short_description.trim()) issues.push("Short description missing");
  if (!form.benefits.trim()) issues.push("Benefits missing");
  if (!form.eligibility.trim()) issues.push("Eligibility missing");
  if (!form.how_to_apply.trim()) issues.push("How to apply missing");
  if (!form.funding_type && !form.funding_amount.trim()) issues.push("Funding unclear");
  if (textToList(form.degree_levels).length === 0) issues.push("Degree levels missing");
  if (textToList(form.fields_of_study).length === 0) issues.push("Fields missing");
  if (form.status === "published" && !form.verified_status) issues.push("Published but unverified");

  return issues;
}

export function looksLikeAmountText(value: string) {
  return /(\$|€|£|USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD)\s?\d|\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD|€|£|\$)/i.test(
    value,
  );
}

export function getStipendWarnings(form: ScholarshipEditForm) {
  const warnings: string[] = [];
  const stipendSummary = form.stipend_summary.trim();
  const fundingAmount = form.funding_amount.trim();
  const fundingCurrency = form.funding_currency.trim();

  if (looksLikeAmountText(stipendSummary) && !fundingAmount) {
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
