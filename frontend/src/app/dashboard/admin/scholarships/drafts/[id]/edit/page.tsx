"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileJson,
  Import,
  Loader2,
  RefreshCw,
  Save,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  getAdminOpportunityDraft,
  importAdminOpportunityDraft,
  patchAdminOpportunityDraft,
  validateAdminOpportunityDraft,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityDraft } from "@/types/opportunity";

function extractJson(input: string): Record<string, unknown> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Paste valid JSON before saving.");
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeFenceMatch ? codeFenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Could not find a valid JSON object.");
    }

    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDraftPayload(parsed: Record<string, unknown>) {
  const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;
  const title = getText(opportunity.title) || "Imported scholarship draft";

  return {
    title,
    rawPayload: isRecord(parsed.opportunity) ? parsed : { opportunity },
  };
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTone(
  status: OpportunityDraft["status"],
): "mint" | "saffron" | "danger" | "neutral" | "sky" {
  if (status === "validated") return "mint";
  if (status === "imported") return "sky";
  if (status === "error") return "danger";
  return "saffron";
}

function DraftStatusPanel({ draft }: { draft: OpportunityDraft }) {
  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="grid gap-3 p-3 md:p-4">
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

        {draft.validation_errors.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <XCircle size={15} aria-hidden="true" />
              Errors
            </div>
            <ul className="list-disc space-y-1 pl-4">
              {draft.validation_errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.validation_warnings.length > 0 ? (
          <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
            <div className="mb-1 flex items-center gap-2 font-bold text-ink dark:text-white">
              <AlertTriangle size={15} aria-hidden="true" />
              Warnings
            </div>
            <ul className="list-disc space-y-1 pl-4">
              {draft.validation_warnings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AdminDraftEditContent() {
  const params = useParams<{ id: string }>();
  const draftId = Number(params.id);

  const [draft, setDraft] = useState<OpportunityDraft | null>(null);
  const [title, setTitle] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canImport = useMemo(
    () => Boolean(draft && draft.status === "validated" && draft.validation_errors.length === 0),
    [draft],
  );

  async function loadDraft() {
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminOpportunityDraft(draftId);
      setDraft(data);
      setTitle(data.title);
      setJsonText(JSON.stringify(data.raw_payload, null, 2));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(draftId) || draftId <= 0) {
      setError("Invalid draft id.");
      setLoading(false);
      return;
    }

    void loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  async function saveDraft() {
    const parsed = extractJson(jsonText);
    const normalized = normalizeDraftPayload(parsed);
    const nextTitle = title.trim() || normalized.title;

    const updated = await patchAdminOpportunityDraft(draftId, {
      title: nextTitle,
      raw_payload: normalized.rawPayload,
    });

    setDraft(updated);
    setTitle(updated.title);
    setJsonText(JSON.stringify(updated.raw_payload, null, 2));

    return updated;
  }

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      await saveDraft();
      setMessage("Imported draft saved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAndValidate() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      await saveDraft();
      const validated = await validateAdminOpportunityDraft(draftId);
      setDraft(validated);
      setTitle(validated.title);
      setJsonText(JSON.stringify(validated.raw_payload, null, 2));
      setMessage(
        validated.status === "validated"
          ? "Draft saved and validated."
          : "Draft saved, but validation found issues.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await importAdminOpportunityDraft(draftId);
      setDraft(response.draft);
      setTitle(response.draft.title);
      setJsonText(JSON.stringify(response.draft.raw_payload, null, 2));
      setMessage("Imported as a real scholarship draft. Review it before publishing.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Edit Imported Draft"
      description="Edit GPT/imported JSON before validating and importing it as a real scholarship draft."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="px-4 py-4 md:px-5">
              <Link
                href="/dashboard/admin/scholarships/drafts"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to draft review queue
              </Link>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Edit imported draft
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Fix missing country, fields, source, deadline, and JSON issues here.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={busy || loading} size="sm">
                  {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                  Save
                </Button>

                <Button type="button" onClick={() => void handleSaveAndValidate()} disabled={busy || loading} size="sm" variant="outline">
                  {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
                  Save and validate
                </Button>

                {canImport ? (
                  <Button type="button" onClick={() => void handleImport()} disabled={busy} size="sm" variant="primary">
                    {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Import size={15} aria-hidden="true" />}
                    Import as scholarship draft
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                This edits the imported GPT draft only. It will not appear in Scholarship Manager until imported as a scholarship draft.
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine dark:border-pine/20 dark:bg-pine/10">
            <CheckCircle2 size={15} className="mr-1 inline" aria-hidden="true" />
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
              Loading imported draft...
            </CardContent>
          </Card>
        ) : null}

        {!loading && draft ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="grid gap-3 p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <FileJson size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    Imported draft JSON
                  </h2>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Draft title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Raw JSON
                  <textarea
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    rows={28}
                    className="font-mono rounded-xl border border-pine/15 bg-white px-3 py-2 text-xs leading-5 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                    placeholder='{"opportunity": {...}}'
                  />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => void handleSaveAndValidate()} disabled={busy}>
                    {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
                    Save and validate
                  </Button>

                  <Button type="button" onClick={() => void handleSave()} disabled={busy} variant="outline">
                    <Save size={15} aria-hidden="true" />
                    Save only
                  </Button>
                </div>
              </CardContent>
            </Card>

            <aside className="grid content-start gap-4">
              <DraftStatusPanel draft={draft} />

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-2 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    Actions
                  </h2>

                  {canImport ? (
                    <Button type="button" onClick={() => void handleImport()} disabled={busy}>
                      {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Import size={15} aria-hidden="true" />}
                      Import as scholarship draft
                    </Button>
                  ) : (
                    <p className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-ink/65 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                      Save and validate first. Import becomes available only when validation passes.
                    </p>
                  )}

                  {draft.created_opportunity ? (
                    <ButtonLink href={`/dashboard/admin/scholarships/${draft.created_opportunity}/edit`} variant="outline">
                      Edit imported scholarship
                    </ButtonLink>
                  ) : null}

                  {draft.source_url ? (
                    <a
                      href={draft.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-sm font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      Source page
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : null}

                  <a
                    href={`/admin/opportunities/opportunitydraft/${draft.id}/change/`}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-sm font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Django fallback
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </CardContent>
              </Card>
            </aside>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminDraftEditPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDraftEditContent />
    </ProtectedRoute>
  );
}
