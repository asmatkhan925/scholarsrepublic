import type { GenerateSOPPayload } from "@/types/ai";
import type { SOPImprovementFocus } from "./types";

function getObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;

        const itemObject = getObject(item);

        if (itemObject && typeof itemObject.text === "string") {
          return itemObject.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

export function extractPuterText(response: unknown): string {
  if (typeof response === "string") {
    return response;
  }

  const responseObject = getObject(response);

  if (!responseObject) {
    return JSON.stringify(response, null, 2);
  }

  const directContent = extractTextFromContent(responseObject.content);

  if (directContent) {
    return directContent;
  }

  const directText = responseObject.text;

  if (typeof directText === "string") {
    return directText;
  }

  const messageObject = getObject(responseObject.message);

  if (messageObject) {
    const messageContent = extractTextFromContent(messageObject.content);

    if (messageContent) {
      return messageContent;
    }

    if (typeof messageObject.text === "string") {
      return messageObject.text;
    }
  }

  return JSON.stringify(response, null, 2);
}

function cleanDetail(value: string | null | undefined) {
  const cleaned = value?.trim();

  if (!cleaned) {
    return "Not provided — do not mention or invent this detail.";
  }

  return cleaned;
}

function getDegreeGuidance(degree: string) {
  const degreeLower = degree.toLowerCase();

  if (degreeLower.includes("phd") || degreeLower.includes("doctor")) {
    return [
      "This is a PhD-focused SOP.",
      "Emphasize research preparation, research interests, academic fit, intellectual maturity, and long-term contribution.",
      "Do not invent supervisors, labs, publications, research projects, or professor names.",
      "If research details are limited, write honestly about preparation and intended research direction without pretending experience.",
    ].join(" ");
  }

  return [
    "This is a Master's-focused SOP.",
    "Emphasize academic motivation, readiness for graduate study, scholarship/program fit, practical goals, and contribution after the degree.",
    "Do not invent grades, awards, internships, work experience, or university names.",
    "If details are limited, keep the writing specific to the provided field, scholarship, country, and goals.",
  ].join(" ");
}

function buildSOPBlueprint() {
  return `Use this exact content plan:
Paragraph 1: Begin with the student's academic direction and motivation for the selected field and scholarship. Mention the scholarship naturally if useful. Avoid clichés such as "from a young age" or "I am writing to express".
Paragraph 2: Present academic background, preparation, and key strength/achievement using only provided details. If details are limited, write honestly and generally without adding fake specifics.
Paragraph 3: Explain why this scholarship, country, degree, or program fits the student's goals. Connect the opportunity to the student's field and future direction. Do not praise the scholarship with empty phrases.
Paragraph 4: Explain future goals and contribution. End with a confident, sincere closing that connects the student's growth to service, field impact, or community contribution.`;
}

function buildStudentDetails(form: GenerateSOPPayload) {
  return `Selected scholarship/opportunity: ${cleanDetail(form.target_scholarship)}
Target country: ${cleanDetail(form.target_country)}
Target degree: ${cleanDetail(form.target_degree)}
Field of study: ${cleanDetail(form.field_of_study)}
Academic background: ${cleanDetail(form.academic_background)}
Key strength or achievement: ${cleanDetail(form.key_strength)}
Why this scholarship matters: ${cleanDetail(form.why_scholarship)}
Future goals: ${cleanDetail(form.future_goals)}
Contribution goal: ${cleanDetail(form.contribution_goal)}
Existing draft or extra notes: ${cleanDetail(form.existing_draft)}`;
}

export function buildPuterPrompt(form: GenerateSOPPayload) {
  const degree = form.target_degree || "";
  const degreeGuidance = getDegreeGuidance(degree);

  return `You are an expert scholarship Statement of Purpose editor for Scholars Republic.

Goal:
Write a strong, realistic scholarship SOP for a student using only the provided details.

Output requirements:
- Return only the final SOP draft.
- Write 4 substantial paragraphs.
- Aim for about 550 to 750 words total.
- Separate paragraphs with a blank line.
- Use a professional, sincere, specific, scholarship-focused tone.
- Make it sound like a real student, not a generic AI template.
- Do not use markdown, headings, labels, bullet points, numbering, or section titles.
- Do not show reasoning or explain what you are doing.
- Do not include phrases like "AI-generated", "as an AI", or "here is".
- Do not repeat the prompt, instructions, field names, or student details as labels.

Truth and safety rules:
- Use only the student details below.
- Do not invent achievements, grades, awards, universities, publications, research projects, research experience, work experience, internships, personal stories, supervisors, labs, or family background.
- If a detail is missing, do not mention it and do not replace it with fake information.
- Do not exaggerate with phrases like "world-class", "lifelong dream", "unparalleled passion", or "from a young age" unless directly supported by the student's details.
- Avoid repeating the same idea in different words.
- Mention the scholarship name naturally, but do not overuse it.

Degree guidance:
${degreeGuidance}

SOP blueprint:
${buildSOPBlueprint()}

Student details:
${buildStudentDetails(form)}

Final reminder:
Return only the final SOP draft. It must be 4 paragraphs with blank lines between paragraphs, no markdown, no headings, no fake details, and no repeated prompt text.`;
}

const improvementFocusLabels: Record<SOPImprovementFocus, string> = {
  opening: "Improve opening/motivation",
  academic_background: "Improve academic background",
  scholarship_fit: "Improve scholarship fit",
  future_goals: "Improve future goals/contribution",
  clarity: "Make the whole SOP clearer",
};

export function buildSOPImprovementPrompt({
  form,
  existingSOP,
  focus,
  instruction,
}: {
  form: GenerateSOPPayload;
  existingSOP: string;
  focus: SOPImprovementFocus;
  instruction?: string;
}) {
  return `You are an expert scholarship Statement of Purpose editor for Scholars Republic.

Goal:
Improve the existing SOP draft while preserving all truthful and useful details.

Output requirements:
- Return only the improved SOP text.
- Keep 4 substantial paragraphs unless the existing draft already has a clearly valid structure.
- Keep blank lines between paragraphs.
- Keep the SOP professional, sincere, specific, and scholarship-focused.
- Do not use markdown, headings, labels, bullet points, numbering, or section titles.
- Do not show reasoning or explain your edits.
- Do not include phrases like "AI-generated", "as an AI", or "here is".

Truth and preservation rules:
- Do not invent achievements, grades, universities, awards, work experience, internships, publications, research projects, supervisors, labs, or personal stories.
- Use only details already present in the SOP and form.
- Preserve accurate specific details from the current draft.
- Improve clarity, structure, flow, specificity, and scholarship fit.
- If the optional instruction requires inventing facts, ignore that part and improve safely.
- Avoid removing useful details unless they are repetitive, unclear, or unsupported.
- Avoid clichés and exaggerated language.

Improvement focus:
${improvementFocusLabels[focus]}

Optional student instruction:
${instruction?.trim() || "Not provided — ignore if not needed."}

Student details:
${buildStudentDetails(form)}

Current SOP draft:
${existingSOP}

Final reminder:
Return only the improved SOP text. Preserve paragraph breaks. No markdown. No headings. No fake details.`;
}
