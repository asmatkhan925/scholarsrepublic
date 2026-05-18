import type { OpportunityApplication } from "@/types/opportunity";

export type ReadinessTone = "mint" | "saffron" | "danger";

export function getDaysUntil(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const today = new Date();
  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diff = deadline.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getApplicationDeadline(application: OpportunityApplication) {
  return application.personal_deadline || application.opportunity_detail.deadline;
}

export function getApplicationReadinessScore(application: OpportunityApplication) {
  const checklist = application.checklist_snapshot ?? [];
  const completedChecklistCount = checklist.filter((item) => item.done).length;
  const linkedChecklistCount = checklist.filter((item) => item.url?.trim()).length;
  const checklistReadiness = checklist.length
    ? Math.round((completedChecklistCount / checklist.length) * 40)
    : 0;

  return Math.min(
    100,
    checklistReadiness +
      (application.latest_sop_draft ? 20 : 0) +
      (linkedChecklistCount > 0 ? 10 : 0) +
      (getApplicationDeadline(application) ? 10 : 0) +
      (application.next_step.trim() ? 10 : 0) +
      (application.status !== "preparing" ? 10 : 0),
  );
}

export function getReadinessTone(score: number): ReadinessTone {
  if (score >= 75) {
    return "mint";
  }

  if (score >= 45) {
    return "saffron";
  }

  return "danger";
}

export function getReadinessLabel(score: number) {
  if (score >= 75) {
    return "Strong";
  }

  if (score >= 45) {
    return "In progress";
  }

  return "Needs work";
}

export function getDeadlineLabel(value: string | null | undefined) {
  const days = getDaysUntil(value);

  if (days === null) {
    return "No deadline";
  }

  if (days < 0) {
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "Due tomorrow";
  }

  return `Due in ${days} days`;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "No deadline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
