"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  BookmarkCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Search,
  Trash2,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  deleteApplication,
  getApplicationSummary,
  getApplications,
  patchApplication,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  ApplicationPriority,
  ApplicationStatus,
  ApplicationSummary,
  ChecklistItem,
  OpportunityApplication,
  OpportunityApplicationResponse,
  UpdateApplicationPayload,
} from "@/types/opportunity";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "preparing", label: "Preparing" },
  { value: "documents_pending", label: "Documents Pending" },
  { value: "documents_ready", label: "Documents Ready" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "result_waiting", label: "Result Waiting" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "deferred", label: "Deferred" },
];

const PRIORITY_OPTIONS: { value: ApplicationPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

type QuickFilter = "all" | "due_soon" | "overdue" | "high_priority" | "missing_sop" | "sop_ready";

const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due_soon", label: "Due soon" },
  { value: "overdue", label: "Overdue" },
  { value: "high_priority", label: "High priority" },
  { value: "missing_sop", label: "Missing SOP" },
  { value: "sop_ready", label: "SOP ready" },
];

const DEFAULT_APPLICATION_CHECKLIST: ChecklistItem[] = [
  { label: "Review eligibility requirements", done: false },
  { label: "Prepare SOP", done: false },
  { label: "Prepare CV", done: false },
  { label: "Collect transcripts", done: false },
  { label: "Request recommendation letters", done: false },
  { label: "Prepare passport/CNIC or ID documents", done: false },
  { label: "Submit application before deadline", done: false },
];

function getInitialChecklist(application: OpportunityApplication): ChecklistItem[] {
  const existing = application.checklist_snapshot ?? [];

  if (existing.length > 0) {
    return existing.map((item) => ({
      label: item.label,
      done: Boolean(item.done),
    }));
  }

  return DEFAULT_APPLICATION_CHECKLIST.map((item) => ({ ...item }));
}

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function toDateTimePayload(value: string) {
  return value ? `${value}T09:00:00` : null;
}

function getStatusTone(
  status: ApplicationStatus,
): "mint" | "saffron" | "sky" | "danger" | "neutral" {
  if (status === "selected") {
    return "mint";
  }

  if (status === "applied" || status === "interview" || status === "result_waiting") {
    return "sky";
  }

  if (status === "documents_pending" || status === "preparing") {
    return "saffron";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "danger";
  }

  return "neutral";
}

function getPriorityTone(priority: ApplicationPriority): "mint" | "saffron" | "danger" {
  if (priority === "high") {
    return "danger";
  }

  if (priority === "medium") {
    return "saffron";
  }

  return "mint";
}

function getDaysUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  const deadline = new Date(value);
  const diff = deadline.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDeadlineTone(value: string | null): "mint" | "saffron" | "danger" | "sky" {
  const days = getDaysUntil(value);

  if (days === null) {
    return "sky";
  }

  if (days < 0) {
    return "danger";
  }

  if (days <= 7) {
    return "saffron";
  }

  return "mint";
}

