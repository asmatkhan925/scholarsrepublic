"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Trash2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ApplicationPriorityBadge } from "@/components/applications/ApplicationPriorityBadge";
import { ApplicationStatusBadge } from "@/components/applications/ApplicationStatusBadge";
import { DashboardShell } from "@/components/dashboard-shell";
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

function ApplicationCard({
  application,
  onUpdated,
  onDeleted,
}: {
  application: OpportunityApplication;
  onUpdated: (application: OpportunityApplication) => void;
  onDeleted: (id: number) => void;
}) {
  const [statusValue, setStatusValue] = useState<ApplicationStatus>(application.status);
  const [priority, setPriority] = useState<ApplicationPriority>(application.priority);
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
    opportunity.provider_name || opportunity.university_name || opportunity.company_name || "TBD";
  const detailHref =
    opportunity.opportunity_type === "scholarship" ? `/scholarships/${opportunity.slug}` : "#";

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
    <article className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{opportunity.title}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {provider} · {opportunity.country || "Country not listed"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ApplicationStatusBadge status={application.status} />
          <ApplicationPriorityBadge priority={application.priority} />
        </div>
      </div>

      <dl className="mt-5 grid gap-2 text-sm text-ink/70 sm:grid-cols-3">
        <div>
          <dt className="text-ink/50">Opportunity type</dt>
          <dd className="font-semibold text-ink">{humanize(opportunity.opportunity_type)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Official deadline</dt>
          <dd className="font-semibold text-ink">{formatDate(opportunity.deadline)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Personal deadline</dt>
          <dd className="font-semibold text-ink">{formatDate(application.personal_deadline)}</dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-ink">
          Status
          <select
            value={statusValue}
            onChange={(event) => setStatusValue(event.target.value as ApplicationStatus)}
            className="rounded border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as ApplicationPriority)}
            className="rounded border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
          Next step
          <input
            value={nextStep}
            onChange={(event) => setNextStep(event.target.value)}
            className="rounded border border-ink/15 px-3 py-2 text-sm text-ink"
            placeholder="Prepare SOP, submit form, email professor..."
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Personal deadline
          <input
            type="date"
            value={personalDeadline}
            onChange={(event) => setPersonalDeadline(event.target.value)}
            className="rounded border border-ink/15 px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="rounded border border-ink/15 px-3 py-2 text-sm text-ink"
            placeholder="Add application notes, links, professor replies, or reminders."
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-2 rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
        >
          View Details
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="inline-flex items-center gap-2 rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 size={16} aria-hidden="true" />
          {deleting ? "Stopping..." : "Stop Tracking"}
        </button>
      </div>

      {message && <p className="mt-3 text-sm font-semibold text-pine">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
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
      title="Application Tracker"
      description="Track the opportunities you are preparing, applied to, or waiting for."
    >
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total", summary?.total ?? 0],
          ["Preparing", counts?.preparing ?? 0],
          ["Applied", counts?.applied ?? 0],
          ["Result Waiting", counts?.result_waiting ?? 0],
          ["Selected", counts?.selected ?? 0],
        ].map(([label, value]) => (
          <section key={label} className="rounded border border-ink/10 bg-white p-4 shadow-soft">
            <p className="text-sm text-ink/60">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded border border-ink/10 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Status filter
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Priority filter
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Search applications
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded border border-ink/15 px-3 py-2 text-sm text-ink"
              placeholder="Search title, country, notes..."
            />
          </label>
        </div>
      </section>

      {loading && (
        <div className="mt-6 rounded border border-ink/10 bg-white p-5 text-sm text-ink/70">
          Loading applications...
        </div>
      )}

      {error && (
        <div className="mt-6 rounded border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && applicationItems.length === 0 && (
        <section className="mt-6 rounded border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-ink">You are not tracking any applications yet.</h2>
          <p className="mt-3 text-sm text-ink/70">
            Start tracking from a saved opportunity or a scholarship detail page.
          </p>
          <Link
            href="/scholarships"
            className="mt-5 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            Browse Scholarships
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      {!loading && !error && applicationItems.length > 0 && (
        <div className="mt-6 grid gap-5">
          {applicationItems.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {summary && summary.upcoming_deadlines.length > 0 && (
        <section className="mt-6 rounded border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-pine">
            <CalendarDays size={18} aria-hidden="true" />
            <h2 className="font-semibold text-ink">Upcoming personal deadlines</h2>
          </div>
          <ul className="mt-4 grid gap-2 text-sm text-ink/70">
            {summary.upcoming_deadlines.map((item) => (
              <li key={item.id} className="rounded bg-skyglass px-3 py-2">
                {item.opportunity_detail.title}: {formatDate(item.personal_deadline)}
              </li>
            ))}
          </ul>
        </section>
      )}
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
