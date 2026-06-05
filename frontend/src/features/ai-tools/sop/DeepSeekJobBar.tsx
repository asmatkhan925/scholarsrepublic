"use client";

import { Clock, Users } from "lucide-react";

import { getDeepSeekProcessingLabel } from "./sop-utils";
import type { DeepSeekJobResponse } from "./types";

type DeepSeekJobBarProps = {
  job: DeepSeekJobResponse;
  isWaiting: boolean;
  error: string | null;
  onCancel: () => void;
};

export function DeepSeekJobBar({ job, isWaiting, error, onCancel }: DeepSeekJobBarProps) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-pine/15 bg-pine/5 p-3 shadow-soft dark:border-pine/20 dark:bg-pine/10 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-pine dark:bg-white/5">
          <Users size={14} aria-hidden="true" />
          Server 3
        </span>
        <span className="font-bold capitalize text-ink dark:text-white">
          {job.status === "running" ? "Processing now" : job.status}
        </span>
        <span className="text-ink/45">&middot;</span>
        <span className="text-ink/65 dark:text-white/58">{getDeepSeekProcessingLabel(job)}</span>
        {job.queue_position && job.queue_position > 0 ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink/60 dark:bg-white/5 dark:text-white/55">
            Position #{job.queue_position}
          </span>
        ) : null}
      </div>

      {isWaiting ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pine">
            <Clock size={14} aria-hidden="true" />
            Keep open
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-400/25 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            Cancel
          </button>
        </div>
      ) : job.status === "failed" || job.status === "canceled" ? (
        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
          {error ||
            job.user_message ||
            job.text ||
            "Your Server 3 request could not be completed."}
        </span>
      ) : null}
    </section>
  );
}
