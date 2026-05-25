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
  Loader2,
  RefreshCw,
  Save,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DuplicateWarningPanel } from "@/components/admin/DuplicateWarningPanel";
import { PathwaySelect } from "@/components/admin/PathwaySelect";
import { SocialImageUploadCard } from "@/components/admin/SocialImageUploadCard";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  checkAdminOpportunityDuplicates,
  getAdminOpportunityDraft,
  getAdminOpportunityPathways,
  importAdminOpportunityDraft,
  patchAdminOpportunityDraft,
  uploadAdminDraftSocialImage,
  validateAdminOpportunityDraft,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AdminOpportunityDuplicateMatch,
  AdminOpportunityDuplicatePayload,
  OpportunityDraft,
  OpportunityPathwayDetail,
} from "@/types/opportunity";

function extractJson(input: string): Record<string, unknown> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Paste valid JSON before saving.");
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeFenceMatch ? codeFenceMatch[1].trim() : trimmed;

  if (candidate.startsWith("[")) {
    throw new Error("This workflow accepts one scholarship JSON object, not a bulk array.");
  }

  function parseCandidate(value: string) {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      throw new Error(
        'Paste one JSON object with the shape {"confidence": "...", "opportunity": {...}}.',
      );
    }

    return parsed;
  }

  try {
    return parseCandidate(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Could not find a valid JSON object.");
    }

    return parseCandidate(candidate.slice(firstBrace, lastBrace + 1));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getText(value: unknown) {
  if (typeof value === "number") {
    return String(value).trim();
  }

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

type QuickFixForm = {
  country: string;
  deadline: string;
  official_link: string;
  source_url: string;
  source_name: string;
  pathway_id: number | null;
  funding_type: string;
  funding_amount: string;
  funding_currency: string;
  stipend_summary: string;
  fields_of_study: string;
};

const emptyQuickFix: QuickFixForm = {
  country: "",
  deadline: "",
  official_link: "",
  source_url: "",
  source_name: "",
  pathway_id: null,
  funding_type: "",
  funding_amount: "",
  funding_currency: "",
  stipend_summary: "",
  fields_of_study: "",
};

const fundingOptions = [
  ["", "Not selected"],
  ["fully_funded", "Fully funded"],
  ["partially_funded", "Partially funded"],
  ["tuition_waiver", "Tuition waiver"],
  ["stipend_only", "Stipend only"],
  ["need_based", "Need based"],
  ["merit_based", "Merit based"],
  ["self_funded", "Self funded"],
  ["other", "Other"],
];

function getOpportunityObject(payload: Record<string, unknown>) {
  return isRecord(payload.opportunity) ? payload.opportunity : payload;
}

function textListToTextarea(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join("\n");
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textareaToTextList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDuplicatePayloadFromOpportunity(
  opportunity: Record<string, unknown>,
): AdminOpportunityDuplicatePayload {
  return {
    title: getText(opportunity.title),
    slug: getText(opportunity.slug),
    official_link: getText(opportunity.official_link),
    source_url: getText(opportunity.source_url),
    provider_name: getText(opportunity.provider_name),
    university_name: getText(opportunity.university_name),
    country: getText(opportunity.country),
    deadline: getText(opportunity.deadline),
    degree_levels: Array.isArray(opportunity.degree_levels)
      ? opportunity.degree_levels.filter((item): item is string => typeof item === "string")
      : [],
    pathway_id: getNumber(opportunity.pathway_id),
    pathway: getText(opportunity.pathway),
  };
}

function buildQuickFixForm(payload: Record<string, unknown>): QuickFixForm {
  const opportunity = getOpportunityObject(payload);

  return {
    country: getText(opportunity.country),
    deadline: getText(opportunity.deadline),
    official_link: getText(opportunity.official_link),
    source_url: getText(opportunity.source_url),
    source_name: getText(opportunity.source_name),
    pathway_id: typeof opportunity.pathway_id === "number" ? opportunity.pathway_id : null,
    funding_type: getText(opportunity.funding_type),
    funding_amount: getText(opportunity.funding_amount),
    funding_currency: getText(opportunity.funding_currency),
    stipend_summary: getText(opportunity.stipend_summary),
    fields_of_study: textListToTextarea(opportunity.fields_of_study),
  };
}

function applyQuickFixToPayload(payload: Record<string, unknown>, quickFix: QuickFixForm) {
  const hasWrapper = isRecord(payload.opportunity);
  const opportunity = {
    ...getOpportunityObject(payload),
    country: quickFix.country.trim(),
    deadline: quickFix.deadline.trim(),
    official_link: quickFix.official_link.trim(),
    source_url: quickFix.source_url.trim(),
    source_name: quickFix.source_name.trim(),
    pathway_id: quickFix.pathway_id,
    funding_type: quickFix.funding_type.trim(),
    funding_amount: quickFix.funding_amount.trim() || null,
    funding_currency: quickFix.funding_currency.trim(),
    stipend_summary: quickFix.stipend_summary.trim(),
    fields_of_study: textareaToTextList(quickFix.fields_of_study),
  };

  return hasWrapper ? { ...payload, opportunity } : { opportunity };
}

function looksLikeAmountText(value: string) {
  return /(\$|€|£|USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD)\s?\d|\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD|€|£|\$)/i.test(
    value,
  );
}

function getStipendWarnings(quickFix: QuickFixForm) {
  const warnings: string[] = [];
  const stipendSummary = quickFix.stipend_summary.trim();
  const fundingAmount = quickFix.funding_amount.trim();
  const fundingCurrency = quickFix.funding_currency.trim();

  if (looksLikeAmountText(stipendSummary) && !fundingAmount) {
    warnings.push(
      "Stipend amount appears to be in stipend_summary. Move the numeric amount to funding_amount and currency to funding_currency.",
    );
  }

  if (fundingAmount && !fundingCurrency) {
    warnings.push("Funding amount is provided but funding_currency is missing.");
  }

  if (fundingCurrency && !fundingAmount) {
    warnings.push("Funding currency is provided but funding_amount is missing.");
  }

  if (stipendSummary.length > 120) {
    warnings.push(
      "stipend_summary should be a short note only. Put full funding explanation in benefits.",
    );
  }

  return warnings;
}

function QuickTextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
      />
    </label>
  );
}

