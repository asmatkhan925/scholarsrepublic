import type { GenerateSOPPayload, SOPOutputType, SOPTone } from "@/types/ai";

export const PUTER_MODEL = "claude-haiku-4-5-20251001";

export const initialForm: GenerateSOPPayload = {
  target_scholarship: "",
  target_country: "",
  target_degree: "",
  field_of_study: "",
  why_scholarship: "",
  future_goals: "",
  contribution_goal: "",
  existing_draft: "",
  output_type: "paragraph",
  tone: "formal",
};

export const outputTypeHelp: Record<SOPOutputType, string> = {
  paragraph: "Best for quick profile summaries and scholarship introductions.",
  medium_sop: "Best for most scholarship applications. Recommended.",
  full_sop: "Longer output. Use when you need a complete SOP draft.",
};

export const toneHelp: Record<SOPTone, string> = {
  simple: "Clear and natural language.",
  formal: "Balanced academic tone.",
  strong_academic: "More polished academic style.",
};

export const outputInstructions: Record<SOPOutputType, string> = {
  paragraph:
    "Return one polished paragraph only. Do not add a title, heading, bullet points, or markdown.",
  medium_sop:
    "Return 3 to 4 polished paragraphs. Do not use headings, bullet points, numbering, or markdown.",
  full_sop:
    "Return a complete SOP draft with 4 to 6 focused paragraphs. Use clean essay-style text. Do not use markdown headings, bullet points, or numbering.",
};

export const toneInstructions: Record<SOPTone, string> = {
  simple: "Use simple, clear, natural language.",
  formal: "Use a formal academic tone.",
  strong_academic:
    "Use a strong academic tone while keeping the writing natural and believable.",
};
