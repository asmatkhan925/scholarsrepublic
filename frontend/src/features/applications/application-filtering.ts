import {
  getApplicationDeadline,
  getApplicationReadinessScore,
  getDaysUntil,
} from "@/features/applications/application-utils";
import type { QuickFilter, TrackerSort } from "@/features/applications/application-options";
import { TRACKER_QUICK_FILTER_VALUES } from "@/features/applications/application-options";
import type { ApplicationPriority, OpportunityApplication } from "@/types/opportunity";

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

export function sortApplications(
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

export function applicationMatchesQuickFilter(
  application: OpportunityApplication,
  quickFilter: QuickFilter,
) {
  const activeDeadline = application.personal_deadline || application.opportunity_detail.deadline;
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

export function readQuickFilterFromUrl(): QuickFilter {
  if (typeof window === "undefined") {
    return "all";
  }

  const view = new URLSearchParams(window.location.search).get("view");

  if (TRACKER_QUICK_FILTER_VALUES.includes(view as QuickFilter)) {
    return view as QuickFilter;
  }

  return "all";
}

export function readApplicationIdFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get("application");
  const applicationId = Number(value);

  return Number.isFinite(applicationId) && applicationId > 0 ? applicationId : null;
}
