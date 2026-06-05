"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

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
import { DuplicateWarningPanel } from "@/components/admin/DuplicateWarningPanel";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  checkAdminOpportunityDuplicates,
  createAdminOpportunityDraft,
  getAdminOpportunityPathways,
  getCountries,
  getStudyFields,
  validateAdminOpportunityDraft,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AdminOpportunityDuplicateMatch,
  OpportunityPathwayDetail,
  OpportunityDraft,
} from "@/types/opportunity";
import type { CountryOption, StudyFieldOption } from "@/types/reference";
import {
  buildCompletenessChecklist,
  buildCountryContext,
  buildDuplicatePayloadFromOpportunity,
  buildLocalJsonWarnings,
  buildPathwayContext,
  buildScholarshipDetailUrl,
  buildStudyFieldContext,
  extractJson,
  getBoolean,
  getText,
  getTextList,
  humanize,
  isRecord,
  normalizeDraftPayload,
  PATHWAY_CONTEXT_LIMIT,
  getReferenceCreationWarnings,
  summarizeText,
  type ContextStatus,
  type JsonPreview,
} from "@/features/admin/import/import-utils";
import {
  CompletenessChecklist,
  ContextStatusItem,
  PreviewField,
  PreviewList,
} from "@/features/admin/import/ImportPreviewComponents";
import { useImportPrompts } from "@/features/admin/import/useImportPrompts";

