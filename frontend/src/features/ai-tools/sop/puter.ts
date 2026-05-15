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

export function buildPuterPrompt(form: GenerateSOPPayload) {
  const degree = form.target_degree || "Not provided";
  const degreeLower = degree.toLowerCase();
  const degreeGuidance = degreeLower.includes("phd") || degreeLower.includes("doctor")
    ? "For a PhD application, emphasize research interests, preparation, fit with the research environment, and long-term contribution."
    : "For a Master's application, emphasize academic motivation, program fit, future goals, and practical contribution.";

  return `You are an expert scholarship SOP editor for Scholars Republic.

Your task:
Write a balanced scholarship Statement of Purpose draft using only the student's provided details.

Strict rules:
- Return only the final SOP draft.
- Return 4 focused paragraphs.
- Separate paragraphs with a blank line.
- Do not repeat the prompt, student details, instructions, or labels.
- Do not show reasoning.
- Do not use Markdown.
- Do not use #, ##, bullet points, numbering, or labels such as "Introduction" or "Conclusion".
- Do not invent achievements, grades, awards, universities, publications, research projects, research experience, work experience, or personal stories.
- If important details are missing, write honestly and generally.
- Use a professional, sincere, specific, and scholarship-focused tone.
- Avoid exaggerated phrases such as "world-class" unless the student provided that detail.
- Avoid repeating the same idea in different words.
- Make the SOP sound like a real student, not a generic AI template.

Degree guidance:
${degreeGuidance}

Student details:
Target scholarship: ${form.target_scholarship || "Not provided"}
Target country: ${form.target_country || "Not provided"}
Target degree: ${degree}
Field of study: ${form.field_of_study || "Not provided"}
Academic background: ${form.academic_background || "Not provided"}
Key strength or achievement: ${form.key_strength || "Not provided"}
Why this scholarship matters: ${form.why_scholarship || "Not provided"}
Future goals: ${form.future_goals || "Not provided"}
Contribution goal: ${form.contribution_goal || "Not provided"}
Existing draft: ${form.existing_draft || "Not provided"}

Final reminder:
Return only the final SOP draft in 4 focused paragraphs. No markdown. No headings. No fake details. Do not repeat the prompt, student details, instructions, or labels.`;
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
  return `You are an expert scholarship SOP editor for Scholars Republic.

Your task:
Improve this existing scholarship Statement of Purpose draft.

Strict rules:
- Return only the improved SOP text.
- Preserve 4 focused paragraphs unless the existing SOP has a clearly different valid structure.
- Keep blank lines between paragraphs.
- Do not repeat the prompt, student details, instructions, labels, or markdown headings.
- Do not show reasoning.
- Do not use Markdown.
- Do not use #, ##, bullet points, numbering, or labels such as "Introduction" or "Conclusion".
- Do not invent achievements, grades, universities, awards, work experience, publications, research, or personal stories.
- Use only details already present in the SOP and form.
- If the optional student instruction requires inventing facts, ignore that part and improve safely.
- Keep the tone professional, sincere, specific, and scholarship-focused.

Improvement focus:
${improvementFocusLabels[focus]}

Optional student instruction:
${instruction?.trim() || "Not provided"}

Student details:
Target scholarship: ${form.target_scholarship || "Not provided"}
Target country: ${form.target_country || "Not provided"}
Target degree: ${form.target_degree || "Not provided"}
Field of study: ${form.field_of_study || "Not provided"}
Academic background: ${form.academic_background || "Not provided"}
Key strength or achievement: ${form.key_strength || "Not provided"}
Why this scholarship matters: ${form.why_scholarship || "Not provided"}
Future goals: ${form.future_goals || "Not provided"}
Contribution goal: ${form.contribution_goal || "Not provided"}

Current SOP draft:
${existingSOP}

Final reminder:
Return only the improved SOP text. Keep blank lines between paragraphs. No markdown. No headings. No fake details.`;
}
