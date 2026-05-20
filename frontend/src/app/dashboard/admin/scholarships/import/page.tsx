"use client";

import Link from "next/link";

import { useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileJson,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  createAdminOpportunityDraft,
  validateAdminOpportunityDraft,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityDraft } from "@/types/opportunity";

type JsonPreview =
  | {
      valid: true;
      title: string;
      country: string;
      source: string;
      deadline: string;
      warnings: string[];
      missing: string[];
    }
  | {
      valid: false;
      message: string;
    };

function extractJson(input: string): Record<string, unknown> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Paste the GPT JSON result first.");
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeFenceMatch ? codeFenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Could not find a JSON object in the pasted text.");
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

function getTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function AdminScholarshipImportContent() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [validateImmediately, setValidateImmediately] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<OpportunityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gptPrompt = useMemo(
    () => `You are helping me prepare a scholarship listing for Scholars Republic.

Use only the official source URL and official source text I provide. Do not invent deadlines, benefits, eligibility, countries, universities, IELTS rules, application fees, documents, or funding details.

Return valid JSON only. Do not use markdown. Do not add commentary.

Return this exact JSON shape:
{
  "confidence": "low | medium | high",
  "opportunity": {
    "title": "",
    "opportunity_type": "scholarship",
    "provider_name": "",
    "university_name": "",
    "country": "",
    "official_link": "",
    "source_url": "",
    "source_name": "",
    "short_description": "",
    "description": "",
    "benefits": "",
    "eligibility": "",
    "how_to_apply": "",
    "deadline": "",
    "is_rolling_deadline": false,
    "degree_levels": [],
    "fields_of_study": [],
    "eligible_countries": [],
    "funding_type": "",
    "funding_amount": null,
    "funding_currency": "",
    "stipend_summary": "",
    "application_fee_required": false,
    "ielts_required": false,
    "toefl_required": false,
    "duolingo_required": false,
    "hsk_required": false,
    "english_proficiency_certificate_accepted": false,
    "required_documents": [],
    "tags": [],
    "warnings": [],
    "missing_information": []
  }
}

Important rules:
- If the official source does not clearly mention something, leave it blank, null, false, or [].
- Put uncertain items in "warnings".
- Put missing important facts in "missing_information".
- Use YYYY-MM-DD for deadline only when the exact date is clear.
- Use "is_rolling_deadline": true only if the source clearly says rolling/open deadline.
- Use "funding_type" values like fully_funded, partially_funded, tuition_waiver, stipend_only, merit_based, need_based, self_funded, or leave blank.
- Use simple study field names such as Engineering, Computer Science, Medicine, Business, Social Sciences, Arts, Law, Education, Agriculture, Natural Sciences, or All Fields.
- Keep all writing student-friendly, accurate, and concise.

Official source URL:
${sourceUrl || "PASTE_OFFICIAL_URL_HERE"}

Official source text:
${sourceText || "PASTE_OFFICIAL_SOURCE_TEXT_HERE"}`,
    [sourceText, sourceUrl],
  );
  const jsonPreview = useMemo<JsonPreview | null>(() => {
    if (!jsonText.trim()) {
      return null;
    }

    try {
      const parsed = extractJson(jsonText);
      const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;

      return {
        valid: true,
        title: getText(opportunity.title) || "Title not detected",
        country: getText(opportunity.country) || "Country missing",
        source: getText(opportunity.official_link) || getText(opportunity.source_url) || "Source missing",
        deadline:
          getText(opportunity.deadline) ||
          (opportunity.is_rolling_deadline === true ? "Rolling deadline" : "Deadline missing"),
        warnings: getTextList(opportunity.warnings),
        missing: getTextList(opportunity.missing_information),
      };
    } catch (previewError) {
      return {
        valid: false,
        message: getErrorMessage(previewError) ?? "Could not parse the pasted JSON.",
      };
    }
  }, [jsonText]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(gptPrompt);
    setCopiedPrompt(true);

    window.setTimeout(() => {
      setCopiedPrompt(false);
    }, 1800);
  }

  async function handleCreateDraft() {
    setCreating(true);
    setError(null);
    setCreatedDraft(null);

    try {
      const parsed = extractJson(jsonText);
      const { title, rawPayload } = normalizeDraftPayload(parsed);
      const draft = await createAdminOpportunityDraft({
        title,
        raw_payload: rawPayload,
      });

      if (validateImmediately) {
        const validated = await validateAdminOpportunityDraft(draft.id);
        setCreatedDraft(validated);
      } else {
        setCreatedDraft(draft);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Import Scholarship"
      description="Use GPT output to create a structured scholarship draft for review."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
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
                  Import scholarship
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Paste official source details, use GPT, then save the structured JSON as a draft.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void copyPrompt()}
                  size="sm"
                  variant="primary"
                >
                  {copiedPrompt ? (
                    <CheckCircle2 size={15} aria-hidden="true" />
                  ) : (
                    <Clipboard size={15} aria-hidden="true" />
                  )}
                  {copiedPrompt ? "Prompt copied" : "Copy GPT prompt"}
                </Button>

                <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="outline">
                  Draft queue
                </ButtonLink>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                <div className="flex gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                  <p>
                    Only use official scholarship pages. Do not publish AI output until it is reviewed and verified.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <AdminNotice tone="danger">{error}</AdminNotice>
        ) : null}

        {createdDraft ? (
          <div className="rounded-2xl border border-pine/20 bg-pine/5 p-3 text-sm text-pine dark:border-pine/20 dark:bg-pine/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Draft created: {createdDraft.title}</p>
                <p className="mt-1 text-xs font-semibold text-pine/75">
                  Status: {createdDraft.status} · Errors: {createdDraft.validation_errors.length} · Warnings:{" "}
                  {createdDraft.validation_warnings.length}
                </p>
              </div>

              <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="secondary">
                Review in queue
              </ButtonLink>
              <ButtonLink
                href={`/dashboard/admin/scholarships/drafts/${createdDraft.id}/edit`}
                size="sm"
                variant="outline"
              >
                Edit draft
              </ButtonLink>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-4">
            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <Search size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    1. Official source
                  </h2>
                </div>

                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    Official source URL
                    <input
                      value={sourceUrl}
                      onChange={(event) => setSourceUrl(event.target.value)}
                      className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                      placeholder="https://official-scholarship-page..."
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    Official source text
                    <textarea
                      value={sourceText}
                      onChange={(event) => setSourceText(event.target.value)}
                      rows={8}
                      className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                      placeholder="Paste the official page content, eligibility, benefits, deadline, and how to apply..."
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <FileJson size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    2. Paste GPT JSON result
                  </h2>
                </div>

                <label className="mt-3 grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Structured JSON
                  <textarea
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    rows={15}
                    className="font-mono rounded-xl border border-pine/15 bg-white px-3 py-2 text-xs leading-5 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                    placeholder='Paste GPT JSON here. It should include {"opportunity": {...}}'
                  />
                </label>

                {jsonPreview ? (
                  <div
                    className={`mt-3 rounded-xl border px-3 py-2 text-sm leading-6 ${
                      jsonPreview.valid
                        ? "border-pine/10 bg-[#f7faf8] text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300"
                    }`}
                  >
                    {jsonPreview.valid ? (
                      <div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="mint">Valid JSON</Badge>
                          <Badge tone={jsonPreview.source === "Source missing" ? "saffron" : "neutral"}>
                            {jsonPreview.source}
                          </Badge>
                          <Badge tone={jsonPreview.deadline === "Deadline missing" ? "saffron" : "sky"}>
                            {jsonPreview.deadline}
                          </Badge>
                        </div>
                        <p className="mt-2 font-bold text-ink dark:text-white">{jsonPreview.title}</p>
                        <p className="text-xs font-semibold text-ink/50 dark:text-white/45">
                          {jsonPreview.country} · Warnings: {jsonPreview.warnings.length} · Missing:{" "}
                          {jsonPreview.missing.length}
                        </p>
                      </div>
                    ) : (
                      <p className="font-semibold">{jsonPreview.message}</p>
                    )}
                  </div>
                ) : null}

                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/70 dark:text-white/65">
                  <input
                    type="checkbox"
                    checked={validateImmediately}
                    onChange={(event) => setValidateImmediately(event.target.checked)}
                    className="h-4 w-4 rounded border-pine/20 text-pine focus:ring-pine"
                  />
                  Validate immediately after creating draft
                </label>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => void handleCreateDraft()}
                    disabled={creating}
                    size="sm"
                    variant="primary"
                  >
                    {creating ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles size={15} aria-hidden="true" />
                    )}
                    {creating ? "Creating..." : "Create draft"}
                  </Button>

                  <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="outline">
                    Open draft queue
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="grid gap-4 content-start">
            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-pine" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    GPT prompt preview
                  </h2>
                </div>

                <pre className="mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl border border-pine/10 bg-[#f7faf8] p-3 text-xs leading-5 text-ink/70 dark:border-white/10 dark:bg-[#101214] dark:text-white/65">
                  {gptPrompt}
                </pre>

                <button
                  type="button"
                  onClick={() => void copyPrompt()}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  {copiedPrompt ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : (
                    <Clipboard size={14} aria-hidden="true" />
                  )}
                  {copiedPrompt ? "Copied" : "Copy prompt"}
                </button>
              </CardContent>
            </Card>

            <Card className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-3 md:p-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-pine">
                  After creating
                </h2>

                <div className="mt-3 grid gap-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Review warnings and errors in the draft queue.
                  </p>
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Import only clean drafts, then review again before publishing.
                  </p>
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Verify official source and deadline before marking as verified.
                  </p>
                </div>

                <a
                  href="/admin/opportunities/opportunitydraft/add/"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Django fallback
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function AdminScholarshipImportPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminScholarshipImportContent />
    </ProtectedRoute>
  );
}
