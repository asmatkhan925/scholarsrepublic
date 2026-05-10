"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  RefreshCw,
  ServerCrash,
  Sparkles,
  Users,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getAIJobStatus, submitSOPJob } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { AIJobStatus, GenerateSOPPayload, SOPOutputType, SOPTone } from "@/types/ai";

type AIHealthStatus = {
  available: boolean;
  status: "online" | "offline" | "disabled" | "not_configured";
  message: string;
  service?: string;
  model?: string;
};

const initialForm: GenerateSOPPayload = {
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

const outputTypeHelp: Record<SOPOutputType, string> = {
  paragraph: "Best for quick profile summaries and scholarship introductions.",
  medium_sop: "Best for most scholarship applications. Recommended.",
  full_sop: "Longer output. It is processed in the queue to avoid timeout.",
};

const toneHelp: Record<SOPTone, string> = {
  simple: "Clear and natural language.",
  formal: "Balanced academic tone.",
  strong_academic: "More polished academic style.",
};

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function SOPGeneratorContent() {
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [checkingAI, setCheckingAI] = useState(true);
  const [form, setForm] = useState<GenerateSOPPayload>(initialForm);
  const [job, setJob] = useState<AIJobStatus | null>(null);
  const [jobMessage, setJobMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.target_degree.trim().length > 0 &&
      form.field_of_study.trim().length > 0 &&
      ((form.future_goals || "").trim().length > 0 ||
        (form.existing_draft || "").trim().length > 0)
    );
  }, [form]);

  async function checkAIHealth() {
    setCheckingAI(true);
    setError(null);

    try {
      const response = await api.get<AIHealthStatus>("/ai/health/");
      setAiHealth(response.data);
    } catch {
      setAiHealth({
        available: false,
        status: "offline",
        message:
          "We could not reach the AI writing service right now. Please try again later.",
      });
    } finally {
      setCheckingAI(false);
    }
  }

  useEffect(() => {
    checkAIHealth();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  function updateField<K extends keyof GenerateSOPPayload>(
    field: K,
    value: GenerateSOPPayload[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function pollJob(jobId: number) {
    try {
      const latest = await getAIJobStatus(jobId);
      setJob(latest);

      if (latest.status === "success" || latest.status === "failed") {
        setLoading(false);

        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (requestError) {
      setLoading(false);
      setError(getErrorMessage(requestError));

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!aiHealth?.available) {
      setError("The AI writing server is currently offline. Please try again later.");
      return;
    }

    if (!canSubmit) {
      setError(
        "Please provide target degree, field of study, and either future goals or an existing SOP draft.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setJob(null);
    setJobMessage("");

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const response = await submitSOPJob(form);

      setJobMessage(response.message);
      setJob({
        id: response.job_id,
        tool_type: "sop_generate",
        status: response.status,
        result_text: "",
        error_message: "",
        queue_position: response.queue_position,
        queue_position_at_submit: response.queue_position,
        estimated_wait_seconds: response.estimated_wait_seconds,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        created_at: new Date().toISOString(),
      });

      await pollJob(response.job_id);

      pollingRef.current = setInterval(() => {
        pollJob(response.job_id);
      }, 3000);
    } catch (requestError) {
      setLoading(false);
      setError(getErrorMessage(requestError));
      await checkAIHealth();
    }
  }

  async function handleCopy() {
    if (!job?.result_text) return;

    await navigator.clipboard.writeText(job.result_text);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  const result = job?.result_text || "";
  const isWaiting = job?.status === "pending" || job?.status === "running";

  if (checkingAI) {
    return (
      <DashboardShell
        title="AI SOP Generator"
        description="Checking whether the AI writing server is available."
      >
        <section className="rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pine/10 text-pine">
            <Loader2 size={28} className="animate-spin" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-ink">
            Checking AI writing server
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/65">
            Please wait a moment while Scholars Republic checks whether the SOP
            generator is available.
          </p>
        </section>
      </DashboardShell>
    );
  }

  if (!aiHealth?.available) {
    return (
      <DashboardShell
        title="AI SOP Generator"
        description="The SOP generator is temporarily unavailable."
      >
        <section className="overflow-hidden rounded-2xl border border-saffron/30 bg-white shadow-soft">
          <div className="bg-gradient-to-r from-saffron/15 via-white to-red-50 px-6 py-8 text-center md:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ServerCrash size={34} aria-hidden="true" />
            </div>

            <h2 className="mt-5 text-3xl font-bold text-ink">
              AI writing server is taking a short break
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink/70">
              Sorry, the SOP generator is temporarily unavailable because the AI
              server is offline or restarting. To avoid wasting your time, we are
              hiding the form until the AI service is available again.
            </p>

            <div className="mx-auto mt-6 max-w-xl rounded-xl border border-saffron/30 bg-saffron/10 p-4 text-sm leading-6 text-ink/70">
              You can still use the rest of Scholars Republic. Please come back
              later and click retry to check the AI server again.
            </div>

            <button
              type="button"
              onClick={checkAIHealth}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              <RefreshCw size={18} aria-hidden="true" />
              Retry AI server check
            </button>
          </div>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="AI SOP Generator"
      description="Generate a scholarship Statement of Purpose draft using your profile and the details you provide."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
          <div className="border-b border-ink/10 bg-gradient-to-r from-pine/10 via-white to-saffron/10 px-5 py-5 md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  <Sparkles size={14} aria-hidden="true" />
                  Scholars Republic AI Tool
                </div>

                <h2 className="mt-4 text-2xl font-bold text-ink">
                  Generate a scholarship SOP draft
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                  This tool uses your student profile plus the information below.
                  Requests are processed in a queue so the GPU server is not overloaded.
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-white/80 p-4 text-sm text-ink/70 md:max-w-sm">
                <div className="flex gap-2">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-saffron"
                    aria-hidden="true"
                  />
                  <p className="leading-6">
                    Do not enter passport numbers, CNIC numbers, bank details,
                    or highly sensitive private information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 p-5 md:p-7">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Target scholarship
                <input
                  value={form.target_scholarship}
                  onChange={(event) =>
                    updateField("target_scholarship", event.target.value)
                  }
                  placeholder="Chinese Government Scholarship"
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Target country
                <input
                  value={form.target_country}
                  onChange={(event) =>
                    updateField("target_country", event.target.value)
                  }
                  placeholder="China"
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Target degree *
                <input
                  required
                  value={form.target_degree}
                  onChange={(event) =>
                    updateField("target_degree", event.target.value)
                  }
                  placeholder="MS Computer Science"
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Field of study *
                <input
                  required
                  value={form.field_of_study}
                  onChange={(event) =>
                    updateField("field_of_study", event.target.value)
                  }
                  placeholder="Artificial Intelligence"
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Why this scholarship?
              <textarea
                value={form.why_scholarship}
                onChange={(event) =>
                  updateField("why_scholarship", event.target.value)
                }
                rows={4}
                placeholder="Explain why this scholarship is important for your academic journey."
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Future goals *
                <textarea
                  value={form.future_goals}
                  onChange={(event) =>
                    updateField("future_goals", event.target.value)
                  }
                  rows={5}
                  placeholder="What do you want to do after completing this degree?"
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Contribution goal
                <textarea
                  value={form.contribution_goal}
                  onChange={(event) =>
                    updateField("contribution_goal", event.target.value)
                  }
                  rows={5}
                  placeholder="How will this degree help your country, community, or field?"
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Existing SOP draft, optional
              <textarea
                value={form.existing_draft}
                onChange={(event) =>
                  updateField("existing_draft", event.target.value)
                }
                rows={7}
                placeholder="Paste your rough SOP draft here if you already have one."
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Output type
                <select
                  value={form.output_type}
                  onChange={(event) =>
                    updateField("output_type", event.target.value as SOPOutputType)
                  }
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                >
                  <option value="paragraph">One paragraph</option>
                  <option value="medium_sop">Medium SOP</option>
                  <option value="full_sop">Full SOP</option>
                </select>
                <span className="text-xs font-normal leading-5 text-ink/55">
                  {outputTypeHelp[form.output_type]}
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Tone
                <select
                  value={form.tone}
                  onChange={(event) =>
                    updateField("tone", event.target.value as SOPTone)
                  }
                  className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                >
                  <option value="simple">Simple</option>
                  <option value="formal">Formal</option>
                  <option value="strong_academic">Strong academic</option>
                </select>
                <span className="text-xs font-normal leading-5 text-ink/55">
                  {toneHelp[form.tone]}
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-cream/50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm leading-6 text-ink/65">
                <strong className="text-ink">Required:</strong> target degree,
                field of study, and either future goals or an existing draft.
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {loading ? "Processing..." : "Generate SOP"}
              </button>
            </div>
          </form>
        </section>

        {job && (
          <section className="rounded-2xl border border-pine/15 bg-pine/5 p-5 shadow-soft md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                  <Users size={14} aria-hidden="true" />
                  AI queue
                </div>

                <h2 className="mt-3 text-xl font-bold text-ink">
                  Request status: {job.status}
                </h2>

                <p className="mt-2 text-sm leading-6 text-ink/65">
                  {jobMessage ||
                    `Queue position: ${job.queue_position}. Estimated wait: ${formatWait(
                      job.estimated_wait_seconds,
                    )}.`}
                </p>
              </div>

              {isWaiting && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-pine/20 bg-white px-4 py-3 text-sm font-semibold text-pine">
                  <Clock size={17} aria-hidden="true" />
                  Estimated wait: {formatWait(job.estimated_wait_seconds)}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
                <FileText size={14} aria-hidden="true" />
                Generated output
              </div>

              <h2 className="mt-3 text-2xl font-bold text-ink">
                Generated SOP Draft
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                Use this as a starting draft. Add your real academic details,
                personal examples, and university-specific reasons before final submission.
              </p>

              {job?.elapsed_seconds !== undefined && job?.elapsed_seconds !== null && (
                <p className="mt-2 text-xs text-ink/50">
                  Generated in {job.elapsed_seconds} seconds.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!result}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? (
                <CheckCircle2 size={17} aria-hidden="true" />
              ) : (
                <Copy size={17} aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy draft"}
            </button>
          </div>

          <div className="mt-5 min-h-[420px] whitespace-pre-wrap rounded-2xl border border-ink/10 bg-cream/40 p-5 text-sm leading-7 text-ink">
            {loading || isWaiting
              ? "Your SOP request is being processed. Please keep this page open. The result will appear here when ready."
              : job?.status === "failed"
                ? job.error_message ||
                  "The AI server is currently offline. Please try again later."
                : result || "Your generated SOP will appear here after you submit the form."}
          </div>

          <div className="mt-4 rounded-xl border border-saffron/30 bg-saffron/10 p-4 text-sm leading-6 text-ink/70">
            <strong>Reminder:</strong> Do not submit AI-generated text directly.
            Review it carefully, make it personal, and remove anything that does
            not accurately represent your background.
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function SOPGeneratorPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <SOPGeneratorContent />
    </ProtectedRoute>
  );
}
