"use client";

import { Bell, BookmarkCheck, Search } from "lucide-react";

import { ButtonLink } from "@/components/ui";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  type QuickFilter,
} from "@/features/applications/application-options";

export function ApplicationsSummaryHeader({
  total,
  preparing,
  applied,
  waiting,
  selected,
  onSearch,
  search,
  statusFilter,
  priorityFilter,
  onStatusFilter,
  onPriorityFilter,
}: {
  total: number;
  preparing: number;
  applied: number;
  waiting: number;
  selected: number;
  search: string;
  statusFilter: string;
  priorityFilter: string;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onPriorityFilter: (value: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft">
      <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-3 py-3 md:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
              Student dashboard
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink md:text-2xl">
              Application Tracker
            </h1>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-ink/60 xl:whitespace-nowrap">
              Track statuses, deadlines, notes, and priorities from preparation to results.
            </p>
          </div>

          <ButtonLink
            href="/dashboard/saved"
            className="w-full whitespace-nowrap border-pine/20 bg-white text-pine shadow-sm hover:bg-mint sm:w-auto"
            size="sm"
            variant="outline"
          >
            <BookmarkCheck size={15} aria-hidden="true" />
            Add from Saved
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-y divide-pine/10 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {[
          ["Total", total],
          ["Prep", preparing],
          ["Applied", applied],
          ["Waiting", waiting],
          ["Selected", selected],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/35">
              {label}
            </p>
            <p className="text-base font-bold leading-none text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-1.5 border-t border-pine/10 bg-[#f7faf8] p-2 md:grid-cols-[1.45fr_0.75fr_0.75fr]">
        <label className="grid gap-0.5 text-[11px] font-semibold text-ink/70">
          Search
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/35"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="h-8 w-full rounded-lg border border-pine/15 bg-white pl-7 pr-2 text-xs text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
              placeholder="Search..."
            />
          </div>
        </label>

        <label className="grid gap-0.5 text-[11px] font-semibold text-ink/70">
          Status
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilter(event.target.value)}
            className="h-8 rounded-lg border border-pine/15 bg-white px-2 text-xs text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-0.5 text-[11px] font-semibold text-ink/70">
          Priority
          <select
            value={priorityFilter}
            onChange={(event) => onPriorityFilter(event.target.value)}
            className="h-8 rounded-lg border border-pine/15 bg-white px-2 text-xs text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
          >
            <option value="">All</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export function TrackerAlertsPanel({
  overdue,
  dueSoon,
  remindersToday,
  missingNextStep,
  onSelectQuickFilter,
}: {
  overdue: number;
  dueSoon: number;
  remindersToday: number;
  missingNextStep: number;
  onSelectQuickFilter: (filter: QuickFilter) => void;
}) {
  const alerts = [
    {
      label: "Overdue",
      value: overdue,
      helper: "past deadline",
      filter: "overdue" as QuickFilter,
    },
    {
      label: "Due soon",
      value: dueSoon,
      helper: "next 7 days",
      filter: "due_soon" as QuickFilter,
    },
    {
      label: "Reminders",
      value: remindersToday,
      helper: "today",
      filter: "reminder_today" as QuickFilter,
    },
    {
      label: "Need step",
      value: missingNextStep,
      helper: "missing action",
      filter: "no_next_step" as QuickFilter,
    },
  ];

  const hasAlerts = alerts.some((alert) => alert.value > 0);

  return (
    <section className="rounded-2xl border border-pine/10 bg-white px-3 py-2 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink/40">
          <Bell size={14} aria-hidden="true" />
          {hasAlerts ? "Action alerts" : "Clear today"}
        </span>

        {alerts.map((alert) => (
          <button
            key={alert.label}
            type="button"
            onClick={() => onSelectQuickFilter(alert.filter)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
              alert.value > 0
                ? "border-saffron/30 bg-saffron/10 text-ink hover:border-pine/30 hover:bg-pine/5"
                : "border-ink/10 bg-cream/35 text-ink/55 hover:border-pine/20 hover:text-pine"
            }`}
          >
            <span>{alert.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                alert.value > 0 ? "bg-white text-pine" : "bg-white text-ink/45"
              }`}
            >
              {alert.value}
            </span>
            <span className="hidden text-[11px] font-medium text-ink/45 sm:inline">
              {alert.helper}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
