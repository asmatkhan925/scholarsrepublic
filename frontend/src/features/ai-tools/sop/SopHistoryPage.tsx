"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { deleteSOPDraft, getSOPDrafts, startApplicationByScholarshipSlug } from "@/lib/api";
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

function getPreview(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "No SOP text saved for this draft.";
  }

  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned;
}

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white/90 px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
        {value}
      </p>
    </div>
  );
}

function SOPHistoryContent() {
  const [drafts, setDrafts] = useState<SOPDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [highlightedDraftId, setHighlightedDraftId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [trackingDraftId, setTrackingDraftId] = useState<number | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedFormattedId, setCopiedFormattedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const linked = drafts.filter((draft) => Boolean(draft.opportunity_slug)).length;
    const words = drafts.reduce((total, draft) => total + getWordCount(draft.sop_text), 0);

    return {
      total: drafts.length,
      linked,
      words,
    };
  }, [drafts]);

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

  useEffect(() => {
    if (loading || drafts.length === 0) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const draftId = Number(params.get("draft"));

    if (!Number.isFinite(draftId) || draftId <= 0) {
      return;
    }

    const matchingDraft = drafts.find((draft) => draft.id === draftId);

    if (!matchingDraft) {
      return;
    }

    setSelectedDraftId(draftId);
    setHighlightedDraftId(draftId);

    window.setTimeout(() => {
      document.getElementById(`sop-draft-${draftId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    const timeoutId = window.setTimeout(() => {
      setHighlightedDraftId(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [drafts, loading]);

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

  async function handleStartTracking(draft: SOPDraft) {
    if (!draft.opportunity_slug) {
      setError("This SOP draft is not linked to a scholarship.");
      return;
    }

    setTrackingDraftId(draft.id);
    setTrackingMessage(null);
    setError(null);

    try {
      await startApplicationByScholarshipSlug(draft.opportunity_slug);
      setTrackingMessage("Application tracker is ready for this scholarship.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setTrackingDraftId(null);
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
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="px-4 py-4 md:px-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                <FileText size={14} aria-hidden="true" />
                Saved SOP drafts
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                SOP history
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                Review saved drafts, copy clean text, download Word files, and connect linked SOPs to your application tracker.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/ai/sop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  <Plus size={16} aria-hidden="true" />
                  Create new SOP
                </Link>

                <Link
                  href="/dashboard/applications"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Open tracker
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-1">
                <MiniStat label="Drafts" value={stats.total} />
                <MiniStat label="Linked" value={stats.linked} />
                <MiniStat label="Words" value={stats.words.toLocaleString()} />
              </div>

              <div className="mt-2 rounded-2xl border border-pine/10 bg-white px-3 py-2 text-xs leading-5 text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
                Keep only drafts that are useful. Delete weak or outdated versions to avoid confusion later.
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {trackingMessage ? (
          <div className="flex flex-col gap-2 rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine dark:border-pine/20 dark:bg-pine/10 sm:flex-row sm:items-center sm:justify-between">
            <span>{trackingMessage}</span>
            <Link
              href="/dashboard/applications"
              className="inline-flex items-center justify-center rounded-lg bg-pine px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pine/90"
            >
              Open tracker
            </Link>
          </div>
        ) : null}

        <section className="rounded-[1.35rem] border border-pine/10 bg-white p-3 shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d] md:p-4">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-8 text-sm font-semibold text-ink/60 dark:text-white/58">
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Loading saved drafts...
            </div>
          ) : drafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-pine/15 bg-[#f7faf8] px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-bold text-ink dark:text-white">No saved SOP drafts yet.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/55 dark:text-white/55">
                Generate an SOP, review it carefully, then save the final useful version here.
              </p>
              <Link
                href="/dashboard/ai/sop"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                <Plus size={16} aria-hidden="true" />
                Create SOP draft
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {drafts.map((draft) => {
                const selected = selectedDraftId === draft.id;
                const meta = draftMeta(draft);
                const highlighted = highlightedDraftId === draft.id;
                const wordCount = getWordCount(draft.sop_text);

                return (
                  <article
                    key={draft.id}
                    id={`sop-draft-${draft.id}`}
                    className={`overflow-hidden rounded-2xl border transition ${
                      highlighted
                        ? "border-pine/40 bg-pine/5 ring-2 ring-pine/15 dark:bg-pine/10"
                        : "border-pine/10 bg-[#f7faf8] dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_18rem]">
                      <div className="min-w-0 p-3 md:p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {draft.opportunity_slug ? (
                            <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[11px] font-bold text-pine">
                              Linked scholarship
                            </span>
                          ) : (
                            <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-ink/45 dark:bg-white/10 dark:text-white/45">
                              General draft
                            </span>
                          )}
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/45 dark:bg-white/10 dark:text-white/45">
                            {wordCount} words
                          </span>
                          {draft.provider_label ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/45 dark:bg-white/10 dark:text-white/45">
                              {draft.provider_label}
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-2 text-base font-bold leading-snug text-ink dark:text-white md:text-lg">
                          {draft.title}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/55 dark:text-white/50">
                          {meta ? <span>{meta}</span> : null}
                          {meta ? <span className="text-ink/30 dark:text-white/30">·</span> : null}
                          <span>{formatDate(draft.created_at)}</span>
                        </div>

                        {!selected ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60 dark:text-white/55">
                            {getPreview(draft.sop_text)}
                          </p>
                        ) : null}
                      </div>

                      <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-[#181b1d]/80 xl:border-l xl:border-t-0">
                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDraftId(selected ? null : draft.id)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-ink transition hover:bg-mint hover:text-pine dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
                          >
                            {selected ? (
                              <EyeOff size={14} aria-hidden="true" />
                            ) : (
                              <Eye size={14} aria-hidden="true" />
                            )}
                            {selected ? "Hide draft" : "View draft"}
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => void handleCopy(draft)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-2.5 text-xs font-bold text-ink transition hover:bg-mint hover:text-pine dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
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
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-2.5 text-xs font-bold text-ink transition hover:bg-mint hover:text-pine dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
                            >
                              {copiedFormattedId === draft.id ? (
                                <CheckCircle2 size={14} aria-hidden="true" />
                              ) : (
                                <Copy size={14} aria-hidden="true" />
                              )}
                              {copiedFormattedId === draft.id ? "Copied" : "Clean"}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleDownloadDocx(draft)}
                            disabled={downloadingId === draft.id}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-ink transition hover:bg-mint hover:text-pine disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
                          >
                            {downloadingId === draft.id ? (
                              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            ) : (
                              <Download size={14} aria-hidden="true" />
                            )}
                            Download .docx
                          </button>

                          {draft.opportunity_slug ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Link
                                href={`/scholarships/${draft.opportunity_slug}`}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/20 bg-pine/5 px-2.5 text-xs font-bold text-pine transition hover:bg-pine/10"
                              >
                                Scholarship
                              </Link>

                              <button
                                type="button"
                                onClick={() => void handleStartTracking(draft)}
                                disabled={trackingDraftId === draft.id}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/20 bg-pine/5 px-2.5 text-xs font-bold text-pine transition hover:bg-pine/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {trackingDraftId === draft.id ? (
                                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                ) : (
                                  <ClipboardCheck size={14} aria-hidden="true" />
                                )}
                                {trackingDraftId === draft.id ? "Tracking" : "Track"}
                              </button>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => void handleDelete(draft)}
                            disabled={deletingId === draft.id}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/25 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-500/10"
                          >
                            {deletingId === draft.id ? (
                              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 size={14} aria-hidden="true" />
                            )}
                            Delete
                          </button>
                        </div>
                      </aside>
                    </div>

                    {selected ? (
                      <div className="border-t border-pine/10 bg-white p-4 text-sm leading-7 text-ink dark:border-white/10 dark:bg-[#101214] dark:text-white/75">
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
