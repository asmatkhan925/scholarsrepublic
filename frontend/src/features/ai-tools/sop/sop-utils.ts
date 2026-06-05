import { isAxiosError } from "axios";

import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { GenerateSOPPayload } from "@/types/ai";
import type { OpportunityListItem } from "@/types/opportunity";
import type { StudentProfile } from "@/types/profile";
import type {
  DeepSeekJobResponse,
  DeepSeekJobStatus,
  DeepSeekLimitErrorResponse,
  GenerationProvider,
  LocalSOPRequestPayload,
  SOPImprovementFocus,
} from "./types";

export const deepSeekTerminalStatuses: DeepSeekJobStatus[] = ["completed", "failed", "canceled"];
export const scholarshipPickerMaxResults = 100;
export const sopImprovementOptions: Array<{ value: SOPImprovementFocus; label: string }> = [
  { value: "opening", label: "Improve opening/motivation" },
  { value: "academic_background", label: "Improve academic background" },
  { value: "scholarship_fit", label: "Improve scholarship fit" },
  { value: "future_goals", label: "Improve future goals/contribution" },
  { value: "clarity", label: "Make the whole SOP clearer" },
];
export const fallbackCountryOptions = ["Pakistan", "China", "Turkey", "Germany", "United States"];
export const fallbackStudyFieldOptions = [
  "Computer Science",
  "Artificial Intelligence",
  "Engineering",
  "Business Administration",
  "Public Health",
];
export const deepSeekLeaveWarning =
  "Your SOP request is still processing. Leaving may cancel or lose the result.";

export function getDeepSeekLimitPayload(error: unknown): DeepSeekLimitErrorResponse | null {
  if (!isAxiosError<DeepSeekLimitErrorResponse>(error)) {
    return null;
  }

  return error.response?.data ?? null;
}

export function formatCooldown(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

export function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function formatScholarshipMeta(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" | ");
}

export function firstProfileValue(values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

export function getScholarshipDegree(scholarship: OpportunityListItem) {
  return scholarship.degree_levels?.[0] ?? "";
}

export function getScholarshipField(scholarship: OpportunityListItem) {
  return scholarship.fields_of_study?.[0] ?? "";
}

export function formatScholarshipDeadline(deadline: string | null) {
  if (!deadline) {
    return "";
  }

  const parsedDate = new Date(deadline);

  if (Number.isNaN(parsedDate.getTime())) {
    return deadline;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildAcademicBackgroundFromProfile(profile: StudentProfile) {
  return formatScholarshipMeta([
    profile.current_education_level,
    profile.current_field_of_study,
    profile.current_institution,
    profile.cgpa ? `CGPA ${profile.cgpa}` : "",
    profile.percentage ? `${profile.percentage}%` : "",
    profile.graduation_year ? `Graduation ${profile.graduation_year}` : "",
  ]);
}

export function buildKeyStrengthFromProfile(profile: StudentProfile) {
  const strengths = [
    ...(profile.skills ?? []).slice(0, 4),
    profile.has_research_experience ? "research experience" : "",
    profile.publications_count ? `${profile.publications_count} publication(s)` : "",
    profile.work_experience_years ? `${profile.work_experience_years} year(s) work experience` : "",
    profile.has_internship_experience ? "internship experience" : "",
    ...(profile.research_interests ?? []).slice(0, 2).map((interest) => `${interest} interest`),
  ];

  return formatScholarshipMeta(strengths);
}

export function getProfileFieldOfStudy(profile: StudentProfile) {
  return firstProfileValue([profile.target_fields?.[0], profile.current_field_of_study]);
}

export function getProfileTargetDegree(profile: StudentProfile) {
  return firstProfileValue([profile.target_degree_level]);
}

export function getProviderDisplayName(provider: GenerationProvider | null) {
  if (provider === "local") return "Server 1";
  if (provider === "puter") return "Server 2";
  if (provider === "deepseek") return "Server 3";
  return "";
}

export function getBackendSOPPayload(form: GenerateSOPPayload): LocalSOPRequestPayload {
  const extraNotes = [
    form.existing_draft?.trim(),
    form.academic_background?.trim()
      ? `Academic background: ${form.academic_background.trim()}`
      : "",
    form.key_strength?.trim()
      ? `Key strength or achievement: ${form.key_strength.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    target_scholarship: form.target_scholarship,
    target_country: form.target_country,
    target_degree: form.target_degree,
    field_of_study: form.field_of_study,
    why_scholarship: form.why_scholarship,
    future_goals: form.future_goals,
    contribution_goal: form.contribution_goal,
    existing_draft: extraNotes,
    output_type: "full_sop",
    tone: "formal",
  };
}

export function cancelDeepSeekJobWithKeepalive(jobId: number) {
  const accessToken = getAccessToken();
  const baseUrl = api.defaults.baseURL ?? "";

  void fetch(`${baseUrl}/desktop-automation/jobs/${jobId}/cancel/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: "{}",
    keepalive: true,
  }).catch(() => {
    // Best effort during page unload.
  });
}

export function getDeepSeekProcessingLabel(job: DeepSeekJobResponse) {
  const backendLabel = job.processing_label?.replace("Queued - ", "Queued — ");

  if (job.status === "running") {
    return backendLabel || "Processing now";
  }

  if (job.status !== "queued") {
    return backendLabel || "Please keep this page open";
  }

  const jobsAhead =
    job.jobs_ahead ??
    (job.queue_position && job.queue_position > 0
      ? Math.max(0, job.queue_position - 1)
      : null);

  if (jobsAhead === 0 && job.queue_position === 1) {
    return "Queued — you are next";
  }

  if (backendLabel) {
    return backendLabel;
  }

  if (typeof jobsAhead === "number") {
    return jobsAhead > 0 ? `Queued — ${jobsAhead} job(s) ahead` : "Queued — you are next";
  }

  return "Queued";
}
