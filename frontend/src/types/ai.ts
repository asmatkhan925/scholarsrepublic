export type SOPOutputType = "paragraph" | "medium_sop" | "full_sop";

export type SOPTone = "simple" | "formal" | "strong_academic";

export type GenerateSOPPayload = {
  target_scholarship?: string;
  target_country?: string;
  target_degree: string;
  field_of_study: string;
  why_scholarship?: string;
  future_goals?: string;
  contribution_goal?: string;
  existing_draft?: string;
  output_type: SOPOutputType;
  tone: SOPTone;
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
