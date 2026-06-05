import type { GenerateSOPPayload } from "@/types/ai";
import type { OpportunityListItem } from "@/types/opportunity";

export type AIHealthStatus = {
  available: boolean;
  status: "online" | "offline" | "disabled" | "not_configured";
  message: string;
  service?: string;
  model?: string;
};

export type GenerationProvider = "local" | "puter" | "deepseek";

export type SOPImprovementFocus =
  | "opening"
  | "academic_background"
  | "scholarship_fit"
  | "future_goals"
  | "clarity";

export type PuterAIOptions = {
  model?: string;
  stream?: boolean;
};

export type PuterAI = {
  chat: (prompt: string, options?: PuterAIOptions) => Promise<unknown>;
};

export type PuterWindow = Window & {
  puter?: {
    ai?: PuterAI;
  };
};

export type DeepSeekWorkerStatusResponse = {
  online: boolean;
  status: "online" | "offline" | string;
  message: string;
};

export type DeepSeekJobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export type CreateDeepSeekJobResponse = {
  job_id: number;
  status: DeepSeekJobStatus;
  message: string;
  poll_url: string;
};

export type DeepSeekJobResponse = {
  id: number;
  kind: string;
  status: DeepSeekJobStatus;
  ok: boolean | null;
  text: string;
  user_message: string;
  jobs_ahead: number | null;
  queue_position: number | null;
  processing_label: string;
  result_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
};

export type DeepSeekLimitErrorResponse = {
  detail?: string;
  status?: string;
  retry_after_seconds?: number;
};

export type LocalSOPRequestPayload = Omit<GenerateSOPPayload, "academic_background" | "key_strength"> & {
  output_type: "full_sop";
  tone: "formal";
};

export type ScholarshipPickerItem = {
  scholarship: OpportunityListItem;
  isSaved: boolean;
  matchScore: number | null;
  rank: 0 | 1 | 2;
};
