import type { GenerateSOPPayload } from "@/types/ai";

type SOPInputSafetyResult = {
  ok: boolean;
  message?: string;
  field?: keyof GenerateSOPPayload | "improvement_instruction";
};

const genericSafetyMessage =
  "Please remove instructions that ask the AI to ignore rules, invent achievements, or include sensitive personal information. Your SOP should only use honest details you provide.";

const fieldLabels: Record<keyof GenerateSOPPayload, string> = {
  target_scholarship: "Scholarship",
  target_country: "Target country",
  target_degree: "Target degree",
  field_of_study: "Field of study",
  why_scholarship: "Why this scholarship?",
  future_goals: "Future goal",
  contribution_goal: "Contribution goal",
  existing_draft: "Notes or existing draft",
  academic_background: "Academic background",
  key_strength: "Key strength/achievement",
};

const maxFieldLengths: Partial<Record<keyof GenerateSOPPayload, number>> = {
  target_scholarship: 300,
  target_country: 120,
  target_degree: 120,
  field_of_study: 200,
  why_scholarship: 1200,
  future_goals: 1200,
  contribution_goal: 1200,
  academic_background: 1200,
  key_strength: 1200,
  existing_draft: 5000,
};

const promptInjectionPatterns = [
  /ignore\s+(all\s+)?(previous|above|system|developer)\s+instructions?/i,
  /ignore\s+(the\s+)?rules/i,
  /do\s+not\s+follow\s+(the\s+)?(rules|instructions)/i,
  /reveal\s+(the\s+)?(system\s+prompt|developer\s+message|hidden\s+instructions?|prompt)/i,
  /show\s+(the\s+)?(system\s+prompt|developer\s+message|hidden\s+instructions?)/i,
  /\b(jailbreak|dan\s+mode|developer\s+mode|unrestricted\s+ai)\b/i,
  /bypass\s+(the\s+)?(rules|safety|instructions|filters?)/i,
  /(act|pretend)\s+as\s+(an?\s+)?(unrestricted|uncensored|jailbroken)/i,
];

const fakeAchievementPatterns = [
  /(invent|make\s+up|fabricate|fake|create|add|write|lie\s+about).{0,60}\b(cgpa|gpa|grade|grades|award|awards|achievement|achievements|publication|publications|research|internship|internships|work\s+experience|job|university|certificate|transcript|recommendation|ielts|toefl)\b/i,
  /\b(fake|forged|fabricated)\b.{0,60}\b(transcript|certificate|degree|recommendation|ielts|toefl|award|publication|experience)\b/i,
  /\b(say|claim|mention)\b.{0,40}\b(i\s+have|i\s+had|i\s+won|i\s+published|i\s+worked)\b.{0,60}\b(even\s+if|although|but)\b.{0,40}\b(not\s+true|did\s+not|never)\b/i,
];

const sensitiveDataPatterns = [
  /\b(password|passcode|api\s*key|secret\s*key|private\s*key|jwt|bearer\s+token|access\s+token)\b\s*[:=]\s*\S+/i,
  /\b(cnic|passport|national\s+id|id\s+card)\b.{0,20}\d{4,}/i,
  /\b\d{5}-\d{7}-\d\b/,
  /\b(card\s+number|credit\s+card|debit\s+card|cvv|cvc)\b.{0,30}\d{4,}/i,
  /-----BEGIN\s+(RSA|OPENSSH|DSA|EC|PRIVATE)\s+PRIVATE\s+KEY-----/i,
];

const spamOrScriptPatterns = [
  /<\s*script\b/i,
  /javascript\s*:/i,
  /<\s*iframe\b/i,
  /(.)\1{40,}/,
];

function countUrls(value: string) {
  return (value.match(/https?:\/\/|www\./gi) ?? []).length;
}

function findSafetyIssue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (promptInjectionPatterns.some((pattern) => pattern.test(trimmed))) {
    return "prompt_injection";
  }

  if (fakeAchievementPatterns.some((pattern) => pattern.test(trimmed))) {
    return "fake_achievement";
  }

  if (sensitiveDataPatterns.some((pattern) => pattern.test(trimmed))) {
    return "sensitive_data";
  }

  if (spamOrScriptPatterns.some((pattern) => pattern.test(trimmed)) || countUrls(trimmed) >= 3) {
    return "spam_or_script";
  }

  return "";
}

function messageForIssue(label: string, issue: string) {
  if (issue === "prompt_injection") {
    return `The “${label}” field appears to include instructions that ask the AI to ignore rules. Please remove them.`;
  }

  if (issue === "fake_achievement") {
    return `The “${label}” field appears to ask for invented or fake achievements. Please use only honest information.`;
  }

  if (issue === "sensitive_data") {
    return `The “${label}” field appears to include sensitive personal information. Please remove passwords, tokens, ID numbers, or card details.`;
  }

  if (issue === "spam_or_script") {
    return `The “${label}” field contains content that does not look suitable for an SOP. Please remove scripts, repeated junk text, or excessive links.`;
  }

  return genericSafetyMessage;
}

export function validateSOPInput(form: GenerateSOPPayload): SOPInputSafetyResult {
  const fields = Object.keys(fieldLabels) as Array<keyof GenerateSOPPayload>;

  for (const field of fields) {
    const value = String(form[field] ?? "");
    const maxLength = maxFieldLengths[field];

    if (maxLength && value.length > maxLength) {
      return {
        ok: false,
        field,
        message: `The “${fieldLabels[field]}” field is too long. Please shorten it before generating.`,
      };
    }

    const issue = findSafetyIssue(value);
    if (issue) {
      return {
        ok: false,
        field,
        message: messageForIssue(fieldLabels[field], issue),
      };
    }
  }

  return { ok: true };
}

export function validateSOPImprovementInstruction(instruction: string): SOPInputSafetyResult {
  const value = instruction.trim();

  if (!value) {
    return { ok: true };
  }

  if (value.length > 1200) {
    return {
      ok: false,
      field: "improvement_instruction",
      message: "The improvement instruction is too long. Please shorten it before continuing.",
    };
  }

  const issue = findSafetyIssue(value);

  if (issue) {
    return {
      ok: false,
      field: "improvement_instruction",
      message: messageForIssue("improvement instruction", issue),
    };
  }

  return { ok: true };
}
