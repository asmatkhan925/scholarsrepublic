import { useMemo } from "react";

import type { OpportunityDraft } from "@/types/opportunity";
import {
  APPLICATION_TRACK_VALUES,
  DEGREE_LEVEL_EXAMPLES,
  FUNDING_TYPE_VALUES,
  formatPromptList,
  type JsonPreview,
} from "./import-utils";

export function useImportPrompts(params: {
  sourceUrl: string;
  sourceText: string;
  jsonText: string;
  jsonPreview: JsonPreview | null;
  createdDraft: OpportunityDraft | null;
  pathwayContext: string;
  countryContext: string;
  studyFieldContext: string;
}): {
  gptPrompt: string;
  gptFixPrompt: string;
  jsonRepairPrompt: string;
  facebookPostPrompt: string;
  facebookImagePrompt: string;
} {
  const {
    sourceUrl,
    sourceText,
    jsonText,
    jsonPreview,
    createdDraft,
    pathwayContext,
    countryContext,
    studyFieldContext,
  } = params;

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
Do not claim "fully funded" unless funding type or benefits clearly support it.

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
If any value is "Not listed", do not put that value on the image.
Keep the poster clean and accurate.

Return only the image-generation prompt.`;
  }, [jsonPreview]);

  return {
    gptPrompt,
    gptFixPrompt,
    jsonRepairPrompt,
    facebookPostPrompt,
    facebookImagePrompt,
  };
}
