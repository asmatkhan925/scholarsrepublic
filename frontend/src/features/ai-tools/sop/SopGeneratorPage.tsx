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
  Sparkles,
  Users,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getAIJobStatus, submitSOPJob } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AIJobStatus,
  GenerateSOPPayload,
  SOPOutputType,
  SOPTone,
} from "@/types/ai";
import { FormattedSOPText } from "./FormattedSOPText";
import { initialForm, outputTypeHelp, PUTER_MODEL, toneHelp } from "./constants";
import { formatWait, normalizeAIText } from "./format";
import { buildPuterPrompt, extractPuterText, extractPuterUsage } from "./puter";
import type { AIHealthStatus, GenerationProvider, PuterWindow } from "./types";


function SOPGeneratorContent() {
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [checkingAI, setCheckingAI] = useState(true);
  const [provider, setProvider] = useState<GenerationProvider>("local");
  const [puterStatus, setPuterStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [form, setForm] = useState<GenerateSOPPayload>(initialForm);
  const [job, setJob] = useState<AIJobStatus | null>(null);
  const [jobMessage, setJobMessage] = useState("");
  const [puterResult, setPuterResult] = useState("");
  const [puterUsage, setPuterUsage] = useState("");
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
      const health = response.data;

      setAiHealth(health);

      if (!health.available) {
        setProvider("puter");
      }
    } catch {
      setAiHealth({
        available: false,
        status: "offline",
        message:
          "Our AI server is temporarily offline. External AI is available.",
      });
      setProvider("puter");
    } finally {
      setCheckingAI(false);
    }
  }

  function loadPuterScript() {
    setPuterStatus("loading");

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.puter.com/v2/"]',
    );

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;

    script.onload = () => {
      const puterWindow = window as PuterWindow;

      if (puterWindow.puter?.ai?.chat) {
        setPuterStatus("ready");
      } else {
        setPuterStatus("failed");
      }
    };

    script.onerror = () => {
      setPuterStatus("failed");
    };

    document.body.appendChild(script);
  }

  useEffect(() => {
    checkAIHealth();
    loadPuterScript();

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

  async function generateWithLocalServer() {
    if (!aiHealth?.available) {
      setProvider("puter");
      setError(
        "Our AI server is temporarily offline. Please use External AI for now.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setJob(null);
    setJobMessage("");
    setPuterResult("");
    setPuterUsage("");

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

  async function generateWithPuter() {
    const puterWindow = window as PuterWindow;

    if (!puterWindow.puter?.ai?.chat) {
      setError(
        "External AI is still loading. Please wait a moment or click Reload External AI.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setJob(null);
    setJobMessage("");
    setPuterResult("");
    setPuterUsage("");

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const response = await puterWindow.puter.ai.chat(buildPuterPrompt(form), {
        model: PUTER_MODEL,
        stream: false,
      });

      setPuterResult(normalizeAIText(extractPuterText(response)));
      setPuterUsage(extractPuterUsage(response));
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "External AI request failed.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError(
        "Please provide target degree, field of study, and either future goals or an existing SOP draft.",
      );
      return;
    }

    if (provider === "local") {
      await generateWithLocalServer();
      return;
    }

    await generateWithPuter();
  }

  const localResult = job?.result_text || "";
  const result = provider === "puter" ? puterResult : localResult;
  const isWaiting =
    provider === "local" &&
    (job?.status === "pending" || job?.status === "running");

  async function handleCopy() {
    if (!result) return;

    await navigator.clipboard.writeText(result);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  const localOptionDisabled = !aiHealth?.available;
  const puterOptionDisabled = puterStatus !== "ready";
  const generateDisabled =
    loading ||
    !canSubmit ||
    (provider === "local" && localOptionDisabled) ||
    (provider === "puter" && puterOptionDisabled);

  return (
    <DashboardShell
      title="AI SOP Generator"
      description="Generate a scholarship Statement of Purpose draft using your profile and the details you provide."
      hideHeader
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
          <div className="border-b border-ink/10 bg-gradient-to-r from-pine/10 via-white to-saffron/10 px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  <Sparkles size={14} aria-hidden="true" />
                  Scholars Republic AI Tool
                </div>

                <h2 className="mt-3 text-xl font-bold text-ink">
                  Generate a scholarship SOP draft
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                  Fill in your academic goals, choose an AI provider, and generate
                  a clean first draft that you can personalize before submission.
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

          <form onSubmit={handleSubmit} className="grid gap-5 p-4 md:p-6">
            {checkingAI && (
              <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-4 py-3 text-sm leading-6 text-ink/70">
                Checking Scholars Republic AI Server status...
              </div>
            )}

            {!checkingAI && !aiHealth?.available && (
              <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-4 py-3 text-sm leading-6 text-ink/75">
                Our AI server is temporarily offline. External AI is available,
                so you can still generate your SOP.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-ink/10 bg-cream/40 p-3 md:p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Choose AI provider
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-ink/60">
                    Use our server when it is online, or use External AI as a
                    backup.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={checkAIHealth}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Recheck server
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={localOptionDisabled}
                  onClick={() => setProvider("local")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    provider === "local"
                      ? "border-pine bg-pine/5"
                      : "border-ink/10 bg-white hover:border-pine/30"
                  } ${
                    localOptionDisabled
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ink">
                        Scholars Republic AI Server
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-ink/65">
                        Uses your GPU server, queue system, and local Qwen model.
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        aiHealth?.available
                          ? "bg-pine/10 text-pine"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {aiHealth?.available ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider("puter")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    provider === "puter"
                      ? "border-pine bg-pine/5"
                      : "border-ink/10 bg-white hover:border-pine/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ink">
                        External AI via Puter.js
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-ink/65">
                        Browser-based external AI option. Useful when our server
                        is busy or offline.
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        puterStatus === "ready"
                          ? "bg-pine/10 text-pine"
                          : puterStatus === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-saffron/15 text-ink/60"
                      }`}
                    >
                      {puterStatus === "ready"
                        ? "Ready"
                        : puterStatus === "failed"
                          ? "Failed"
                          : "Loading"}
                    </span>
                  </div>
                </button>
              </div>

              {puterStatus === "failed" && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  External AI script could not be loaded. This may be caused by
                  browser blocking or network restrictions.
                  <button
                    type="button"
                    onClick={loadPuterScript}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    Reload External AI
                  </button>
                </div>
              )}
            </section>

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
                rows={3}
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
                  rows={3}
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
                  rows={3}
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
                rows={3}
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
                    updateField(
                      "output_type",
                      event.target.value as SOPOutputType,
                    )
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
                disabled={generateDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {loading
                  ? "Processing..."
                  : provider === "local"
                    ? "Generate with Our Server"
                    : "Generate with External AI"}
              </button>
            </div>
          </form>
        </section>

        {provider === "local" && job && (
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
                Generated using{" "}
                <strong>
                  {provider === "local"
                    ? "Scholars Republic AI Server"
                    : "External AI via Puter.js"}
                </strong>
                . Use this as a starting draft and personalize it before
                submission.
              </p>

              {provider === "local" &&
                job?.elapsed_seconds !== undefined &&
                job?.elapsed_seconds !== null && (
                  <p className="mt-2 text-xs text-ink/50">
                    Generated in {job.elapsed_seconds} seconds.
                  </p>
                )}

              {provider === "puter" && puterUsage && (
                <p className="mt-2 text-xs text-ink/50">{puterUsage}</p>
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

          <div className="mt-5 min-h-[300px] rounded-2xl border border-ink/10 bg-cream/40 p-5 text-sm leading-7 text-ink">
            {loading || isWaiting ? (
              "Your SOP request is being processed. Please keep this page open. The result will appear here when ready."
            ) : provider === "local" && job?.status === "failed" ? (
              job.error_message ||
              "The AI server is currently offline. Please switch to External AI."
            ) : result ? (
              <FormattedSOPText text={result} />
            ) : (
              "Your generated SOP will appear here after you submit the form."
            )}
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
