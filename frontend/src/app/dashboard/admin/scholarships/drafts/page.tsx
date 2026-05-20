"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FileText,
  Import,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminFilterButton, AdminHero, AdminLoading, AdminMetric, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  deleteAdminOpportunityDraft,
  getAdminOpportunityDrafts,
  importAdminOpportunityDraft,
  validateAdminOpportunityDraft,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityDraft, OpportunityDraftStatus } from "@/types/opportunity";

type DraftStatusFilter = "needs_review" | "all" | OpportunityDraftStatus;

function formatDate(value: string | null) {
  if (!value) {
    return "Not imported";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTone(status: OpportunityDraftStatus): "mint" | "saffron" | "danger" | "neutral" | "sky" {
  if (status === "validated") {
    return "mint";
  }

  if (status === "imported") {
    return "sky";
  }

  if (status === "error") {
    return "danger";
  }

  return "saffron";
}

function getOpportunityPayload(draft: OpportunityDraft) {
  const raw = draft.raw_payload;

  if (!raw || typeof raw !== "object") {
    return {};
  }

  const opportunity = raw.opportunity;

  if (!opportunity || typeof opportunity !== "object" || Array.isArray(opportunity)) {
    return {};
  }

  return opportunity as Record<string, unknown>;
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getDraftAttentionItems(draft: OpportunityDraft) {
  const opportunity = getOpportunityPayload(draft);
  const items: string[] = [];

  if (draft.validation_errors.length > 0) {
    items.push("Fix validation errors");
  }

  if (draft.validation_warnings.length > 0) {
    items.push("Review warnings");
  }

  if (!getText(opportunity.country)) {
    items.push("Add country");
  }

  if (!getText(opportunity.official_link) && !getText(opportunity.source_url) && !draft.source_url) {
    items.push("Add official source");
  }

  if (!getText(opportunity.deadline) && opportunity.is_rolling_deadline !== true) {
    items.push("Confirm deadline");
  }

  if (!getText(opportunity.funding_type) && !getText(opportunity.stipend_summary)) {
    items.push("Confirm funding");
  }

  if (getTextList(opportunity.fields_of_study).length === 0) {
    items.push("Add study fields");
  }

  return items;
}

function DraftReviewCard({
  draft,
  busyId,
  onValidate,
  onImport,
  onDelete,
}: {
  draft: OpportunityDraft;
  busyId: number | null;
  onValidate: (draft: OpportunityDraft) => Promise<void>;
  onImport: (draft: OpportunityDraft) => Promise<void>;
  onDelete: (draft: OpportunityDraft) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const opportunity = getOpportunityPayload(draft);
  const title = getText(opportunity.title) || draft.title;
  const country = getText(opportunity.country);
  const provider = getText(opportunity.provider_name) || getText(opportunity.university_name);
  const shortDescription = getText(opportunity.short_description);
  const deadline = getText(opportunity.deadline);
  const fundingType = getText(opportunity.funding_type);
  const degreeLevels = getTextList(opportunity.degree_levels).slice(0, 3);
  const fields = getTextList(opportunity.fields_of_study).slice(0, 3);
  const attentionItems = getDraftAttentionItems(draft);
  const busy = busyId === draft.id;
  const canImport = draft.status === "validated" && draft.validation_errors.length === 0;
  const needsValidation = draft.status === "new";

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={getStatusTone(draft.status)}>{humanize(draft.status)}</Badge>
              {draft.confidence ? <Badge tone="neutral">Confidence: {draft.confidence}</Badge> : null}
              {draft.validation_errors.length > 0 ? (
                <Badge tone="danger">{draft.validation_errors.length} error(s)</Badge>
              ) : null}
              {draft.validation_warnings.length > 0 ? (
                <Badge tone="saffron">{draft.validation_warnings.length} warning(s)</Badge>
              ) : null}
            </div>

            <h2 className="mt-2 text-lg font-bold leading-snug text-ink dark:text-white md:text-xl">
              {title}
            </h2>

            <p className="mt-1.5 text-sm leading-5 text-ink/62 dark:text-white/58">
              {provider || "Provider not listed"} · {country || "Country not listed"}
            </p>

            {shortDescription ? (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/62 dark:text-white/56">
                {shortDescription}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {fundingType ? <Badge tone="neutral">{humanize(fundingType)}</Badge> : null}
              {deadline ? <Badge tone="sky">Deadline: {deadline}</Badge> : <Badge tone="saffron">No deadline</Badge>}
              {degreeLevels.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {fields.map((field) => (
                <Badge key={field} tone="sky">
                  {field}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink/50 dark:text-white/45">
              <span className="rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                Source: {draft.source_name || "Not detected"}
              </span>
              <span className="rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                Updated: {formatDate(draft.updated_at)}
              </span>
              {draft.imported_at ? (
                <span className="rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                  Imported: {formatDate(draft.imported_at)}
                </span>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">
                Review checklist
              </p>
              {attentionItems.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {attentionItems.slice(0, expanded ? undefined : 5).map((item) => (
                    <Badge key={item} tone={item.includes("error") ? "danger" : "saffron"}>
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold text-pine">
                  Core fields look ready. Validate, import, then do final edit before publishing.
                </p>
              )}
            </div>

            {draft.validation_errors.length > 0 ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <XCircle size={15} aria-hidden="true" />
                  Errors to fix
                </div>
                <ul className="list-disc space-y-1 pl-4">
                  {draft.validation_errors.slice(0, expanded ? undefined : 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {draft.validation_warnings.length > 0 ? (
              <div className="mt-3 rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                <div className="mb-1 flex items-center gap-2 font-bold text-ink dark:text-white">
                  <AlertTriangle size={15} aria-hidden="true" />
                  Warnings
                </div>
                <ul className="list-disc space-y-1 pl-4">
                  {draft.validation_warnings.slice(0, expanded ? undefined : 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {expanded ? (
              <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-pine/10 bg-[#f7faf8] p-3 text-xs leading-5 text-ink/70 dark:border-white/10 dark:bg-[#101214] dark:text-white/65">
                {JSON.stringify(draft.raw_payload, null, 2)}
              </pre>
            ) : null}
          </div>

          <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <div className="grid gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void onValidate(draft)}
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={14} aria-hidden="true" />
                )}
                {draft.created_opportunity ? "Revalidate" : "Validate review draft"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant={canImport ? "primary" : "outline"}
                disabled={busy || !canImport}
                onClick={() => void onImport(draft)}
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Import size={14} aria-hidden="true" />
                )}
                Convert to scholarship draft
              </Button>

              {needsValidation ? (
                <p className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-ink/65 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                  Validate first. This is imported GPT output in a private review draft, not a published scholarship.
                </p>
              ) : null}

              {draft.status === "validated" && !canImport ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
                  Fix validation errors before converting to a scholarship draft.
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <FileSearch size={14} aria-hidden="true" />
                {expanded ? "Hide JSON" : "View JSON"}
              </button>

              {draft.created_opportunity ? (
                <Link
                  href={`/dashboard/admin/scholarships/${draft.created_opportunity}/edit`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/20 bg-pine/5 px-3 text-xs font-bold text-pine transition hover:bg-pine/10"
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Edit imported scholarship
                </Link>
              ) : null}

              {draft.source_url ? (
                <a
                  href={draft.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Source
                </a>
              ) : null}

              <Link
                href={`/dashboard/admin/scholarships/drafts/${draft.id}/edit`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <FileText size={14} aria-hidden="true" />
                Edit draft
              </Link>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void onDelete(draft)}
                className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 size={14} aria-hidden="true" />
                Reject/delete
              </Button>
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function DraftReviewQueueContent() {
  const [drafts, setDrafts] = useState<OpportunityDraft[]>([]);
  const [statusFilter, setStatusFilter] = useState<DraftStatusFilter>("needs_review");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDrafts() {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminOpportunityDrafts({
        page_size: 100,
        ...(statusFilter === "needs_review" ? { needs_review: true } : {}),
        ...(statusFilter !== "all" && statusFilter !== "needs_review"
          ? { status: statusFilter }
          : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      const visibleResults =
        statusFilter === "needs_review"
          ? response.results.filter(
              (draft) => !draft.created_opportunity && draft.status !== "imported",
            )
          : response.results;

      setDrafts(visibleResults);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const stats = useMemo(
    () => ({
      total: drafts.length,
      newCount: drafts.filter((draft) => draft.status === "new").length,
      validated: drafts.filter((draft) => draft.status === "validated").length,
      errorCount: drafts.filter((draft) => draft.status === "error").length,
      warningCount: drafts.reduce((total, draft) => total + draft.validation_warnings.length, 0),
    }),
    [drafts],
  );

  async function updateDraftInList(updated: OpportunityDraft) {
    setDrafts((current) => {
      if (
        statusFilter === "needs_review" &&
        (updated.status === "imported" || updated.created_opportunity)
      ) {
        return current.filter((draft) => draft.id !== updated.id);
      }

      return current.map((draft) => (draft.id === updated.id ? updated : draft));
    });
  }

  async function handleValidate(draft: OpportunityDraft) {
    setBusyId(draft.id);
    setMessage(null);
    setError(null);

    try {
      const validated = await validateAdminOpportunityDraft(draft.id);

      await updateDraftInList(validated);
      setMessage(
        validated.status === "validated"
          ? "Review draft validated. Review warnings, then convert it to a scholarship draft when ready."
          : "Validation found errors. Click Edit draft to fix them.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      await loadDrafts();
    } finally {
      setBusyId(null);
    }
  }

  async function handleImport(draft: OpportunityDraft) {
    setBusyId(draft.id);
    setMessage(null);
    setError(null);

    try {
      const response = await importAdminOpportunityDraft(draft.id);
      await updateDraftInList(response.draft);
      setMessage("Converted to a scholarship draft. Open the scholarship manager or edit page before publishing.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      await loadDrafts();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(draft: OpportunityDraft) {
    if (!window.confirm(`Delete imported draft "${draft.title}"?`)) {
      return;
    }

    setBusyId(draft.id);
    setMessage(null);
    setError(null);

    try {
      await deleteAdminOpportunityDraft(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setMessage("Draft deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Draft Review Queue"
      description="Validate imported scholarship drafts and import clean records for publishing."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Imported draft review"
          title="Draft review queue"
          description="Validate imported drafts, fix issues, then import clean records into Scholarship Manager."
          backHref="/dashboard/admin"
          backLabel="Back to admin workbench"
          icon={FileSearch}
          actions={
            <>
              <ButtonLink href="/dashboard/admin/scholarships/import" size="sm">
                Import with GPT
                <ExternalLink size={15} aria-hidden="true" />
              </ButtonLink>

              <ButtonLink href="/dashboard/admin/scholarships" size="sm" variant="outline">
                Scholarship manager
              </ButtonLink>
            </>
          }
          metrics={
            <>
              <AdminMetric label="Shown" value={stats.total} />
              <AdminMetric label="New" value={stats.newCount} tone={stats.newCount > 0 ? "warning" : "normal"} />
              <AdminMetric label="Validated" value={stats.validated} tone="success" />
              <AdminMetric label="Errors" value={stats.errorCount} tone={stats.errorCount > 0 ? "danger" : "normal"} />
            </>
          }
        />

        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-2 border-t border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_12rem_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/35"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void loadDrafts();
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  placeholder="Title, source, URL..."
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as DraftStatusFilter)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="needs_review">Needs review</option>
                <option value="all">All status</option>
                <option value="new">New</option>
                <option value="validated">Validated</option>
                <option value="imported">Imported</option>
                <option value="error">Error</option>
              </select>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void loadDrafts()}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <RefreshCw size={15} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="border-t border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap gap-2">
              <AdminFilterButton
                label="Needs review"
                active={statusFilter === "needs_review"}
                onClick={() => setStatusFilter("needs_review")}
              />
              <AdminFilterButton
                label="New"
                active={statusFilter === "new"}
                onClick={() => setStatusFilter("new")}
                count={stats.newCount}
              />
              <AdminFilterButton
                label="Validated"
                active={statusFilter === "validated"}
                onClick={() => setStatusFilter("validated")}
                count={stats.validated}
              />
              <AdminFilterButton
                label="Errors"
                active={statusFilter === "error"}
                onClick={() => setStatusFilter("error")}
                count={stats.errorCount}
              />
              <AdminFilterButton
                label="All"
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              />
            </div>
          </div>
        </section>

        {message ? (
          <AdminNotice>{message}</AdminNotice>
        ) : null}

        {error ? (
          <AdminNotice tone="danger">{error}</AdminNotice>
        ) : null}

        {loading ? (
          <AdminLoading label="Loading draft queue..." />
        ) : null}

        {!loading && drafts.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/dashboard/admin">
                Back to Workbench
                <ArrowLeft size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description={
              statusFilter === "needs_review"
                ? "No drafts need review right now. Imported drafts are hidden by default."
                : "No imported drafts matched the selected search and filters."
            }
            icon={<FileSearch size={22} aria-hidden="true" />}
            title="No draft opportunities found"
          />
        ) : null}

        {!loading && drafts.length > 0 ? (
          <section className="grid gap-3">
            {drafts.map((draft) => (
              <DraftReviewCard
                key={draft.id}
                draft={draft}
                busyId={busyId}
                onValidate={handleValidate}
                onImport={handleImport}
                onDelete={handleDelete}
              />
            ))}
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminScholarshipDraftsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DraftReviewQueueContent />
    </ProtectedRoute>
  );
}
