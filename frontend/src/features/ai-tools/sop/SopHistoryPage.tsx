"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, Eye, FileText, Loader2, Plus, Trash2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { deleteSOPDraft, getSOPDrafts } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { SOPDraft } from "@/types/ai";
import { FormattedSOPText } from "./FormattedSOPText";
import { downloadSOPAsDocx, formatSOPForClipboard } from "./format";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function draftMeta(draft: SOPDraft) {
  return [draft.target_degree, draft.target_country, draft.field_of_study]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" / ");
}

function SOPHistoryContent() {
  const [drafts, setDrafts] = useState<SOPDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedFormattedId, setCopiedFormattedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDrafts() {
    setLoading(true);
    setError(null);

    try {
      setDrafts(await getSOPDrafts());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
  }, []);

  async function handleCopy(draft: SOPDraft) {
    await navigator.clipboard.writeText(draft.sop_text);
    setCopiedId(draft.id);
    window.setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  }

  async function handleCopyFormatted(draft: SOPDraft) {
    await navigator.clipboard.writeText(formatSOPForClipboard(draft.sop_text));
    setCopiedFormattedId(draft.id);
    window.setTimeout(() => {
      setCopiedFormattedId(null);
    }, 1800);
  }

  async function handleDownloadDocx(draft: SOPDraft) {
    setDownloadingId(draft.id);

    try {
      await downloadSOPAsDocx({
        title: draft.title,
        text: draft.sop_text,
        metadata: [
          draft.target_country ? `Target country: ${draft.target_country}` : "",
          draft.target_degree ? `Target degree: ${draft.target_degree}` : "",
          draft.field_of_study ? `Field of study: ${draft.field_of_study}` : "",
          draft.provider_label ? `Generated using: ${draft.provider_label}` : "",
        ],
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(draft: SOPDraft) {
    if (!window.confirm(`Delete "${draft.title}" from your SOP history?`)) {
      return;
    }

    setDeletingId(draft.id);
    setError(null);

    try {
      await deleteSOPDraft(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setSelectedDraftId((current) => (current === draft.id ? null : current));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardShell
      title="SOP History"
      description="Review, copy, and manage saved scholarship SOP drafts."
      hideHeader
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                <FileText size={14} aria-hidden="true" />
                Saved drafts
              </div>
              <h1 className="mt-2 text-xl font-bold text-ink">SOP history</h1>
            </div>

            <Link
              href="/dashboard/ai/sop"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              <Plus size={17} aria-hidden="true" />
              Create new SOP
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-ink/10 bg-white p-3 shadow-soft md:p-4">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-8 text-sm font-semibold text-ink/60">
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Loading saved drafts...
            </div>
          ) : drafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/15 bg-cream/40 px-4 py-8 text-center text-sm font-semibold text-ink/55">
              No saved SOP drafts yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {drafts.map((draft) => {
                const selected = selectedDraftId === draft.id;
                const meta = draftMeta(draft);

                return (
                  <article key={draft.id} className="rounded-xl border border-ink/10 bg-cream/30 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-ink">{draft.title}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/55">
                          {meta ? <span>{meta}</span> : null}
                          {meta ? <span className="text-ink/30">&middot;</span> : null}
                          <span>{draft.provider_label}</span>
                          <span className="text-ink/30">&middot;</span>
                          <span>{formatDate(draft.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {draft.opportunity_slug ? (
                          <Link
                            href={`/scholarships/${draft.opportunity_slug}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-xs font-semibold text-pine transition hover:bg-pine/10"
                          >
                            View scholarship
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelectedDraftId(selected ? null : draft.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-ink/5"
                        >
                          <Eye size={14} aria-hidden="true" />
                          {selected ? "Hide" : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopy(draft)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-ink/5"
                        >
                          {copiedId === draft.id ? (
                            <CheckCircle2 size={14} aria-hidden="true" />
                          ) : (
                            <Copy size={14} aria-hidden="true" />
                          )}
                          {copiedId === draft.id ? "Copied" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyFormatted(draft)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-ink/5"
                        >
                          {copiedFormattedId === draft.id ? (
                            <CheckCircle2 size={14} aria-hidden="true" />
                          ) : (
                            <Copy size={14} aria-hidden="true" />
                          )}
                          {copiedFormattedId === draft.id ? "Copied" : "Copy formatted"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadDocx(draft)}
                          disabled={downloadingId === draft.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadingId === draft.id ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Download size={14} aria-hidden="true" />
                          )}
                          Download .docx
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(draft)}
                          disabled={deletingId === draft.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === draft.id ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 size={14} aria-hidden="true" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>

                    {selected ? (
                      <div className="mt-3 rounded-xl border border-ink/10 bg-white p-4 text-sm leading-7 text-ink">
                        <FormattedSOPText text={draft.sop_text} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export default function SOPHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <SOPHistoryContent />
    </ProtectedRoute>
  );
}