function AdminDraftEditContent() {
  const params = useParams<{ id: string }>();
  const draftId = Number(params.id);

  const [draft, setDraft] = useState<OpportunityDraft | null>(null);
  const [pathways, setPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [title, setTitle] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [quickFix, setQuickFix] = useState<QuickFixForm>(emptyQuickFix);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<AdminOpportunityDuplicateMatch[]>([]);
  const hasExactDuplicate = duplicateMatches.some((match) => match.confidence === "exact");
  const stipendWarnings = useMemo(() => getStipendWarnings(quickFix), [quickFix]);

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
      setQuickFix(buildQuickFixForm(data.raw_payload));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadPathways() {
    try {
      const response = await getAdminOpportunityPathways({
        active: true,
        page_size: 300,
      });
      setPathways(response.results);
    } catch {
      setPathways([]);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(draftId) || draftId <= 0) {
      setError("Invalid draft id.");
      setLoading(false);
      return;
    }

    void loadDraft();
    void loadPathways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    let mounted = true;

    async function checkDuplicates() {
      if (!jsonText.trim()) {
        setDuplicateMatches([]);
        return;
      }

      try {
        const parsed = extractJson(jsonText);
        const opportunity = getOpportunityObject(parsed);
        const payload = buildDuplicatePayloadFromOpportunity(opportunity);

        if (!payload.title && !payload.official_link && !payload.source_url) {
          setDuplicateMatches([]);
          return;
        }

        const response = await checkAdminOpportunityDuplicates(payload);
        if (mounted) {
          setDuplicateMatches(response.matches);
        }
      } catch {
        if (mounted) {
          setDuplicateMatches([]);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void checkDuplicates();
    }, 400);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [jsonText]);

  function updateQuickFixField<K extends keyof QuickFixForm>(field: K, value: QuickFixForm[K]) {
    setQuickFix((current) => ({ ...current, [field]: value }));
  }

  function handleJsonTextChange(value: string) {
    setJsonText(value);

    try {
      setQuickFix(buildQuickFixForm(extractJson(value)));
    } catch {
      // Keep the current quick-fix form while the JSON is temporarily invalid.
    }
  }

  function applyQuickFixPanel() {
    try {
      const patched = applyQuickFixToPayload(extractJson(jsonText), quickFix);
      setJsonText(JSON.stringify(patched, null, 2));
      setQuickFix(buildQuickFixForm(patched));
      setMessage("Quick fixes applied to JSON. Save or validate when ready.");
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function saveDraft() {
    const parsed = applyQuickFixToPayload(extractJson(jsonText), quickFix);
    const normalized = normalizeDraftPayload(parsed);
    const nextTitle = title.trim() || normalized.title;

    const updated = await patchAdminOpportunityDraft(draftId, {
      title: nextTitle,
      raw_payload: normalized.rawPayload,
    });

    setDraft(updated);
    setTitle(updated.title);
    setJsonText(JSON.stringify(updated.raw_payload, null, 2));
    setQuickFix(buildQuickFixForm(updated.raw_payload));

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
      setQuickFix(buildQuickFixForm(validated.raw_payload));
      setMessage(
        validated.status === "validated" && validated.validation_errors.length === 0
          ? "Review draft validated. Convert it to a scholarship draft when ready."
          : "Saved, but validation found issues. Fix the errors and validate again.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleImportOnly() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await importAdminOpportunityDraft(draftId);
      setDraft(response.draft);
      setTitle(response.draft.title);
      setJsonText(JSON.stringify(response.draft.raw_payload, null, 2));
      setQuickFix(buildQuickFixForm(response.draft.raw_payload));
      setMessage("Converted to a scholarship draft.");
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
      description="Fix GPT/imported JSON before it becomes a scholarship draft."
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
                Back to review queue
              </Link>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                Edit imported draft
              </h1>

              <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-white/60">
                Fix missing country, source, fields, deadline, and JSON issues. A clean review draft
                can then be converted into Scholarship Manager.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSaveAndValidate()}
                  disabled={busy || loading}
                  size="sm"
                  variant="primary"
                >
                  {busy ? (
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw size={15} aria-hidden="true" />
                  )}
                  Save and validate review draft
                </Button>

                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={busy || loading}
                  size="sm"
                  variant="outline"
                >
                  <Save size={15} aria-hidden="true" />
                  Save only
                </Button>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                This page edits imported GPT output. It stays private until you convert it to a
                scholarship draft, then publish/verify later.
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
                  <h2 className="text-lg font-bold text-ink dark:text-white">Imported JSON</h2>
                </div>

                <DuplicateWarningPanel matches={duplicateMatches} />

                <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Draft title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  />
                </label>

                <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink dark:text-white">Quick fixes</h3>
                      <p className="mt-0.5 text-xs leading-5 text-ink/55 dark:text-white/50">
                        Fix common validation errors here. These values are saved into the JSON.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={applyQuickFixPanel}
                      disabled={busy}
                    >
                      Apply to JSON
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <QuickTextInput
                      label="Country"
                      value={quickFix.country}
                      onChange={(value) => updateQuickFixField("country", value)}
                      placeholder="United States of America"
                    />

                    <QuickTextInput
                      label="Deadline"
                      value={quickFix.deadline}
                      onChange={(value) => updateQuickFixField("deadline", value)}
                      placeholder="2026-06-27"
                      type="date"
                    />

                    <div className="md:col-span-2">
                      <PathwaySelect
                        label="Pathway"
                        pathways={pathways}
                        value={quickFix.pathway_id}
                        onChange={(value) => updateQuickFixField("pathway_id", value)}
                        disabled={busy}
                      />
                    </div>

                    <QuickTextInput
                      label="Official link"
                      value={quickFix.official_link}
                      onChange={(value) => updateQuickFixField("official_link", value)}
                      placeholder="https://official-page..."
                    />

                    <QuickTextInput
                      label="Source URL"
                      value={quickFix.source_url}
                      onChange={(value) => updateQuickFixField("source_url", value)}
                      placeholder="https://source-page..."
                    />

                    <QuickTextInput
                      label="Source name"
                      value={quickFix.source_name}
                      onChange={(value) => updateQuickFixField("source_name", value)}
                      placeholder="University jobs page"
                    />

                    <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                      Funding type
                      <select
                        value={quickFix.funding_type}
                        onChange={(event) =>
                          updateQuickFixField("funding_type", event.target.value)
                        }
                        className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                      >
                        {fundingOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <QuickTextInput
                      label="Funding amount"
                      value={quickFix.funding_amount}
                      onChange={(value) => updateQuickFixField("funding_amount", value)}
                      placeholder="1200"
                      type="number"
                    />
                    <QuickTextInput
                      label="Funding currency"
                      value={quickFix.funding_currency}
                      onChange={(value) => updateQuickFixField("funding_currency", value)}
                      placeholder="EUR"
                    />

                    <QuickTextInput
                      label="Stipend summary"
                      value={quickFix.stipend_summary}
                      onChange={(value) => updateQuickFixField("stipend_summary", value)}
                      placeholder="monthly stipend"
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-ink/55 dark:text-white/45">
                    Do not put the amount here. Put numeric amount in Funding amount and currency
                    in Funding currency. Use Stipend summary only for a short note.
                  </p>
                  {stipendWarnings.length > 0 ? (
                    <div className="mt-2 rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                      <ul className="list-disc space-y-1 pl-4">
                        {stipendWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <label className="mt-3 grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    Fields of study
                    <textarea
                      value={quickFix.fields_of_study}
                      onChange={(event) =>
                        updateQuickFixField("fields_of_study", event.target.value)
                      }
                      rows={3}
                      className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                      placeholder={"Medicine\nNatural Sciences\nPharmacy"}
                    />
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Raw JSON
                  <textarea
                    value={jsonText}
                    onChange={(event) => handleJsonTextChange(event.target.value)}
                    rows={28}
                    className="font-mono rounded-xl border border-pine/15 bg-white px-3 py-2 text-xs leading-5 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                    placeholder='{"opportunity": {...}}'
                  />
                </label>
              </CardContent>
            </Card>

            <aside className="grid content-start gap-4">
              <DraftStatusPanel draft={draft} />

              <SocialImageUploadCard
                initialImage={draft.social_image}
                onUpload={(image, imagePrompt) =>
                  uploadAdminDraftSocialImage(draft.id, image, imagePrompt)
                }
              />

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-2 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">Actions</h2>

                  <Button
                    type="button"
                    onClick={() => void handleSaveAndValidate()}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw size={15} aria-hidden="true" />
                    )}
                    Save and validate review draft
                  </Button>

                  {canImport ? (
                    <Button
                      type="button"
                      onClick={() => void handleImportOnly()}
                      disabled={busy || hasExactDuplicate}
                      variant="outline"
                    >
                      {hasExactDuplicate ? "Existing scholarship found" : "Convert to scholarship draft"}
                    </Button>
                  ) : null}

                  {draft.created_opportunity ? (
                    <ButtonLink
                      href={`/dashboard/admin/scholarships/${draft.created_opportunity}/edit`}
                      variant="outline"
                    >
                      Edit in Scholarship Manager
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
