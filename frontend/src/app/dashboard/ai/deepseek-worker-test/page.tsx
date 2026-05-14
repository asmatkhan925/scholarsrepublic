"use client";

import { isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  TerminalSquare,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type WorkerStatusResponse = {
  online: boolean;
  status: "online" | "offline" | string;
  message: string;
};

type CreateDeepSeekJobResponse = {
  job_id: number;
  status: DesktopJobStatus;
  message: string;
  poll_url: string;
};

type ApiLimitErrorResponse = {
  detail?: string;
  status?: string;
  retry_after_seconds?: number;
};

type DesktopJobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

type DesktopJobResponse = {
  id: number;
  kind: string;
  status: DesktopJobStatus;
  ok: boolean | null;
  text: string;
  user_message: string;
  result_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
};

type WorkerState = "checking" | "online" | "offline";

const terminalStatuses: DesktopJobStatus[] = ["completed", "failed", "canceled"];
const allJobStatuses: DesktopJobStatus[] = ["queued", "running", "completed", "failed", "canceled"];

function getLimitPayload(error: unknown): ApiLimitErrorResponse | null {
  if (!isAxiosError<ApiLimitErrorResponse>(error)) {
    return null;
  }

  return error.response?.data ?? null;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getWorkerState(workerLoading: boolean, workerStatus: WorkerStatusResponse | null) {
  if (workerLoading) {
    return "checking";
  }

  return workerStatus?.online ? "online" : "offline";
}

function getWorkerBadgeClasses(workerState: WorkerState) {
  if (workerState === "online") {
    return "border-pine/20 bg-pine/10 text-pine";
  }

  if (workerState === "checking") {
    return "border-saffron/30 bg-saffron/10 text-ink/70";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function getJobBadgeClasses(status: DesktopJobStatus) {
  if (status === "completed") {
    return "border-pine/20 bg-pine/10 text-pine";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "canceled") {
    return "border-saffron/30 bg-saffron/10 text-ink/70";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function getResultPanelClasses(status: DesktopJobStatus | null) {
  if (status === "completed") {
    return "border-pine/20 bg-pine/5 text-ink";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (status === "canceled") {
    return "border-saffron/30 bg-saffron/10 text-ink/70";
  }

  return "border-ink/10 bg-cream/40 text-ink/70";
}

function WorkerStatusIcon({ workerState }: { workerState: WorkerState }) {
  if (workerState === "online") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }

  if (workerState === "checking") {
    return <Loader2 size={18} className="animate-spin" aria-hidden="true" />;
  }

  return <XCircle size={18} aria-hidden="true" />;
}

function JobStatusIcon({ status }: { status: DesktopJobStatus }) {
  if (status === "completed") {
    return <CheckCircle2 size={17} aria-hidden="true" />;
  }

  if (status === "failed") {
    return <XCircle size={17} aria-hidden="true" />;
  }

  if (status === "canceled") {
    return <AlertTriangle size={17} aria-hidden="true" />;
  }

  if (status === "running") {
    return <Loader2 size={17} className="animate-spin" aria-hidden="true" />;
  }

  return <Clock3 size={17} aria-hidden="true" />;
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  );
}

function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/40">{label}</p>
      <p className="mt-2 text-sm font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink/55">{helper}</p>
    </div>
  );
}

function JobStateRail({ currentStatus }: { currentStatus: DesktopJobStatus | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {allJobStatuses.map((status) => {
        const active = status === currentStatus;

        return (
          <div
            key={status}
            className={`rounded-2xl border px-3 py-2 text-center text-xs font-bold capitalize transition ${
              active
                ? getJobBadgeClasses(status)
                : "border-ink/10 bg-white text-ink/35"
            }`}
          >
            {status}
          </div>
        );
      })}
    </div>
  );
}

export default function DeepSeekWorkerTestPage() {
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusResponse | null>(null);
  const [workerLoading, setWorkerLoading] = useState(true);
  const [workerCheckedAt, setWorkerCheckedAt] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    "Reply with exactly one sentence: Scholars Republic DeepSeek worker test is working.",
  );
  const [job, setJob] = useState<DesktopJobResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);

  const loadWorkerStatus = useCallback(async () => {
    setWorkerLoading(true);
    try {
      const response = await api.get<WorkerStatusResponse>(
        "/desktop-automation/workers/status/",
      );
      setWorkerStatus(response.data);
    } catch (statusError) {
      setWorkerStatus({
        online: false,
        status: "offline",
        message:
          getErrorMessage(statusError) ?? "AI worker status could not be loaded.",
      });
    } finally {
      setWorkerCheckedAt(new Date().toISOString());
      setWorkerLoading(false);
    }
  }, []);

  const loadJobStatus = useCallback(async (jobId: number) => {
    try {
      const response = await api.get<DesktopJobResponse>(
        `/desktop-automation/jobs/${jobId}/`,
      );
      setJob(response.data);
    } catch (jobError) {
      setError(getErrorMessage(jobError) ?? "Could not refresh the job status.");
    }
  }, []);

  useEffect(() => {
    void loadWorkerStatus();
  }, [loadWorkerStatus]);

  useEffect(() => {
    if (!job || terminalStatuses.includes(job.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadJobStatus(job.id);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [job, loadJobStatus]);

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cooldownRemainingSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedPrompt = prompt.trim();
    if (!cleanedPrompt) {
      setError("Please enter a prompt.");
      return;
    }

    setError(null);
    setSubmitting(true);
    setJob(null);

    try {
      const response = await api.post<CreateDeepSeekJobResponse>(
        "/desktop-automation/deepseek-jobs/",
        {
          query: cleanedPrompt,
        },
      );

      setCooldownRemainingSeconds(0);

      const queuedJob: DesktopJobResponse = {
        id: response.data.job_id,
        kind: "deepseek_query",
        status: response.data.status,
        ok: null,
        text: response.data.message,
        user_message: response.data.message,
        result_payload: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        claimed_at: null,
        completed_at: null,
        failed_at: null,
      };

      setJob(queuedJob);
      await loadJobStatus(response.data.job_id);
    } catch (submitError) {
      const limitPayload = getLimitPayload(submitError);
      const retryAfter = limitPayload?.retry_after_seconds ?? 0;

      if (retryAfter > 0) {
        setCooldownRemainingSeconds(retryAfter);
      }

      setError(
        limitPayload?.detail ??
          getErrorMessage(submitError) ??
          "Could not submit the DeepSeek worker job.",
      );

      await loadWorkerStatus();
    } finally {
      setSubmitting(false);
    }
  }

  const workerState = getWorkerState(workerLoading, workerStatus);
  const workerOnline = workerState === "online";
  const jobIsProcessing = job?.status === "queued" || job?.status === "running";
  const cooldownActive = cooldownRemainingSeconds > 0;
  const promptIsEmpty = prompt.trim().length === 0;

  const submitDisabled =
    submitting || jobIsProcessing || cooldownActive || promptIsEmpty || !workerOnline;

  const workerLabel =
    workerState === "checking"
      ? "Checking"
      : workerState === "online"
        ? "Online"
        : "Offline / unavailable";

  const submitHelp = useMemo(() => {
    if (workerState === "checking") {
      return "Submit unlocks after the worker status check finishes.";
    }

    if (!workerOnline) {
      return "Start the WSL worker, refresh status, then submit a test prompt.";
    }

    if (cooldownActive) {
      return `Backend cooldown active. Try again in ${formatCountdown(
        cooldownRemainingSeconds,
      )}.`;
    }

    if (jobIsProcessing) {
      return "Current job is still queued or running. Polling continues every 3 seconds.";
    }

    if (promptIsEmpty) {
      return "Enter a prompt before submitting a DeepSeek worker job.";
    }

    return "Ready to queue one DeepSeek desktop worker test job.";
  }, [
    cooldownActive,
    cooldownRemainingSeconds,
    jobIsProcessing,
    promptIsEmpty,
    workerOnline,
    workerState,
  ]);

  const resultText = useMemo(() => {
    if (!job) {
      return "Submit a test prompt to see the worker response here.";
    }

    if (job.status === "completed") {
      return job.text?.trim() || job.user_message?.trim() || "No response is available.";
    }

    return job.user_message?.trim() || job.text?.trim() || "No response is available.";
  }, [job]);

  return (
    <ProtectedRoute>
      <DashboardShell
        title="DeepSeek Worker Test"
        description="Internal desktop worker dashboard for checking the DeepSeek queue, worker availability, and safe job responses."
        hideHeader
      >
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
            <div className="border-b border-ink/10 bg-gradient-to-r from-pine/10 via-white to-saffron/10 px-5 py-5 md:px-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-pine">
                    <TerminalSquare size={14} aria-hidden="true" />
                    Internal AI operations
                  </div>

                  <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                    DeepSeek desktop worker dashboard
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/65">
                    Use this protected page to verify the desktop automation path. It checks worker
                    availability, queues one DeepSeek request through Django, polls the job status,
                    and shows the public-safe response returned by the backend.
                  </p>
                </div>

                <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-4 text-sm leading-6 text-ink/70 lg:max-w-sm">
                  <div className="flex gap-3">
                    <ShieldAlert
                      size={19}
                      className="mt-0.5 shrink-0 text-saffron"
                      aria-hidden="true"
                    />
                    <p>
                      This is an internal test surface. Do not paste secrets, API keys, private
                      credentials, or sensitive student data into the prompt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
                      <Server size={14} aria-hidden="true" />
                      Worker status
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-ink">
                      Desktop worker availability
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
                      {workerLoading
                        ? "Checking whether a recent worker heartbeat is available..."
                        : workerStatus?.message}
                    </p>
                  </div>

                  <StatusPill className={getWorkerBadgeClasses(workerState)}>
                    <WorkerStatusIcon workerState={workerState} />
                    {workerLabel}
                  </StatusPill>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <MetricTile
                    label="Availability"
                    value={workerLabel}
                    helper="Backend heartbeat status for the worker queue."
                  />
                  <MetricTile
                    label="Last checked"
                    value={formatTime(workerCheckedAt)}
                    helper="Local browser time for the latest status check."
                  />
                  <MetricTile
                    label="Submit gate"
                    value={workerOnline ? "Open" : "Blocked"}
                    helper="Submit is blocked unless the worker is online."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void loadWorkerStatus()}
                  disabled={workerLoading}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={workerLoading ? "animate-spin" : ""}
                    aria-hidden="true"
                  />
                  Refresh status
                </button>
              </section>

              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                      <PlayCircle size={14} aria-hidden="true" />
                      Queue test
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-ink">Submit a DeepSeek prompt</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
                      The form sends one prompt to the desktop automation queue and then follows the
                      resulting job until it completes, fails, or is canceled.
                    </p>
                  </div>
                </div>

                <label className="mt-5 grid gap-2 text-sm font-semibold text-ink">
                  Test prompt
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={7}
                    maxLength={4000}
                    className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal leading-7 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                  />
                </label>

                <div className="mt-3 flex flex-col gap-2 text-xs text-ink/55 sm:flex-row sm:items-center sm:justify-between">
                  <span>{prompt.length}/4000 characters</span>
                  <span>{submitHelp}</span>
                </div>

                {error ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    <div className="flex gap-2">
                      <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <p>{error}</p>
                        {cooldownActive ? (
                          <p className="mt-2 font-semibold">
                            Countdown: {formatCountdown(cooldownRemainingSeconds)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-cream/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-ink/65">
                    Submit is disabled while the worker is offline, the prompt is empty, a job is
                    queued/running, or the backend has returned a cooldown.
                  </p>

                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send size={18} aria-hidden="true" />
                    )}
                    {submitting
                      ? "Submitting..."
                      : jobIsProcessing
                        ? "Waiting for job"
                        : cooldownActive
                          ? `Wait ${formatCountdown(cooldownRemainingSeconds)}`
                          : "Send test prompt"}
                  </button>
                </div>
              </form>

              <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
                      <Clock3 size={14} aria-hidden="true" />
                      Current job
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-ink">
                      {job ? `Job #${job.id}` : "No active test job"}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
                      {jobIsProcessing
                        ? "This page is polling every 3 seconds while the job is queued or running."
                        : job
                          ? "Polling has stopped because this job reached a terminal state."
                          : "Submit a prompt to create a DeepSeek desktop worker job."}
                    </p>
                  </div>

                  {job ? (
                    <StatusPill className={getJobBadgeClasses(job.status)}>
                      <JobStatusIcon status={job.status} />
                      {job.status}
                    </StatusPill>
                  ) : null}
                </div>

                <div className="mt-5">
                  <JobStateRail currentStatus={job?.status ?? null} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <MetricTile
                    label="Created"
                    value={formatTime(job?.created_at ?? null)}
                    helper="When the backend accepted the test request."
                  />
                  <MetricTile
                    label="Updated"
                    value={formatTime(job?.updated_at ?? null)}
                    helper="Latest status timestamp from the backend."
                  />
                  <MetricTile
                    label="Completed"
                    value={formatTime(job?.completed_at ?? job?.failed_at ?? null)}
                    helper="Terminal timestamp when available."
                  />
                </div>

                <div
                  className={`mt-5 rounded-2xl border p-5 text-sm leading-7 ${getResultPanelClasses(
                    job?.status ?? null,
                  )}`}
                >
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/45">
                    <TerminalSquare size={14} aria-hidden="true" />
                    Worker response
                  </div>
                  <p className="whitespace-pre-wrap">{resultText}</p>
                </div>

                {job ? (
                  <details className="mt-4 rounded-2xl border border-ink/10 bg-cream/40 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-ink">
                      Raw result payload
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-white p-4 text-xs leading-5 text-ink/70">
                      {JSON.stringify(job.result_payload, null, 2)}
                    </pre>
                  </details>
                ) : null}

                {job ? (
                  <button
                    type="button"
                    onClick={() => void loadJobStatus(job.id)}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    Refresh job
                  </button>
                ) : null}
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
                <div className="inline-flex items-center gap-2 rounded-full bg-saffron/15 px-3 py-1 text-xs font-semibold text-ink/70">
                  <AlertTriangle size={14} aria-hidden="true" />
                  Operational notes
                </div>

                <h2 className="mt-3 text-lg font-bold text-ink">Worker recovery checklist</h2>

                <div className="mt-4 grid gap-3 text-sm leading-6 text-ink/65">
                  <div className="rounded-2xl border border-ink/10 bg-cream/40 p-4">
                    <p>
                      If worker is offline, start WSL and run{" "}
                      <code className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-ink">
                        scholars-worker
                      </code>
                      .
                    </p>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-cream/40 p-4">
                    <p>
                      If DeepSeek logs out, use option{" "}
                      <code className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-ink">
                        7
                      </code>{" "}
                      in the WSL menu.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-cream/40 p-4">
                    <p>
                      If jobs are stuck, run stale job recovery on production from the backend:
                    </p>
                    <code className="mt-2 block overflow-x-auto rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink">
                      python manage.py recover_stale_desktop_jobs
                    </code>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-pine/15 bg-pine/5 p-5 shadow-soft">
                <div className="flex gap-3">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-bold text-ink">Safety behavior</h2>
                    <p className="mt-2 text-sm leading-6 text-ink/65">
                      The page keeps the queue single-flight in this browser view, respects backend
                      cooldowns, and stops polling after completed, failed, or canceled jobs.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
