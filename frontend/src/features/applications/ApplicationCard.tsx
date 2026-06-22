"use client";

import { useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import { deleteApplication, patchApplication } from "@/lib/api";
import {
  getDaysUntil,
  getReadinessLabel,
  getReadinessTone,
} from "@/features/applications/application-utils";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "@/features/applications/application-options";
import {
  areChecklistLabelsSimilar,
  getInitialChecklist,
  normalizeChecklistLabel,
} from "@/features/applications/application-checklist";
import { getErrorMessage } from "@/lib/errors";
import type {
  ApplicationPriority,
  ApplicationStatus,
  ChecklistItem,
  OpportunityApplication,
  UpdateApplicationPayload,
} from "@/types/opportunity";

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

// Pipeline stages: each entry lists the statuses that belong to that stage
const PIPELINE_STAGES: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: "Preparing", statuses: ["preparing", "documents_pending", "documents_ready"] },
  { label: "Applied", statuses: ["applied"] },
  { label: "In Review", statuses: ["interview", "result_waiting"] },
  { label: "Decision", statuses: ["selected", "rejected", "withdrawn", "deferred"] },
];

const TERMINAL_POSITIVE: ApplicationStatus[] = ["selected"];
const TERMINAL_NEGATIVE: ApplicationStatus[] = ["rejected", "withdrawn"];

function StatusPipeline({ status }: { status: ApplicationStatus }) {
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.statuses.includes(status));
  const isPositive = TERMINAL_POSITIVE.includes(status);
  const isNegative = TERMINAL_NEGATIVE.includes(status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-0.5">
      {PIPELINE_STAGES.map((stage, idx) => {
        const isDone = idx < currentStageIndex;
        const isActive = idx === currentStageIndex;
        const isLast = idx === PIPELINE_STAGES.length - 1;

        let dotClass = "h-2 w-2 shrink-0 rounded-full border ";
        let labelClass = "text-[10px] font-semibold leading-none ";
        let lineClass = "h-px flex-1 min-w-[16px] mx-1 ";

        if (isDone) {
          dotClass += "border-pine bg-pine";
          labelClass += "text-pine/70 dark:text-pine/60";
          lineClass += "bg-pine/40";
        } else if (isActive) {
          if (isPositive) {
            dotClass += "border-pine bg-pine ring-2 ring-pine/30";
            labelClass += "text-pine font-bold";
          } else if (isNegative) {
            dotClass += "border-red-500 bg-red-500 ring-2 ring-red-300/40";
            labelClass += "text-red-500 font-bold dark:text-red-400";
          } else {
            dotClass += "border-saffron bg-saffron ring-2 ring-saffron/30";
            labelClass += "text-saffron font-bold";
          }
          lineClass += "bg-pine/15";
        } else {
          dotClass += "border-ink/15 bg-transparent dark:border-white/15";
          labelClass += "text-ink/35 dark:text-white/30";
          lineClass += "bg-ink/10 dark:bg-white/10";
        }

        return (
          <div key={stage.label} className="flex min-w-0 items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className={dotClass} />
              <span className={labelClass}>{stage.label}</span>
            </div>
            {!isLast && <div className={lineClass} />}
          </div>
        );
      })}
    </div>
  );
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

function getNextStepSuggestions(
  status: ApplicationStatus,
  hasSopDraft: boolean,
  completedChecklistCount: number,
  checklistLength: number,
) {
  const suggestionsByStatus: Record<ApplicationStatus, string[]> = {
    preparing: [
      hasSopDraft ? "Review SOP draft and prepare final version" : "Create SOP draft",
      "Collect transcripts and certificates",
      "Request recommendation letters",
      "Set a personal deadline",
    ],
    documents_pending: [
      "Finish missing checklist documents",
      "Add Google Drive links for prepared documents",
      "Request pending recommendation letters",
      "Review scholarship requirements again",
    ],
    documents_ready: [
      "Review all documents before submission",
      "Open official application portal",
      "Prepare final SOP and CV files",
      "Submit application before deadline",
    ],
    applied: [
      "Record application submission details",
      "Set a follow-up reminder",
      "Save portal login/reference information in notes",
      "Prepare backup scholarship applications",
    ],
    interview: [
      "Prepare interview answers",
      "Review SOP before interview",
      "Collect questions for interviewer",
      "Set interview reminder",
    ],
    result_waiting: [
      "Check result announcement timeline",
      "Set decision follow-up reminder",
      "Keep backup applications active",
      "Update notes with expected result date",
    ],
    selected: [
      "Record decision date",
      "Prepare admission and visa steps",
      "Check funding acceptance instructions",
      "Save offer details in notes",
    ],
    rejected: [
      "Record decision date",
      "Note lessons learned",
      "Shortlist next scholarship options",
      "Improve SOP for next application",
    ],
    withdrawn: [
      "Record reason for withdrawal",
      "Archive important notes",
      "Focus on active applications",
    ],
    deferred: [
      "Confirm deferred timeline",
      "Set next follow-up reminder",
      "Update documents if required",
    ],
  };

  const suggestions = suggestionsByStatus[status] ?? [];

  if (checklistLength > 0 && completedChecklistCount < checklistLength) {
    return suggestions;
  }

  return suggestions.filter((suggestion) => !suggestion.toLowerCase().includes("missing checklist"));
}

