import type { GenerateSOPPayload } from "@/types/ai";

export const PUTER_MODEL = "claude-haiku-4-5-20251001";

export const initialForm: GenerateSOPPayload = {
  target_scholarship: "",
  target_country: "",
  target_degree: "",
  field_of_study: "",
  academic_background: "",
  key_strength: "",
  why_scholarship: "",
  future_goals: "",
  contribution_goal: "",
  existing_draft: "",
};
