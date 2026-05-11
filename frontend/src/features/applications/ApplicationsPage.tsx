"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  BookmarkCheck,
  CalendarDays,
  ClipboardCheck,
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

function ApplicationCard({
  application,
  onUpdated,
  onDeleted,
}: {
  application: OpportunityApplication;
  onUpdated: (application: OpportunityApplication) => void;
  onDeleted: (id: number) => void;
}) {
  const [statusValue, setStatusValue] = useState(application.status);
  const [priority, setPriority] = useState(application.priority);
  const [nextStep, setNextStep] = useState(application.next_step);
  const [notes, setNotes] = useState(application.notes);
  const [personalDeadline, setPersonalDeadline] = useState(
    toDateInputValue(application.personal_deadline),
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
  const deadlineTone = getDeadlineTone(application.personal_deadline || opportunity.deadline);
  const activeDeadline = application.personal_deadline || opportunity.deadline;
  const degreeTags = opportunity.degree_levels.slice(0, 2);
  const extraDegreeCount = Math.max(opportunity.degree_levels.length - degreeTags.length, 0);

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
        <div className="grid gap-0 xl:grid-cols-[1fr_19rem]">
          <div className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getStatusTone(statusValue)}>{humanize(statusValue)}</Badge>
              <Badge tone={getPriorityTone(priority)}>{humanize(priority)} priority</Badge>
              <Badge tone={deadlineTone}>{formatDate(activeDeadline)}</Badge>
            </div>

            <h2 className="mt-3 text-lg font-bold leading-snug text-ink md:text-xl">
              {opportunity.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {provider} · {opportunity.country || "Country not listed"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">{humanize(opportunity.opportunity_type)}</Badge>
              <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
              {degreeTags.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {extraDegreeCount > 0 ? <Badge tone="neutral">+{extraDegreeCount} more</Badge> : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
            </div>
          </div>

          <div className="border-t border-pine/10 bg-mint/35 p-4 xl:border-l xl:border-t-0">
            <div className="rounded-2xl border border-pine/10 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                    Deadline
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">{formatDate(activeDeadline)}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/50">
                    Personal deadline overrides official deadline.
                  </p>
                </div>
              </div>

              <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
                Personal deadline
                <input
                  type="date"
                  value={personalDeadline}
                  onChange={(event) => setPersonalDeadline(event.target.value)}
                  className="rounded-2xl border border-pine/15 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-pine/15 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
                  placeholder="Links, document notes, professor replies..."
                />
              </label>

              <div className="mt-4 grid gap-2">
                <Button className="w-full" disabled={saving} onClick={handleSave} size="sm">
                  <ClipboardCheck size={15} aria-hidden="true" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>

                <ButtonLink href={detailHref} className="w-full" size="sm" variant="outline">
                  View Details
                  <ArrowRight size={15} aria-hidden="true" />
                </ButtonLink>

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

            {message ? <p className="mt-3 text-sm font-semibold text-pine">{message}</p> : null}
            {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
          </div>
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
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              Update one small next step at a time. Keep statuses, deadlines, notes, and priorities
              organized until submission and results.
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

        {!loading && !error && applicationItems.length > 0 ? (
          <div className="grid gap-4">
            {applicationItems.map((application) => (
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
