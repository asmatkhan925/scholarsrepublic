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

type DraftStatusFilter = "all" | OpportunityDraftStatus;

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
                {draft.created_opportunity ? "Revalidate" : "Validate and import"}
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
                Import as scholarship draft
              </Button>

              {needsValidation ? (
                <p className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-ink/65 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                  Validate first. This is only an imported GPT draft, not a real scholarship yet.
                </p>
              ) : null}

              {draft.status === "validated" && !canImport ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
                  Fix validation errors before importing as a scholarship draft.
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
                Delete
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
  const [statusFilter, setStatusFilter] = useState<DraftStatusFilter>("all");
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
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      setDrafts(response.results);
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
    }),
    [drafts],
  );

  async function updateDraftInList(updated: OpportunityDraft) {
    setDrafts((current) => current.map((draft) => (draft.id === updated.id ? updated : draft)));
  }

  async function handleValidate(draft: OpportunityDraft) {
    setBusyId(draft.id);
    setMessage(null);
    setError(null);

    try {
      const validated = await validateAdminOpportunityDraft(draft.id);

      if (
        validated.status === "validated" &&
        validated.validation_errors.length === 0 &&
        !validated.created_opportunity
      ) {
        const imported = await importAdminOpportunityDraft(draft.id);
        await updateDraftInList(imported.draft);
        setMessage("Validated and imported as a real scholarship draft. Open Scholarship Manager to edit or publish it.");
        return;
      }

      await updateDraftInList(validated);
      setMessage(
        validated.status === "validated"
          ? "Draft validated. You can import it now."
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
      setMessage("Imported as a real scholarship draft. Open the scholarship manager or edit page before publishing.");
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
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="px-4 py-4 md:px-5">
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to admin workbench
              </Link>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Draft review queue
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Validate imported drafts. Clean drafts are automatically imported into Scholarship Manager.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/dashboard/admin/scholarships/import"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  Import with GPT
                  <ExternalLink size={15} aria-hidden="true" />
                </a>

                <Link
                  href="/dashboard/admin/scholarships"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Real scholarship manager
                </Link>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Loaded
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    New
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.newCount}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Validated
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.validated}
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 dark:border-red-400/25 dark:bg-red-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-red-700/60 dark:text-red-300/70">
                    Errors
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-red-700 dark:text-red-300">
                    {stats.errorCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
        </section>

        {message ? (
          <div className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine dark:border-pine/20 dark:bg-pine/10">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-ink/70 dark:text-white/60">
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Loading draft queue...
            </CardContent>
          </Card>
        ) : null}

        {!loading && drafts.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/dashboard/admin">
                Back to Workbench
                <ArrowLeft size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description="No imported drafts matched the selected search and filters."
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
