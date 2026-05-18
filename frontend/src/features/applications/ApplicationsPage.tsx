"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowRight, CalendarDays, ClipboardCheck } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import { getApplication, getApplicationSummary, getApplications } from "@/lib/api";
import {
  getApplicationDeadline,
  getApplicationReadinessScore,
  getDaysUntil,
} from "@/features/applications/application-utils";
import {
  QUICK_FILTER_OPTIONS,
  TRACKER_QUICK_FILTER_VALUES,
  TRACKER_SORT_OPTIONS,
  type QuickFilter,
  type TrackerSort,
} from "@/features/applications/application-options";
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

function getDateTime(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function getPriorityWeight(priority: ApplicationPriority) {
  if (priority === "high") {
    return 0;
  }

  if (priority === "medium") {
    return 1;
  }

  return 2;
}

function sortApplications(
  applications: OpportunityApplication[],
  sortMode: TrackerSort,
) {
  return [...applications].sort((first, second) => {
    if (sortMode === "deadline") {
      return getDateTime(getApplicationDeadline(first)) - getDateTime(getApplicationDeadline(second));
    }

    if (sortMode === "priority") {
      return (
        getPriorityWeight(first.priority) - getPriorityWeight(second.priority) ||
        getDateTime(getApplicationDeadline(first)) - getDateTime(getApplicationDeadline(second))
      );
    }

    if (sortMode === "updated") {
      return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
    }

    if (sortMode === "readiness") {
      return getApplicationReadinessScore(second) - getApplicationReadinessScore(first);
    }

    const firstDeadlineDays = getDaysUntil(getApplicationDeadline(first));
    const secondDeadlineDays = getDaysUntil(getApplicationDeadline(second));

    const firstUrgency =
      firstDeadlineDays === null
        ? 50
        : firstDeadlineDays < 0
          ? -100 + firstDeadlineDays
          : firstDeadlineDays <= 7
            ? firstDeadlineDays
            : 20 + firstDeadlineDays;

    const secondUrgency =
      secondDeadlineDays === null
        ? 50
        : secondDeadlineDays < 0
          ? -100 + secondDeadlineDays
          : secondDeadlineDays <= 7
            ? secondDeadlineDays
            : 20 + secondDeadlineDays;

    return (
      firstUrgency - secondUrgency ||
      getPriorityWeight(first.priority) - getPriorityWeight(second.priority) ||
      new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime()
    );
  });
}

function applicationMatchesQuickFilter(
  application: OpportunityApplication,
  quickFilter: QuickFilter,
) {
  const activeDeadline =
    application.personal_deadline || application.opportunity_detail.deadline;
  const daysUntilDeadline = getDaysUntil(activeDeadline);

  if (quickFilter === "all") {
    return true;
  }

  if (quickFilter === "due_soon") {
    return daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7;
  }

  if (quickFilter === "overdue") {
    return daysUntilDeadline !== null && daysUntilDeadline < 0;
  }

  if (quickFilter === "high_priority") {
    return application.priority === "high";
  }

  if (quickFilter === "missing_sop") {
    return !application.latest_sop_draft;
  }

  if (quickFilter === "sop_ready") {
    return Boolean(application.latest_sop_draft);
  }

  if (quickFilter === "reminder_today") {
    return getDaysUntil(application.reminder_at) === 0;
  }

  if (quickFilter === "no_next_step") {
    return !application.next_step.trim();
  }

  if (quickFilter === "needs_work") {
    return getApplicationReadinessScore(application) < 45;
  }

  if (quickFilter === "ready") {
    return getApplicationReadinessScore(application) >= 75;
  }

  return true;
}

function readQuickFilterFromUrl(): QuickFilter {
  if (typeof window === "undefined") {
    return "all";
  }

  const view = new URLSearchParams(window.location.search).get("view");

  if (TRACKER_QUICK_FILTER_VALUES.includes(view as QuickFilter)) {
    return view as QuickFilter;
  }

  return "all";
}

function readApplicationIdFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get("application");
  const applicationId = Number(value);

  return Number.isFinite(applicationId) && applicationId > 0 ? applicationId : null;
}

function ApplicationTrackerContent() {
  const [applications, setApplications] = useState<OpportunityApplicationResponse | null>(null);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
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
      ...(search ? { search } : {}),
    }),
    [priorityFilter, search, statusFilter],
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

        <section className="rounded-2xl border border-pine/10 bg-white px-2.5 py-1.5 shadow-soft">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
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
                      : "border-ink/10 bg-cream/40 text-ink/60 hover:border-pine/30 hover:bg-pine/5 hover:text-pine"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1 text-[9px] leading-4 ${
                      active ? "bg-white/20 text-white" : "bg-white text-ink/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <span className="mx-0.5 hidden h-4 w-px bg-ink/10 sm:inline-block" />

            <label className="ml-0.5 inline-flex h-6 items-center gap-1 rounded-full border border-ink/10 bg-cream/40 px-2 text-[11px] font-semibold text-ink/60">
              Sort
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as TrackerSort)}
                className="bg-transparent text-[11px] font-semibold text-ink outline-none"
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

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-ink/70">Loading applications...</CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && applicationItems.length === 0 ? (
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

        {!loading && !error && applicationItems.length > 0 && visibleApplicationItems.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center text-sm font-semibold text-ink/55 shadow-soft">
            No applications match this quick filter.
          </div>
        ) : null}

        {!loading && !error && visibleApplicationItems.length > 0 ? (
          <div className="grid gap-4">
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
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-pine">
                <CalendarDays size={18} aria-hidden="true" />
                <h2 className="font-semibold text-ink">Upcoming personal deadlines</h2>
              </div>
              <ul className="mt-4 grid gap-2 text-sm text-ink/70">
                {summary.upcoming_deadlines.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-skyglass px-4 py-3">
                    {item.opportunity_detail.title}: {formatDate(item.personal_deadline)}
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
