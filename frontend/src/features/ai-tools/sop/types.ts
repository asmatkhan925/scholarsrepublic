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
