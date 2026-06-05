"use client";

import { Badge } from "@/components/ui";
import type { ChecklistItem, ContextStatus } from "./import-utils";

export function ContextStatusItem({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: ContextStatus;
}) {
  const statusLabel =
    status === "loading"
      ? "Loading"
      : status === "loaded"
        ? `${count} loaded`
        : status === "error"
          ? "Unavailable"
          : "Pending";
  const dotClass =
    status === "loaded"
      ? "bg-pine"
      : status === "error"
        ? "bg-saffron"
        : "bg-ink/25 dark:bg-white/25";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#101214]">
      <span className="min-w-0 text-xs font-semibold text-ink/60 dark:text-white/55">{label}</span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink/70 dark:text-white/65">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        {statusLabel}
      </span>
    </div>
  );
}

export function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#101214]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 text-ink/75 dark:text-white/68">
        {value || "Not provided"}
      </p>
    </div>
  );
}

export function PreviewList({
  label,
  items,
  emptyLabel = "Not provided",
  tone = "neutral",
}: {
  label: string;
  items: string[];
  emptyLabel?: string;
  tone?: "mint" | "saffron" | "sky" | "neutral" | "danger";
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#101214]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} tone={tone}>
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-semibold text-ink/45 dark:text-white/40">{emptyLabel}</p>
      )}
    </div>
  );
}

export function CompletenessChecklist({ items }: { items: ChecklistItem[] }) {
  const completeCount = items.filter((item) => item.complete).length;

  return (
    <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink dark:text-white">Completeness checklist</p>
          <p className="text-xs font-semibold text-ink/50 dark:text-white/45">
            {completeCount} of {items.length} recommended fields detected before creating the review
            draft.
          </p>
        </div>
        <Badge tone={completeCount === items.length ? "mint" : "saffron"}>
          {completeCount === items.length ? "Looks complete" : "Needs review"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-xl border border-pine/10 bg-white px-2.5 py-2 text-xs font-semibold text-ink/65 dark:border-white/10 dark:bg-[#101214] dark:text-white/60"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${item.complete ? "bg-pine" : "bg-saffron"}`}
              aria-hidden="true"
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