function getDeadlineStatusText(value: string | null) {
  const days = getDaysUntil(value);

  if (days === null) {
    return "No deadline set";
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

function getStatusGuidance(status: ApplicationStatus, hasSopDraft: boolean) {
  if (status === "preparing") {
    return hasSopDraft
      ? "Review your SOP, complete documents, and set a personal deadline."
      : "Create your SOP draft, prepare documents, and set a personal deadline.";
  }

  if (status === "documents_pending") {
    return "Focus on missing documents, recommendations, and final SOP review.";
  }

  if (status === "documents_ready") {
    return "Check the official portal and prepare to submit before the deadline.";
  }

  if (status === "applied") {
    return "Record your submitted date and set a reminder to follow up.";
  }

  if (status === "interview") {
    return "Prepare interview notes and review your SOP before the interview.";
  }

  if (status === "result_waiting") {
    return "Track the expected decision date and keep backup applications active.";
  }

  if (status === "selected") {
    return "Record the decision date and prepare admission, visa, and funding steps.";
  }

  if (status === "rejected") {
    return "Record the decision date, note lessons learned, and focus on the next option.";
  }

  return "";
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

  return true;
}

function ApplicationCard({
  application,
  onUpdated,
  onDeleted,
}: {
  application: OpportunityApplication;
  onUpdated: (application: OpportunityApplication) => void;
  onDeleted: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [statusValue, setStatusValue] = useState(application.status);
  const [priority, setPriority] = useState(application.priority);
  const [nextStep, setNextStep] = useState(application.next_step);
  const [notes, setNotes] = useState(application.notes);
  const [personalDeadline, setPersonalDeadline] = useState(
    toDateInputValue(application.personal_deadline),
  );
  const [reminderDate, setReminderDate] = useState(toDateInputValue(application.reminder_at));
  const [submittedDate, setSubmittedDate] = useState(toDateInputValue(application.submitted_at));
  const [decisionDate, setDecisionDate] = useState(toDateInputValue(application.decision_at));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    getInitialChecklist(application),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const opportunity = application.opportunity_detail;
  const provider =
    opportunity.provider_name ||
    opportunity.university_name ||
    opportunity.company_name ||
    "Provider not listed";
  const detailHref =
    opportunity.opportunity_type === "scholarship"
      ? `/scholarships/${opportunity.slug}`
      : "/scholarships";
  const activeDeadline = application.personal_deadline || opportunity.deadline;
  const deadlineTone = getDeadlineTone(activeDeadline);
  const degreeTags = opportunity.degree_levels.slice(0, 2);
  const extraDegreeCount = Math.max(opportunity.degree_levels.length - degreeTags.length, 0);
  const latestSopDraft = application.latest_sop_draft;
  const completedChecklistCount = checklist.filter((item) => item.done).length;
  const deadlineStatusText = getDeadlineStatusText(activeDeadline);
  const statusGuidance = getStatusGuidance(statusValue, Boolean(latestSopDraft));

  function toggleChecklistItem(index: number) {
    setChecklist((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, done: !item.done } : item,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload: UpdateApplicationPayload = {
      status: statusValue,
      priority,
      next_step: nextStep,
      notes,
      personal_deadline: personalDeadline || null,
      reminder_at: toDateTimePayload(reminderDate),
      submitted_at: toDateTimePayload(submittedDate),
      decision_at: toDateTimePayload(decisionDate),
      checklist_snapshot: checklist,
    };

    try {
      const updated = await patchApplication(application.id, payload);
      onUpdated(updated);
      setMessage("Application updated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Stop tracking "${opportunity.title}"?`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      await deleteApplication(application.id);
      onDeleted(application.id);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDeleting(false);
    }
  }

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-0">
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={getStatusTone(statusValue)}>{humanize(statusValue)}</Badge>
                <Badge tone={getPriorityTone(priority)}>{humanize(priority)} priority</Badge>
                <Badge tone={deadlineTone}>{deadlineStatusText}</Badge>
                <Badge tone={latestSopDraft ? "mint" : "saffron"}>
                  {latestSopDraft ? "SOP ready" : "SOP missing"}
                </Badge>
                <Badge tone="neutral">
                  {completedChecklistCount}/{checklist.length} checklist
                </Badge>
              </div>

              <h2 className="mt-3 text-lg font-bold leading-snug text-ink md:text-xl">
                {opportunity.title}
              </h2>

              <p className="mt-1 text-sm leading-6 text-ink/65">
                {provider} · {opportunity.country || "Country not listed"}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">{humanize(opportunity.opportunity_type)}</Badge>
                <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
                {degreeTags.map((degree) => (
                  <Badge key={degree} tone="neutral">
                    {degree}
                  </Badge>
                ))}
                {extraDegreeCount > 0 ? <Badge tone="neutral">+{extraDegreeCount} more</Badge> : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                size="sm"
                variant={expanded ? "ghost" : "outline"}
              >
                {expanded ? "Hide details" : "Edit details"}
              </Button>
            </div>
          </div>

          {!expanded ? (
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <div className="rounded-2xl border border-pine/10 bg-cream/35 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/35">
                  Deadline
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{formatDate(activeDeadline)}</p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-cream/35 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/35">
                  Next step
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-ink/70">
                  {nextStep || "No next step added"}
                </p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-cream/35 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/35">
                  SOP
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-ink/70">
                  {latestSopDraft ? latestSopDraft.title : "No SOP draft yet"}
                </p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-cream/35 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/35">
                  Checklist
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {completedChecklistCount}/{checklist.length} completed
                </p>
              </div>
            </div>
          ) : null}

          {expanded ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_18rem]">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Status
                  <select
                    value={statusValue}
                    onChange={(event) => setStatusValue(event.target.value as ApplicationStatus)}
                    className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Priority
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as ApplicationPriority)}
                    className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-ink md:col-span-2">
                  Next step
                  <input
                    value={nextStep}
                    onChange={(event) => setNextStep(event.target.value)}
                    className="rounded-2xl border border-pine/15 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
                    placeholder="Example: prepare SOP, upload documents, email professor..."
                  />
                </label>

                {statusGuidance ? (
                  <div className="rounded-2xl border border-saffron/25 bg-saffron/10 px-4 py-3 text-sm leading-6 text-ink/70 md:col-span-2">
                    <strong className="text-ink">Suggested next action:</strong> {statusGuidance}
                  </div>
                ) : null}

                <label className="grid gap-2 text-sm font-semibold text-ink md:col-span-2">
                  Application notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="min-h-24 rounded-2xl border border-pine/15 bg-cream/35 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:bg-white focus:ring-2 focus:ring-pine/10"
                    placeholder="Keep useful notes here: document gaps, portal links, professor replies, essay reminders, or submission details..."
                  />
                  <span className="text-xs font-normal leading-5 text-ink/45">
                    Keep this short and practical so you know the next action when you return.
                  </span>
                </label>

                <div className="rounded-2xl border border-pine/10 bg-white p-3 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
                        <ClipboardCheck size={15} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">Application checklist</p>
                        <p className="text-xs text-ink/50">
                          {completedChecklistCount}/{checklist.length} completed
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-cream px-2 py-1 text-[11px] font-semibold text-ink/55">
                      Save changes to keep progress
                    </span>
                  </div>

                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {checklist.map((item, index) => (
                      <label
                        key={`${item.label}-${index}`}
                        className="flex min-w-0 cursor-pointer items-start gap-2 rounded-xl border border-ink/10 bg-cream/30 px-2.5 py-2 text-xs text-ink transition hover:bg-cream/60"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleChecklistItem(index)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-ink/20 text-pine focus:ring-pine/20"
                        />
                        <span
                          className={
                            item.done ? "min-w-0 text-ink/50 line-through" : "min-w-0 text-ink"
                          }
                        >
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-mint/35 p-3">
                <div className="rounded-2xl border border-pine/10 bg-white p-2.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
                      <CalendarDays size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                        Deadline
                      </p>
                      <p className="mt-1 text-xs font-bold text-ink">{formatDate(activeDeadline)}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-ink/60">
                        {deadlineStatusText}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-pine/10 bg-cream/35 p-2.5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/35">
                      Timeline
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1 text-xs font-semibold text-ink">
                        Personal
                        <input
                          type="date"
                          value={personalDeadline}
                          onChange={(event) => setPersonalDeadline(event.target.value)}
                          className="h-8 rounded-xl border border-pine/15 bg-white px-2 text-xs text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-semibold text-ink">
                        Reminder
                        <input
                          type="date"
                          value={reminderDate}
                          onChange={(event) => setReminderDate(event.target.value)}
                          className="h-8 rounded-xl border border-pine/15 bg-white px-2 text-xs text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-semibold text-ink">
                        Submitted
                        <input
                          type="date"
                          value={submittedDate}
                          onChange={(event) => setSubmittedDate(event.target.value)}
                          className="h-8 rounded-xl border border-pine/15 bg-white px-2 text-xs text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-semibold text-ink">
                        Decision
                        <input
                          type="date"
                          value={decisionDate}
                          onChange={(event) => setDecisionDate(event.target.value)}
                          className="h-8 rounded-xl border border-pine/15 bg-white px-2 text-xs text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-pine/10 bg-cream/50 p-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-pine">
                        <FileText size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">
                          SOP draft
                        </p>
                        {latestSopDraft ? (
                          <>
                            <p className="mt-1 truncate text-sm font-bold text-ink">
                              {latestSopDraft.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-ink/55">
                              Latest draft saved. Review it before submission.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="mt-1 text-sm font-bold text-ink">No SOP draft yet</p>
                            <p className="mt-1 text-xs leading-5 text-ink/55">
                              Create a draft for this scholarship from the SOP tool.
                            </p>
                          </>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {latestSopDraft ? (
                            <ButtonLink
                              href={`/dashboard/ai/sop/history?draft=${latestSopDraft.id}`}
                              size="sm"
                              variant="outline"
                            >
                              Open SOP draft
                            </ButtonLink>
                          ) : null}
                          <ButtonLink href="/dashboard/ai/sop" size="sm" variant="outline">
                            Create SOP
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <ButtonLink href={detailHref} className="w-full" size="sm" variant="outline">
                      Scholarship details
                      <ArrowRight size={15} aria-hidden="true" />
                    </ButtonLink>

                    <Button className="w-full" disabled={saving} onClick={handleSave} size="sm">
                      <ClipboardCheck size={15} aria-hidden="true" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>

                    <Button
                      className="w-full"
                      disabled={deleting}
                      onClick={handleDelete}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {deleting ? "Stopping..." : "Stop Tracking"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {message ? <p className="mt-3 text-sm font-semibold text-pine">{message}</p> : null}
          {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationsSummaryHeader({
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
      <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
              Student dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Application Tracker
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-ink/65 xl:whitespace-nowrap">
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

      <div className="grid divide-y divide-pine/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
        {[
          ["Total", total, "Tracked"],
          ["Preparing", preparing, "In progress"],
          ["Applied", applied, "Submitted"],
          ["Waiting", waiting, "Results"],
          ["Selected", selected, "Success"],
        ].map(([label, value, helper]) => (
          <div key={label} className="px-4 py-4 md:px-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">{label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
            <p className="mt-1 text-xs text-ink/50">{helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-t border-pine/10 bg-[#f7faf8] p-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Search
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="w-full rounded-2xl border border-pine/15 bg-white py-3 pl-9 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
              placeholder="Search title, country, notes..."
            />
          </div>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Status
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilter(event.target.value)}
            className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Priority
          <select
            value={priorityFilter}
            onChange={(event) => onPriorityFilter(event.target.value)}
            className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
          >
            <option value="">All priorities</option>
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

function ApplicationTrackerContent() {
  const [applications, setApplications] = useState<OpportunityApplicationResponse | null>(null);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
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
    let mounted = true;

    async function loadApplications() {
      setLoading(true);
      setError(null);

      try {
        const [applicationData, summaryData] = await Promise.all([
          getApplications(query),
          getApplicationSummary(),
        ]);

        if (mounted) {
          setApplications(applicationData);
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
  const visibleApplicationItems = applicationItems.filter((application) =>
    applicationMatchesQuickFilter(application, quickFilter),
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
      <div className="space-y-5">
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

        <section className="rounded-2xl border border-pine/10 bg-white p-3 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-[0.16em] text-ink/35">
              Quick view
            </span>
            {QUICK_FILTER_OPTIONS.map((option) => {
              const active = quickFilter === option.value;
              const count = quickFilterCounts[option.value] ?? 0;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setQuickFilter(option.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-pine bg-pine text-white"
                      : "border-ink/10 bg-cream/40 text-ink/65 hover:border-pine/30 hover:bg-pine/5 hover:text-pine"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-white text-ink/45"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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
                key={application.id}
                application={application}
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
