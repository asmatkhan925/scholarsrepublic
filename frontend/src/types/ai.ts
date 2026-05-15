export type GenerateSOPPayload = {
  target_scholarship?: string;
  target_country?: string;
  target_degree: string;
  field_of_study: string;
  academic_background?: string;
  key_strength?: string;
  why_scholarship?: string;
  future_goals?: string;
  contribution_goal?: string;
  existing_draft?: string;
};

export type SubmitAIJobResponse = {
  job_id: number;
  status: "pending" | "running" | "success" | "failed";
  queue_position: number;
  estimated_wait_seconds: number;
  message: string;
};

export type GenerateSOPResponse = {
  result: string;
  elapsed_seconds?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type AIJobStatus = {
  id: number;
  tool_type: string;
  status: "pending" | "running" | "success" | "failed";
  result_text: string;
  error_message: string;
  queue_position: number;
  queue_position_at_submit: number;
  estimated_wait_seconds: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  elapsed_seconds?: number | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

export type SOPDraftProvider = "local" | "puter" | "deepseek";

export type SOPDraft = {
  id: number;
  title: string;
  provider: SOPDraftProvider;
  provider_label: string;
  target_scholarship: string;
  target_country: string;
  target_degree: string;
  field_of_study: string;
  academic_background: string;
  key_strength: string;
  why_this_scholarship: string;
  future_goal: string;
  contribution_goal: string;
  notes: string;
  sop_text: string;
  created_at: string;
  updated_at: string;
};

export type CreateSOPDraftPayload = Omit<SOPDraft, "id" | "created_at" | "updated_at">;

export type UpdateSOPDraftPayload = Partial<CreateSOPDraftPayload>;
