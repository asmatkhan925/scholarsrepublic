"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowRight, CalendarDays, ClipboardCheck } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import { getApplication, getApplicationSummary, getApplications } from "@/lib/api";
import { getDaysUntil } from "@/features/applications/application-utils";
import {
  QUICK_FILTER_OPTIONS,
  TRACKER_SORT_OPTIONS,
  type QuickFilter,
  type TrackerSort,
} from "@/features/applications/application-options";
import {
  applicationMatchesQuickFilter,
  readApplicationIdFromUrl,
  readQuickFilterFromUrl,
  sortApplications,
} from "@/features/applications/application-filtering";
import { getErrorMessage } from "@/lib/errors";
import { ApplicationCard } from "./ApplicationCard";
import { ApplicationsSummaryHeader, TrackerAlertsPanel } from "./ApplicationTrackerHeader";
import type {
  ApplicationPriority,
  ApplicationStatus,
  ApplicationSummary,
  OpportunityApplication,
  OpportunityApplicationResponse,
} from "@/types/opportunity";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

function ApplicationTrackerContent() {
  const [applications, setApplications] = useState<OpportunityApplicationResponse | null>(null);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => readQuickFilterFromUrl());
  const [targetApplicationId, setTargetApplicationId] = useState<number | null>(() =>
    readApplicationIdFromUrl(),
  );
  const [sortMode, setSortMode] = useState<TrackerSort>("smart");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter as ApplicationStatus } : {}),
      ...(priorityFilter ? { priority: priorityFilter as ApplicationPriority } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [debouncedSearch, priorityFilter, statusFilter],
  );

  useEffect(() => {
    function syncQuickFilterFromUrl() {
      setQuickFilter(readQuickFilterFromUrl());
      setTargetApplicationId(readApplicationIdFromUrl());
    }

    syncQuickFilterFromUrl();
    window.addEventListener("popstate", syncQuickFilterFromUrl);

    return () => {
      window.removeEventListener("popstate", syncQuickFilterFromUrl);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadApplications() {
      setLoading(true);
      setError(null);

      try {
        const currentTargetApplicationId = readApplicationIdFromUrl();

        const [applicationData, summaryData, targetApplication] = await Promise.all([
          getApplications(query),
          getApplicationSummary(),
          currentTargetApplicationId
            ? getApplication(currentTargetApplicationId).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (mounted) {
          setTargetApplicationId(currentTargetApplicationId);

          const results =
            targetApplication &&
            !applicationData.results.some((application) => application.id === targetApplication.id)
              ? [targetApplication, ...applicationData.results]
              : applicationData.results;

          setApplications({
            ...applicationData,
            results,
          });
          setSummary(summaryData);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      mounted = false;
    };
  }, [query]);

  function handleUpdated(updated: OpportunityApplication) {
    setApplications((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        results: current.results.map((item) => (item.id === updated.id ? updated : item)),
      };
    });
  }

  function handleDeleted(id: number) {
    setApplications((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        count: Math.max(current.count - 1, 0),
        results: current.results.filter((item) => item.id !== id),
      };
    });

    setSummary((current) =>
      current
        ? {
            ...current,
            total: Math.max(current.total - 1, 0),
          }
        : current,
    );
  }

  const applicationItems = applications?.results ?? [];
  const trackerAlerts = {
    overdue: applicationItems.filter(
      (application) =>
        getDaysUntil(application.personal_deadline || application.opportunity_detail.deadline) !==
          null &&
        getDaysUntil(application.personal_deadline || application.opportunity_detail.deadline)! < 0,
    ).length,
    dueSoon: applicationItems.filter((application) => {
      const daysUntilDeadline = getDaysUntil(
        application.personal_deadline || application.opportunity_detail.deadline,
      );
      return daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7;
    }).length,
    remindersToday: applicationItems.filter((application) => getDaysUntil(application.reminder_at) === 0)
      .length,
    missingNextStep: applicationItems.filter((application) => !application.next_step.trim()).length,
  };
  const filteredApplicationItems = applicationItems.filter((application) =>
    applicationMatchesQuickFilter(application, quickFilter),
  );
  const targetApplication = targetApplicationId
    ? applicationItems.find((application) => application.id === targetApplicationId)
    : undefined;
  const visibleApplicationItems = sortApplications(
    targetApplication && !filteredApplicationItems.some((item) => item.id === targetApplication.id)
      ? [targetApplication, ...filteredApplicationItems]
      : filteredApplicationItems,
    sortMode,
  );
  const quickFilterCounts = QUICK_FILTER_OPTIONS.reduce(
    (totals, option) => ({
      ...totals,
      [option.value]: applicationItems.filter((application) =>
        applicationMatchesQuickFilter(application, option.value),
      ).length,
    }),
    {} as Record<QuickFilter, number>,
  );
  const counts = summary?.counts_by_status;
  const hasAnyTrackedApplications = (summary?.total ?? 0) > 0;
  const hasActiveFilters = Boolean(
    statusFilter || priorityFilter || search.trim() || quickFilter !== "all",
  );

  function clearTrackerFilters() {
    setStatusFilter("");
    setPriorityFilter("");
    setSearch("");
    setQuickFilter("all");
    setSortMode("smart");
  }

  function humanizeFilterValue(value: string) {
    return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const activeFilterItems = [
    search.trim()
      ? {
          label: "Search",
          value: search.trim(),
          onClear: () => setSearch(""),
        }
      : null,
    statusFilter
      ? {
          label: "Status",
          value: humanizeFilterValue(statusFilter),
          onClear: () => setStatusFilter(""),
        }
      : null,
    priorityFilter
      ? {
          label: "Priority",
          value: humanizeFilterValue(priorityFilter),
          onClear: () => setPriorityFilter(""),
        }
      : null,
    quickFilter !== "all"
      ? {
          label: "View",
          value:
            QUICK_FILTER_OPTIONS.find((option) => option.value === quickFilter)?.label ??
            humanizeFilterValue(quickFilter),
          onClear: () => setQuickFilter("all"),
        }
      : null,
  ].filter(
    (item): item is { label: string; value: string; onClear: () => void } => Boolean(item),
  );

  return (
    <DashboardShell
      description="Track the opportunities you are preparing, applied to, or waiting for."
      hideHeader
      title="Application Tracker"
    >
      <div className="space-y-3">
        <ApplicationsSummaryHeader
          applied={counts?.applied ?? 0}
          onPriorityFilter={setPriorityFilter}
          onSearch={setSearch}
          onStatusFilter={setStatusFilter}
          preparing={counts?.preparing ?? 0}
          priorityFilter={priorityFilter}
          search={search}
          selected={counts?.selected ?? 0}
          statusFilter={statusFilter}
          total={summary?.total ?? 0}
          waiting={counts?.result_waiting ?? 0}
        />

        {!loading && !error && applicationItems.length > 0 ? (
          <TrackerAlertsPanel
            dueSoon={trackerAlerts.dueSoon}
            missingNextStep={trackerAlerts.missingNextStep}
            onSelectQuickFilter={setQuickFilter}
            overdue={trackerAlerts.overdue}
            remindersToday={trackerAlerts.remindersToday}
          />
        ) : null}

        <section className="rounded-2xl border border-pine/10 bg-white px-2.5 py-1.5 shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
              View
            </span>
            {QUICK_FILTER_OPTIONS.map((option) => {
              const active = quickFilter === option.value;
              const count = quickFilterCounts[option.value] ?? 0;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setQuickFilter(option.value)}
                  className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition ${
                    active
                      ? "border-pine bg-pine text-white"
                      : "border-ink/10 bg-cream/40 text-ink/60 hover:border-pine/30 hover:bg-pine/5 hover:text-pine dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1 text-[9px] leading-4 ${
                      active ? "bg-white/20 text-white" : "bg-white text-ink/40 dark:bg-white/10 dark:text-white/45"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <span className="mx-0.5 hidden h-4 w-px bg-ink/10 dark:bg-white/10 sm:inline-block" />

            <label className="ml-0.5 inline-flex h-6 items-center gap-1 rounded-full border border-ink/10 bg-cream/40 px-2 text-[11px] font-semibold text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              Sort
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as TrackerSort)}
                className="bg-transparent text-[11px] font-semibold text-ink outline-none dark:text-white"
              >
                {TRACKER_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {hasAnyTrackedApplications && hasActiveFilters ? (
          <section className="rounded-2xl border border-pine/10 bg-white px-2.5 py-1.5 shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-ink/55 dark:text-white/50">
                <span className="font-bold text-ink dark:text-white">
                  {visibleApplicationItems.length}
                </span>
                /{summary?.total ?? applicationItems.length} shown
              </span>

              {activeFilterItems.map((item) => (
                <button
                  key={`${item.label}-${item.value}`}
                  type="button"
                  onClick={item.onClear}
                  className="inline-flex h-6 items-center gap-1 rounded-full border border-pine/15 bg-pine/5 px-2 text-[11px] font-semibold text-pine transition hover:bg-pine/10 dark:border-pine/25 dark:bg-pine/10"
                  aria-label={`Remove ${item.label} filter`}
                >
                  <span className="text-ink/50 dark:text-white/50">{item.label}:</span>
                  <span>{item.value}</span>
                  <span aria-hidden="true" className="text-pine/70">
                    ×
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={clearTrackerFilters}
                className="inline-flex h-6 items-center justify-center rounded-full bg-pine px-2.5 text-[11px] font-semibold text-white transition hover:bg-pine/90"
              >
                Clear
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-6 text-sm text-ink/70 dark:text-white/60">Loading applications...</CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && !hasAnyTrackedApplications ? (
          <EmptyState
            action={
              <ButtonLink href="/scholarships">
                Browse Scholarships
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description="Start tracking from a saved opportunity or a scholarship detail page. Your applications will appear here."
            icon={<ClipboardCheck size={22} aria-hidden="true" />}
            title="You are not tracking any applications yet"
          />
        ) : null}

        {!loading && !error && hasAnyTrackedApplications && visibleApplicationItems.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-5 text-center shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
            <p className="text-sm font-bold text-ink dark:text-white">
              No applications match the selected filters.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/55 dark:text-white/55">
              {hasActiveFilters
                ? "Try clearing the search, status, priority, or quick view filter."
                : "Try a different tracker view or sort option."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearTrackerFilters}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && visibleApplicationItems.length > 0 ? (
          <div className="grid gap-3">
            {visibleApplicationItems.map((application) => (
              <ApplicationCard
                key={`${application.id}-${targetApplicationId === application.id ? "target" : "normal"}`}
                application={application}
                defaultExpanded={targetApplicationId === application.id}
                highlighted={targetApplicationId === application.id}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        ) : null}

        {summary && summary.upcoming_deadlines.length > 0 ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-pine">
                <CalendarDays size={17} aria-hidden="true" />
                <h2 className="font-semibold text-ink dark:text-white">Upcoming personal deadlines</h2>
              </div>
              <ul className="mt-3 grid gap-1.5 text-sm text-ink/70 dark:text-white/60">
                {summary.upcoming_deadlines.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-0.5 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-semibold text-ink dark:text-white">
                      {item.opportunity_detail.title}
                    </span>
                    <span className="text-xs font-bold text-pine">
                      {formatDate(item.personal_deadline)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function ApplicationsPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <ApplicationTrackerContent />
    </ProtectedRoute>
  );
}