function AdminScholarshipImportContent() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [validateImmediately, setValidateImmediately] = useState(true);
  const [createMissingReferences, setCreateMissingReferences] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFixPrompt, setCopiedFixPrompt] = useState(false);
  const [copiedJsonRepairPrompt, setCopiedJsonRepairPrompt] = useState(false);
  const [copiedFacebookPostPrompt, setCopiedFacebookPostPrompt] = useState(false);
  const [copiedFacebookImagePrompt, setCopiedFacebookImagePrompt] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<OpportunityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<AdminOpportunityDuplicateMatch[]>([]);
  const [pathways, setPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [studyFields, setStudyFields] = useState<StudyFieldOption[]>([]);
  const [pathwayContextStatus, setPathwayContextStatus] = useState<ContextStatus>("idle");
  const [countryContextStatus, setCountryContextStatus] = useState<ContextStatus>("idle");
  const [studyFieldContextStatus, setStudyFieldContextStatus] = useState<ContextStatus>("idle");
  const hasExactDuplicate = duplicateMatches.some((match) => match.confidence === "exact");
  const contextHasWarning =
    pathwayContextStatus === "error" ||
    countryContextStatus === "error" ||
    studyFieldContextStatus === "error";

  const pathwayContext = useMemo(() => buildPathwayContext(pathways), [pathways]);
  const countryContext = useMemo(() => buildCountryContext(countries), [countries]);
  const studyFieldContext = useMemo(() => buildStudyFieldContext(studyFields), [studyFields]);

  const jsonPreview = useMemo<JsonPreview | null>(() => {
    if (!jsonText.trim()) {
      return null;
    }

    try {
      const parsed = extractJson(jsonText);
      const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;
      const officialLink = getText(opportunity.official_link);
      const sourceUrlValue = getText(opportunity.source_url);
      const deadlineValue = getText(opportunity.deadline);
      const allStudyFields = getBoolean(opportunity.all_study_fields);
      const title = getText(opportunity.title) || "Title not detected";
      const slug = getText(opportunity.slug);
      const fundingAmount = getText(opportunity.funding_amount);
      const fundingCurrency = getText(opportunity.funding_currency);
      const stipendSummary = getText(opportunity.stipend_summary);
      const checklist = buildCompletenessChecklist(opportunity);
      const localWarnings = buildLocalJsonWarnings(opportunity);
      const incompleteItems = checklist
        .filter((item) => !item.complete)
        .map((item) => item.label);

      return {
        valid: true,
        title,
        country: getText(opportunity.country) || "Country missing",
        provider:
          getText(opportunity.provider_name) ||
          getText(opportunity.university_name) ||
          "Provider/university missing",
        degreeLevels: getTextList(opportunity.degree_levels),
        fieldsOfStudy: getTextList(opportunity.fields_of_study),
        allStudyFields,
        funding: humanize(getText(opportunity.funding_type)) || "Funding type missing",
        stipendAmount:
          fundingAmount && fundingCurrency
            ? `${fundingCurrency} ${fundingAmount}`
            : fundingAmount || "Not listed",
        stipendSummary,
        source: officialLink || sourceUrlValue || "Source missing",
        pathway:
          typeof opportunity.pathway_id === "number"
            ? `Pathway ID ${opportunity.pathway_id}`
            : getText(opportunity.pathway),
        officialLink,
        sourceUrl: sourceUrlValue,
        deadline:
          deadlineValue ||
          (getBoolean(opportunity.is_rolling_deadline) ? "Rolling deadline" : "Deadline missing"),
        shortDescription: getText(opportunity.short_description),
        benefits: getText(opportunity.benefits),
        eligibility: getText(opportunity.eligibility),
        howToApply: getText(opportunity.how_to_apply),
        requiredDocuments: getTextList(opportunity.required_documents),
        scholarshipDetailUrl: slug
          ? `https://scholarsrepublic.org/scholarships/${slug}`
          : buildScholarshipDetailUrl(title),
        warnings: getTextList(opportunity.warnings),
        localWarnings,
        missing: getTextList(opportunity.missing_information),
        checklist,
        incompleteItems,
      };
    } catch (previewError) {
      return {
        valid: false,
        message: getErrorMessage(previewError) ?? "Could not parse the pasted JSON.",
      };
    }
  }, [jsonText]);

  const { gptPrompt, gptFixPrompt, jsonRepairPrompt, facebookPostPrompt, facebookImagePrompt } =
    useImportPrompts({
      sourceUrl,
      sourceText,
      jsonText,
      jsonPreview,
      createdDraft,
      pathwayContext,
      countryContext,
      studyFieldContext,
    });

  const referenceCreationWarnings = useMemo(() => {
    if (!jsonPreview?.valid) {
      return [];
    }

    return getReferenceCreationWarnings([
      ...jsonPreview.warnings,
      ...jsonPreview.localWarnings,
      ...(createdDraft?.validation_warnings ?? []),
    ]);
  }, [createdDraft?.validation_warnings, jsonPreview]);

  useEffect(() => {
    let mounted = true;

    setPathwayContextStatus("loading");
    setCountryContextStatus("loading");
    setStudyFieldContextStatus("loading");

    async function loadPathways() {
      try {
        const response = await getAdminOpportunityPathways({
          active: true,
          page_size: PATHWAY_CONTEXT_LIMIT,
        });

        if (mounted) {
          setPathways(response.results.filter((pathway) => pathway.is_active));
          setPathwayContextStatus("loaded");
        }
      } catch {
        if (mounted) {
          setPathways([]);
          setPathwayContextStatus("error");
        }
      }
    }

    async function loadCountries() {
      try {
        const response = await getCountries();

        if (mounted) {
          setCountries(response.results);
          setCountryContextStatus("loaded");
        }
      } catch {
        if (mounted) {
          setCountries([]);
          setCountryContextStatus("error");
        }
      }
    }

    async function loadStudyFields() {
      try {
        const response = await getStudyFields();

        if (mounted) {
          setStudyFields(response.results);
          setStudyFieldContextStatus("loaded");
        }
      } catch {
        if (mounted) {
          setStudyFields([]);
          setStudyFieldContextStatus("error");
        }
      }
    }

    void loadPathways();
    void loadCountries();
    void loadStudyFields();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkDuplicates() {
      if (!jsonText.trim()) {
        setDuplicateMatches([]);
        return;
      }

      try {
        const parsed = extractJson(jsonText);
        const opportunity = isRecord(parsed.opportunity) ? parsed.opportunity : parsed;
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

  async function copyPrompt() {
    await navigator.clipboard.writeText(gptPrompt);
    setCopiedPrompt(true);

    window.setTimeout(() => {
      setCopiedPrompt(false);
    }, 1800);
  }

  async function copyFixPrompt() {
    if (!gptFixPrompt) {
      return;
    }

    await navigator.clipboard.writeText(gptFixPrompt);
    setCopiedFixPrompt(true);

    window.setTimeout(() => {
      setCopiedFixPrompt(false);
    }, 1800);
  }

  async function copyJsonRepairPrompt() {
    if (!jsonRepairPrompt) {
      return;
    }

    await navigator.clipboard.writeText(jsonRepairPrompt);
    setCopiedJsonRepairPrompt(true);

    window.setTimeout(() => {
      setCopiedJsonRepairPrompt(false);
    }, 1800);
  }

  async function copyFacebookPostPrompt() {
    if (!facebookPostPrompt) {
      return;
    }

    await navigator.clipboard.writeText(facebookPostPrompt);
    setCopiedFacebookPostPrompt(true);

    window.setTimeout(() => {
      setCopiedFacebookPostPrompt(false);
    }, 1800);
  }

  async function copyFacebookImagePrompt() {
    if (!facebookImagePrompt) {
      return;
    }

    await navigator.clipboard.writeText(facebookImagePrompt);
    setCopiedFacebookImagePrompt(true);

    window.setTimeout(() => {
      setCopiedFacebookImagePrompt(false);
    }, 1800);
  }

  async function handleCreateDraft() {
    setCreating(true);
    setError(null);
    setCreatedDraft(null);

    try {
      const parsed = extractJson(jsonText);
      const { title, rawPayload } = normalizeDraftPayload(parsed, createMissingReferences);
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
                  Paste one official source, use GPT, then create a private review draft.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copyPrompt()} size="sm" variant="primary">
                  {copiedPrompt ? (
                    <CheckCircle2 size={15} aria-hidden="true" />
                  ) : (
                    <Clipboard size={15} aria-hidden="true" />
                  )}
                  {copiedPrompt ? "Prompt copied" : "Copy GPT prompt"}
                </Button>

                <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="outline">
                  Review drafts
                </ButtonLink>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                <div className="flex gap-2">
                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <p>
                    This importer accepts one scholarship JSON object at a time. GPT output becomes
                    a private review draft, not a published scholarship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        {createdDraft ? (
          <div className="rounded-2xl border border-pine/20 bg-pine/5 p-3 text-sm text-pine dark:border-pine/20 dark:bg-pine/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Review draft created: {createdDraft.title}</p>
                <p className="mt-1 text-xs font-semibold text-pine/75">
                  Status: {createdDraft.status} · Errors: {createdDraft.validation_errors.length} ·
                  Warnings: {createdDraft.validation_warnings.length}
                </p>
              </div>

              <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="secondary">
                Review draft
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
                  <h2 className="text-lg font-bold text-ink dark:text-white">1. Official source</h2>
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
                    2. Paste one GPT JSON result
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
                    className={`mt-3 rounded-2xl border p-3 text-sm leading-6 ${
                      jsonPreview.valid
                        ? "border-pine/10 bg-[#f7faf8] text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300"
                    }`}
                  >
                    {jsonPreview.valid ? (
                      <div className="grid gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="mint">Valid JSON</Badge>
                          <Badge tone="neutral">Single scholarship</Badge>
                          <Badge
                            tone={jsonPreview.source === "Source missing" ? "saffron" : "neutral"}
                          >
                            {jsonPreview.source === "Source missing"
                              ? "Source missing"
                              : "Source detected"}
                          </Badge>
                          <Badge
                            tone={jsonPreview.deadline === "Deadline missing" ? "saffron" : "sky"}
                          >
                            {jsonPreview.deadline}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pine">
                            Scholarship review preview
                          </p>
                          <h3 className="mt-1 text-lg font-black leading-snug text-ink dark:text-white">
                            {jsonPreview.title}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-ink/55 dark:text-white/50">
                            {jsonPreview.provider} · {jsonPreview.country}
                          </p>
                        </div>

                        <CompletenessChecklist items={jsonPreview.checklist} />

                        <DuplicateWarningPanel matches={duplicateMatches} />

                        <div className="grid gap-2 md:grid-cols-2">
                          <PreviewList
                            label="Degree levels"
                            items={jsonPreview.degreeLevels}
                            tone="neutral"
                          />
                          <PreviewList
                            label="Fields of study"
                            items={
                              jsonPreview.allStudyFields && jsonPreview.fieldsOfStudy.length === 0
                                ? ["All Fields"]
                                : jsonPreview.fieldsOfStudy
                            }
                            emptyLabel={jsonPreview.allStudyFields ? "All fields" : "Not provided"}
                            tone="sky"
                          />
                          <PreviewField
                            label="Funding"
                            value={jsonPreview.funding}
                          />
                          <PreviewField label="Stipend amount" value={jsonPreview.stipendAmount} />
                          {jsonPreview.stipendSummary ? (
                            <PreviewField label="Stipend note" value={jsonPreview.stipendSummary} />
                          ) : null}
                          <PreviewField label="Deadline" value={jsonPreview.deadline} />
                          <PreviewField label="Official link" value={jsonPreview.officialLink} />
                          <PreviewField label="Source URL" value={jsonPreview.sourceUrl} />
                          <PreviewField
                            label="Pathway"
                            value={jsonPreview.pathway || "Select manually before import"}
                          />
                        </div>

                        <div className="grid gap-2">
                          <PreviewField
                            label="Benefits summary"
                            value={summarizeText(jsonPreview.benefits)}
                          />
                          <PreviewField
                            label="Eligibility summary"
                            value={summarizeText(jsonPreview.eligibility)}
                          />
                          <PreviewField
                            label="How to apply summary"
                            value={summarizeText(jsonPreview.howToApply)}
                          />
                        </div>

                        <PreviewList
                          label="Required documents"
                          items={jsonPreview.requiredDocuments}
                          emptyLabel="No required documents detected"
                          tone="neutral"
                        />
                        <PreviewList
                          label="Warnings from GPT JSON"
                          items={jsonPreview.warnings}
                          emptyLabel="No warnings from GPT"
                          tone="saffron"
                        />
                        <PreviewList
                          label="Missing information"
                          items={jsonPreview.missing}
                          emptyLabel="No missing information listed"
                          tone="danger"
                        />
                        <PreviewList
                          label="Local importer warnings"
                          items={jsonPreview.localWarnings}
                          emptyLabel="No local importer warnings"
                          tone="saffron"
                        />
                        <PreviewList
                          label="Incomplete recommended fields"
                          items={jsonPreview.incompleteItems}
                          emptyLabel="No incomplete recommended fields"
                          tone="saffron"
                        />
                        {referenceCreationWarnings.length > 0 ? (
                          <PreviewList
                            label="Reference data to be created"
                            items={referenceCreationWarnings}
                            emptyLabel="No reference data will be created"
                            tone="sky"
                          />
                        ) : null}
                        {createdDraft?.validation_warnings.length ? (
                          <PreviewList
                            label="Backend validation warnings"
                            items={createdDraft.validation_warnings}
                            emptyLabel="No backend validation warnings"
                            tone="saffron"
                          />
                        ) : null}

                        <div
                          className={`rounded-2xl border px-3 py-3 ${
                            jsonPreview.warnings.length +
                              jsonPreview.localWarnings.length +
                              jsonPreview.missing.length +
                              jsonPreview.incompleteItems.length +
                              (createdDraft?.validation_warnings.length ?? 0) >
                            0
                              ? "border-saffron/30 bg-saffron/10 dark:border-saffron/25 dark:bg-saffron/10"
                              : "border-pine/15 bg-mint/30 dark:border-pine/20 dark:bg-pine/10"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-ink dark:text-white">
                                Fix JSON with GPT
                              </p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/50">
                                {jsonPreview.warnings.length +
                                  jsonPreview.localWarnings.length +
                                  jsonPreview.missing.length +
                                  jsonPreview.incompleteItems.length +
                                  (createdDraft?.validation_warnings.length ?? 0) >
                                0
                                  ? "Copy a repair prompt containing the current JSON, detected warnings, missing fields, and platform context. Paste it into GPT, then paste the corrected JSON back here."
                                  : "No major issues detected, but you can still ask GPT to polish the JSON while preserving facts."}
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => void copyFixPrompt()}
                              size="sm"
                              variant="outline"
                            >
                              {copiedFixPrompt ? (
                                <CheckCircle2 size={15} aria-hidden="true" />
                              ) : (
                                <Clipboard size={15} aria-hidden="true" />
                              )}
                              {copiedFixPrompt ? "Fix prompt copied" : "Copy GPT fix prompt"}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-pine/10 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#101214]">
                          <div className="flex flex-col gap-3">
                            <div>
                              <p className="text-sm font-bold text-ink dark:text-white">
                                Facebook marketing prompts
                              </p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/50">
                                Create a Facebook post and image design prompt from the parsed
                                scholarship JSON. Use these after you review the draft information.
                              </p>
                            </div>

                            <PreviewField
                              label="Expected Scholars Republic detail link"
                              value={jsonPreview.scholarshipDetailUrl}
                            />
                            <p className="-mt-1 text-xs font-medium leading-5 text-ink/55 dark:text-white/45">
                              Verify the final link after publishing, especially if the backend adds
                              a duplicate slug suffix.
                            </p>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                onClick={() => void copyFacebookPostPrompt()}
                                size="sm"
                                variant="outline"
                              >
                                {copiedFacebookPostPrompt ? (
                                  <CheckCircle2 size={15} aria-hidden="true" />
                                ) : (
                                  <Clipboard size={15} aria-hidden="true" />
                                )}
                                {copiedFacebookPostPrompt
                                  ? "Facebook post prompt copied"
                                  : "Copy Facebook post prompt"}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => void copyFacebookImagePrompt()}
                                size="sm"
                                variant="outline"
                              >
                                {copiedFacebookImagePrompt ? (
                                  <CheckCircle2 size={15} aria-hidden="true" />
                                ) : (
                                  <Clipboard size={15} aria-hidden="true" />
                                )}
                                {copiedFacebookImagePrompt
                                  ? "Image prompt copied"
                                  : "Copy Facebook image prompt"}
                              </Button>
                            </div>

                            <div className="grid gap-1 text-xs font-medium leading-5 text-ink/55 dark:text-white/45">
                              <p>The post prompt uses only parsed JSON information.</p>
                              <p>
                                The image prompt is for Canva/Figma/GPT image tools; it does not
                                generate or upload an image automatically.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <p className="font-semibold">{jsonPreview.message}</p>
                        <div className="rounded-2xl border border-red-200 bg-white px-3 py-3 dark:border-red-400/25 dark:bg-[#101214]">
                          <p className="text-sm font-bold text-ink dark:text-white">
                            Repair invalid JSON
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/50">
                            GPT returned text that could not be parsed as one JSON object. Copy
                            this prompt to ask GPT to return valid JSON only.
                          </p>
                          <Button
                            type="button"
                            onClick={() => void copyJsonRepairPrompt()}
                            size="sm"
                            variant="outline"
                            className="mt-3"
                          >
                            {copiedJsonRepairPrompt ? (
                              <CheckCircle2 size={15} aria-hidden="true" />
                            ) : (
                              <Clipboard size={15} aria-hidden="true" />
                            )}
                            {copiedJsonRepairPrompt
                              ? "JSON repair prompt copied"
                              : "Copy JSON repair prompt"}
                          </Button>
                        </div>
                      </div>
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
                  Validate review draft immediately after creating
                </label>
                <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-ink/70 dark:text-white/65">
                  <input
                    type="checkbox"
                    checked={createMissingReferences}
                    onChange={(event) => setCreateMissingReferences(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-pine/20 text-pine focus:ring-pine"
                  />
                  <span>
                    Create missing reference data during import
                    <span className="mt-1 block text-xs font-medium leading-5 text-ink/55 dark:text-white/45">
                      If GPT JSON contains a new country, eligible country, study field, or pathway
                      that is not in Scholars Republic yet, the importer will create it and show a
                      warning. Turn this off if you want unknown references to be rejected or
                      selected manually.
                    </span>
                  </span>
                </label>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => void handleCreateDraft()}
                    disabled={creating || hasExactDuplicate}
                    size="sm"
                    variant="primary"
                  >
                    {creating ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles size={15} aria-hidden="true" />
                    )}
                    {hasExactDuplicate
                      ? "Existing scholarship found"
                      : creating
                        ? "Creating review draft..."
                        : "Create review draft"}
                  </Button>

                  <ButtonLink
                    href="/dashboard/admin/scholarships/drafts"
                    size="sm"
                    variant="outline"
                  >
                    Open review drafts
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
                  <h2 className="text-lg font-bold text-ink dark:text-white">GPT prompt preview</h2>
                </div>

                <div className="mt-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink dark:text-white">Prompt context</p>
                      <p className="mt-0.5 text-xs font-semibold text-ink/50 dark:text-white/45">
                        Live platform lists are included in the copied prompt when available.
                      </p>
                    </div>
                    {contextHasWarning ? <Badge tone="saffron">Partial context</Badge> : null}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <ContextStatusItem
                      label="Pathways loaded"
                      count={pathways.length}
                      status={pathwayContextStatus}
                    />
                    <ContextStatusItem
                      label="Countries loaded"
                      count={countries.length}
                      status={countryContextStatus}
                    />
                    <ContextStatusItem
                      label="Study fields loaded"
                      count={studyFields.length}
                      status={studyFieldContextStatus}
                    />
                  </div>

                  {contextHasWarning ? (
                    <p className="mt-3 rounded-xl border border-saffron/25 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-ink/65 dark:text-white/58">
                      Some context could not be loaded. The prompt still works and includes fallback
                      instructions for missing context.
                    </p>
                  ) : null}
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
                    Review warnings and errors in the review drafts queue.
                  </p>
                  <p className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    Convert only clean review drafts to scholarship drafts, then review again before
                    publishing.
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
