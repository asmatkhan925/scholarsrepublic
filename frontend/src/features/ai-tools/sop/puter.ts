import type { GenerateSOPPayload } from "@/types/ai";

import { outputInstructions, toneInstructions } from "./constants";

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

export function extractPuterUsage(response: unknown): string {
  const responseObject = getObject(response);

  if (!responseObject) {
    return "";
  }

  const usage = getObject(responseObject.usage);

  if (!usage) {
    const messageObject = getObject(responseObject.message);
    const messageUsage = messageObject ? getObject(messageObject.usage) : null;

    if (!messageUsage) return "";

    const inputTokens = messageUsage.input_tokens;
    const outputTokens = messageUsage.output_tokens;

    if (typeof inputTokens === "number" && typeof outputTokens === "number") {
      return `Input tokens: ${inputTokens}, output tokens: ${outputTokens}`;
    }

    return "";
  }

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const usdCents = usage.usd_cents;

  const parts: string[] = [];

  if (typeof inputTokens === "number") {
    parts.push(`Input tokens: ${inputTokens}`);
  }

  if (typeof outputTokens === "number") {
    parts.push(`Output tokens: ${outputTokens}`);
  }

  if (typeof usdCents === "number") {
    parts.push(`Estimated cost: ${usdCents.toFixed(4)} cents`);
  }

  return parts.join(", ");
}

export function buildPuterPrompt(form: GenerateSOPPayload) {
  return `You are an expert scholarship SOP editor for Scholars Republic.

Your task:
Write a polished scholarship Statement of Purpose draft using only the student's provided details.

Strict rules:
- Return only the SOP text.
- Return 4 to 6 focused paragraphs unless the selected output instruction explicitly asks for a shorter paragraph summary.
- Separate paragraphs with a blank line.
- Do not repeat this prompt or any instructions.
- Do not show reasoning.
- Do not use Markdown.
- Do not use #, ##, bullet points, numbering, or labels such as "Introduction" or "Conclusion".
- Do not invent achievements, universities, grades, awards, research projects, publications, work experience, or personal stories.
- If important details are missing, write honestly and generally.
- Keep the writing natural, human, specific, and scholarship-focused.
- Avoid exaggerated phrases such as "world-class" unless the student provided that detail.
- Avoid repeating the same idea in different words.
- Make the SOP sound like a real student, not a generic AI template.

Output instruction: ${outputInstructions[form.output_type]}
Tone instruction: ${toneInstructions[form.tone]}

Student details:
Target scholarship: ${form.target_scholarship || "Not provided"}
Target country: ${form.target_country || "Not provided"}
Target degree: ${form.target_degree || "Not provided"}
Field of study: ${form.field_of_study || "Not provided"}
Why this scholarship matters: ${form.why_scholarship || "Not provided"}
Future goals: ${form.future_goals || "Not provided"}
Contribution goal: ${form.contribution_goal || "Not provided"}
Existing draft: ${form.existing_draft || "Not provided"}

Final reminder:
Write clean SOP paragraphs only. No markdown. No headings. No fake details. Do not repeat this prompt or any instructions.`;
}
