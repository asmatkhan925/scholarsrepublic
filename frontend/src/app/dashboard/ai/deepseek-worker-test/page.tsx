"use client";

import { isAxiosError } from "axios";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteHeader } from "@/components/site-header";
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

type DesktopJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

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

const terminalStatuses: DesktopJobStatus[] = ["completed", "failed", "canceled"];

function getLimitPayload(error: unknown): ApiLimitErrorResponse | null {
  if (!isAxiosError<ApiLimitErrorResponse>(error)) {
    return null;
  }

  return error.response?.data ?? null;
}

export default function DeepSeekWorkerTestPage() {
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusResponse | null>(
    null,
  );
  const [workerLoading, setWorkerLoading] = useState(true);
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
          getErrorMessage(statusError) ??
          "AI worker status could not be loaded.",
      });
    } finally {
      setWorkerLoading(false);
    }
  }, []);

  const loadJobStatus = useCallback(async (jobId: number) => {
    const response = await api.get<DesktopJobResponse>(
      `/desktop-automation/jobs/${jobId}/`,
    );
    setJob(response.data);
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

  const workerOnline = workerStatus?.online ?? false;
  const jobIsProcessing =
    job?.status === "queued" || job?.status === "running";
  const cooldownActive = cooldownRemainingSeconds > 0;

  return (
    <ProtectedRoute>
      <SiteHeader />

      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              AI tools
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              DeepSeek Desktop Worker Test
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This internal page checks the secure desktop worker pipeline. It
              queues a DeepSeek job, polls the backend, and shows the completed
              response or the safe unavailable message.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Worker status
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {workerLoading
                    ? "Checking worker availability..."
                    : workerStatus?.message}
                </p>
              </div>

              <div
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  workerOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {workerLoading
                  ? "Checking"
                  : workerOnline
                    ? "Online"
                    : "Unavailable"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadWorkerStatus()}
              className="mt-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Refresh status
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <label className="block text-sm font-semibold text-slate-800">
              Test prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                maxLength={4000}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>{prompt.length}/4000 characters</span>
              {jobIsProcessing && <span>Polling every 3 seconds...</span>}
              {cooldownActive && (
                <span>Try again in {cooldownRemainingSeconds}s</span>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                jobIsProcessing ||
                cooldownActive ||
                !prompt.trim() ||
                !workerOnline
              }
              className="mt-5 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : jobIsProcessing
                  ? "Waiting for current job..."
                  : cooldownActive
                    ? `Wait ${cooldownRemainingSeconds}s`
                    : "Send test prompt"}
            </button>

            {!workerOnline && !workerLoading && (
              <p className="mt-3 text-sm text-amber-700">
                The AI worker is not available right now. Start the WSL worker
                and refresh this page.
              </p>
            )}
          </form>

          {job && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Job #{job.id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Status:{" "}
                    <span className="font-semibold capitalize text-slate-900">
                      {job.status}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadJobStatus(job.id)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Refresh job
                </button>
              </div>

              <div
                className={`mt-5 rounded-2xl border px-4 py-4 text-sm leading-6 ${
                  job.status === "completed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : job.status === "failed"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{job.user_message}</p>
              </div>

              <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Raw result payload
                </summary>
                <pre className="mt-3 overflow-x-auto text-xs leading-5 text-slate-700">
                  {JSON.stringify(job.result_payload, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