export function ApplicationCard({
  application,
  defaultExpanded = false,
  highlighted = false,
  onUpdated,
  onDeleted,
}: {
  application: OpportunityApplication;
  defaultExpanded?: boolean;
  highlighted?: boolean;
  onUpdated: (application: OpportunityApplication) => void;
  onDeleted: (id: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
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
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!defaultExpanded && !highlighted) {
      return;
    }

    setExpanded(true);

    window.setTimeout(() => {
      cardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);
  }, [application.id, defaultExpanded, highlighted]);

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
  const linkedChecklistCount = checklist.filter((item) => item.url?.trim()).length;
  const checklistReadiness = checklist.length
    ? Math.round((completedChecklistCount / checklist.length) * 40)
    : 0;
  const readinessScore = Math.min(
    100,
    checklistReadiness +
      (latestSopDraft ? 20 : 0) +
      (linkedChecklistCount > 0 ? 10 : 0) +
      (activeDeadline ? 10 : 0) +
      (nextStep.trim() ? 10 : 0) +
      (statusValue !== "preparing" ? 10 : 0),
  );
  const readinessTone = getReadinessTone(readinessScore);
  const readinessLabel = getReadinessLabel(readinessScore);
  const missingRequiredDocuments = (application.required_documents ?? []).filter((document) => {
    const normalizedDocument = normalizeChecklistLabel(document);

    return (
      normalizedDocument &&
      !checklist.some((item) => areChecklistLabelsSimilar(item.label, document))
    );
  });
  const deadlineStatusText = getDeadlineStatusText(activeDeadline);
  const statusGuidance = getStatusGuidance(statusValue, Boolean(latestSopDraft));
  const nextStepSuggestions = getNextStepSuggestions(
    statusValue,
    Boolean(latestSopDraft),
    completedChecklistCount,
    checklist.length,
  );

  function toggleChecklistItem(index: number) {
    setChecklist((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function addChecklistItem() {
    const label = newChecklistItem.trim();

    if (!label) {
      return;
    }

    setChecklist((current) => {
      const alreadyExists = current.some((item) =>
        areChecklistLabelsSimilar(item.label, label),
      );

      if (alreadyExists) {
        return current;
      }

      return [...current, { label, done: false, url: "" }];
    });

    setNewChecklistItem("");
  }

  function removeChecklistItem(index: number) {
    setChecklist((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addRequiredDocumentsToChecklist() {
    setChecklist((current) => {
      const documentsToAdd = (application.required_documents ?? []).filter((document) => {
        const normalizedDocument = normalizeChecklistLabel(document);

        return (
          normalizedDocument &&
          !current.some((item) => areChecklistLabelsSimilar(item.label, document))
        );
      });

      if (!documentsToAdd.length) {
        return current;
      }

      return [
        ...current,
        ...documentsToAdd.map((document) => ({
          label: document,
          done: false,
          url: "",
        })),
      ];
    });
  }

  function updateChecklistItemUrl(index: number, url: string) {
    setChecklist((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, url } : item)),
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
    <div ref={cardRef}>
      <Card
        className={`overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${
          highlighted ? "ring-2 ring-pine/25" : ""
        }`}
      >
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
                <Badge tone={linkedChecklistCount > 0 ? "mint" : "neutral"}>
                  {linkedChecklistCount} link{linkedChecklistCount === 1 ? "" : "s"}
                </Badge>
                <Badge tone={readinessTone}>{readinessScore}% ready</Badge>
              </div>

              <div className="mt-3">
                <StatusPipeline status={statusValue} />
              </div>

              <h2 className="mt-2.5 text-lg font-bold leading-snug text-ink md:text-xl">
                {opportunity.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm leading-6 text-ink/65">
                <Badge tone="neutral">{humanize(opportunity.opportunity_type)}</Badge>
                <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
                {degreeTags.map((degree) => (
                  <Badge key={degree} tone="neutral">
                    {degree}
                  </Badge>
                ))}
                {extraDegreeCount > 0 ? <Badge tone="neutral">+{extraDegreeCount} more</Badge> : null}
                <span className="mx-0.5 text-ink/25">·</span>
                <span className="min-w-0 font-medium text-ink/65">
                  {provider} · {opportunity.country || "Country not listed"}
                </span>
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
                  Documents
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {completedChecklistCount}/{checklist.length} done
                </p>
                <p className="mt-0.5 text-xs font-semibold text-ink/45">
                  {linkedChecklistCount} Drive/document link{linkedChecklistCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ) : null}

          {!expanded ? (
            <div className="mt-2 rounded-2xl border border-pine/10 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink">
                  Readiness: {readinessLabel}
                </p>
                <p className="text-xs font-semibold text-ink/55">{readinessScore}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full bg-pine transition-all"
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-5 text-ink/45">
                Based on checklist progress, SOP, Drive/document links, deadline, status, and next step.
              </p>
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

                <div className="grid gap-2 md:col-span-2 sm:grid-cols-[7rem_1fr] sm:items-center">
                  <label
                    htmlFor={`next-step-${application.id}`}
                    className="flex items-center gap-2 text-sm font-semibold text-ink"
                  >
                    Next step
                    {statusGuidance ? (
                      <span className="group relative inline-flex cursor-help items-center rounded-full border border-saffron/25 bg-saffron/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink/45">
                        Tip
                        <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-xl border border-saffron/25 bg-white p-2 text-xs font-medium normal-case leading-5 tracking-normal text-ink/70 shadow-soft group-hover:block">
                          {statusGuidance}
                        </span>
                      </span>
                    ) : null}
                  </label>
                  <div>
                    <input
                      id={`next-step-${application.id}`}
                      list={`next-step-suggestions-${application.id}`}
                      value={nextStep}
                      onChange={(event) => setNextStep(event.target.value)}
                      className="h-9 w-full rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
                      placeholder="Write or choose a suggested next step..."
                    />
                    <datalist id={`next-step-suggestions-${application.id}`}>
                      {nextStepSuggestions.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                  </div>
                </div>

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
                          {completedChecklistCount}/{checklist.length} completed · {linkedChecklistCount} link{linkedChecklistCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {missingRequiredDocuments.length > 0 ? (
                        <button
                          type="button"
                          onClick={addRequiredDocumentsToChecklist}
                          className="inline-flex items-center gap-1 rounded-full bg-pine px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-pine/90"
                        >
                          <Plus size={12} aria-hidden="true" />
                          Add official docs ({missingRequiredDocuments.length})
                        </button>
                      ) : null}
                      <span className="rounded-full bg-cream px-2 py-1 text-[11px] font-semibold text-ink/55">
                        Save changes to keep progress
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={newChecklistItem}
                      onChange={(event) => setNewChecklistItem(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addChecklistItem();
                        }
                      }}
                      placeholder="Add item, e.g. Upload study plan"
                      className="h-9 min-w-0 flex-1 rounded-xl border border-pine/15 bg-cream/30 px-3 text-xs text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:bg-white focus:ring-2 focus:ring-pine/10"
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-pine px-3 text-xs font-semibold text-white transition hover:bg-pine/90"
                    >
                      <Plus size={14} aria-hidden="true" />
                      Add item
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-ink/45">
                    Keep documents in your own Drive. Paste restricted Google Drive or document links here; Scholars Republic will only store the link.
                    {application.required_documents?.length ? (
                      <span className="font-semibold text-pine">
                        {" "}Official docs available from this scholarship.
                      </span>
                    ) : null}
                  </p>

                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {checklist.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="min-w-0 rounded-xl border border-ink/10 bg-cream/30 px-2.5 py-2 text-xs text-ink transition hover:bg-cream/60"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
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

                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open saved link for ${item.label}`}
                              className="shrink-0 rounded-lg px-1.5 py-1 text-pine transition hover:bg-pine/10"
                            >
                              <ExternalLink size={13} aria-hidden="true" />
                            </a>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => removeChecklistItem(index)}
                            aria-label={`Remove checklist item ${item.label}`}
                            className="shrink-0 rounded-lg px-1.5 py-1 text-ink/35 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>

                        <input
                          type="url"
                          value={item.url || ""}
                          onChange={(event) => updateChecklistItemUrl(index, event.target.value)}
                          placeholder="Optional Google Drive/document link"
                          className="mt-2 h-7 w-full rounded-lg border border-pine/10 bg-white px-2 text-[11px] text-ink outline-none transition placeholder:text-ink/30 focus:border-pine focus:ring-2 focus:ring-pine/10"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-mint/35 p-3">
                <div className="mb-3 rounded-2xl border border-pine/10 bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/35">
                        Readiness
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink">
                        {readinessScore}% · {readinessLabel}
                      </p>
                    </div>
                    <Badge tone={readinessTone}>{readinessScore}%</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream">
                    <div
                      className="h-full rounded-full bg-pine transition-all"
                      style={{ width: `${readinessScore}%` }}
                    />
                  </div>
                </div>

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
    </div>
  );
}
