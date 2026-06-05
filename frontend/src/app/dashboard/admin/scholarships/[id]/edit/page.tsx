"use client";

import Link from "next/link";

import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Save, ShieldCheck } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DuplicateWarningPanel } from "@/components/admin/DuplicateWarningPanel";
import { PathwaySelect } from "@/components/admin/PathwaySelect";
import { SocialImageUploadCard } from "@/components/admin/SocialImageUploadCard";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  postScholarshipToFacebookNow,
  saveAdminOpportunitySocialPostReview,
  uploadAdminOpportunitySocialImage,
} from "@/lib/api";
import type { OpportunityStatus } from "@/types/opportunity";

import { DeadlineVerificationCard } from "@/features/admin/scholarship-edit/DeadlineVerificationCard";
import { TextArea, TextInput, Toggle } from "@/features/admin/scholarship-edit/fields";
import { fundingOptions } from "@/features/admin/scholarship-edit/types";
import { useScholarshipEdit } from "@/features/admin/scholarship-edit/useScholarshipEdit";

function AdminScholarshipEditContent() {
  const {
    opportunity,
    pathways,
    form,
    updateField,
    loading,
    saving,
    saved,
    error,
    duplicateMatches,
    deadlinePackage,
    deadlineChecking,
    deadlineApplying,
    deadlineMessage,
    deadlineError,
    publicHref,
    publishReadiness,
    stipendWarnings,
    opportunityId,
    handleSave,
    handlePrepareDeadlineCheck,
    handleApplyDetectedDeadline,
  } = useScholarshipEdit();

  return (
    <DashboardShell
      mode="admin"
      title="Edit Scholarship"
      description="Edit scholarship details, source information, eligibility, funding, documents, and publishing status."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="px-4 py-4 md:px-5">
              <Link
                href="/dashboard/admin/scholarships"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to scholarship manager
              </Link>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Edit scholarship
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Review imported content, fix missing fields, then publish and verify.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={saving} size="sm">
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={15} aria-hidden="true" />
                  )}
                  {saving ? "Saving..." : "Save changes"}
                </Button>

                {publicHref ? (
                  <ButtonLink href={publicHref} size="sm" variant="outline">
                    Preview public page
                    <ExternalLink size={15} aria-hidden="true" />
                  </ButtonLink>
                ) : null}
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Status
                  </p>
                  <p className="mt-0.5 text-sm font-black capitalize leading-none text-ink dark:text-white">
                    {form.status}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Verified
                  </p>
                  <p className="mt-0.5 text-sm font-black leading-none text-ink dark:text-white">
                    {form.verified_status ? "Yes" : "No"}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Featured
                  </p>
                  <p className="mt-0.5 text-sm font-black leading-none text-ink dark:text-white">
                    {form.featured ? "Yes" : "No"}
                  </p>
                </div>
                <a
                  href={`/admin/opportunities/opportunity/${opportunityId}/change/`}
                  className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Django fallback
                </a>
              </div>
            </div>
          </div>
        </section>

        {saved ? (
          <div className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine dark:border-pine/20 dark:bg-pine/10">
            <CheckCircle2 size={15} className="mr-1 inline" aria-hidden="true" />
            Scholarship saved successfully.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!loading ? <DuplicateWarningPanel matches={duplicateMatches} compact /> : null}

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-ink/70 dark:text-white/60">
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Loading scholarship...
            </CardContent>
          </Card>
        ) : null}

        {!loading ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-4">
              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-3 md:p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={17} className="text-pine" aria-hidden="true" />
                    <h2 className="text-lg font-bold text-ink dark:text-white">Core details</h2>
                  </div>

                  <TextInput
                    label="Title"
                    value={form.title}
                    onChange={(value) => updateField("title", value)}
                    placeholder="Scholarship title"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput
                      label="Provider"
                      value={form.provider_name}
                      onChange={(value) => updateField("provider_name", value)}
                    />
                    <TextInput
                      label="University"
                      value={form.university_name}
                      onChange={(value) => updateField("university_name", value)}
                    />
                    <TextInput
                      label="Country"
                      value={form.country}
                      onChange={(value) => updateField("country", value)}
                    />
                    <div className="md:col-span-2">
                      <PathwaySelect
                        pathways={pathways}
                        value={form.pathway_id}
                        onChange={(value) => updateField("pathway_id", value)}
                      />
                    </div>
                    <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                      Funding type
                      <select
                        value={form.funding_type}
                        onChange={(event) => updateField("funding_type", event.target.value)}
                        className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                      >
                        {fundingOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <TextInput
                      label="Funding amount"
                      value={form.funding_amount}
                      onChange={(value) => updateField("funding_amount", value)}
                      placeholder="1200"
                      type="number"
                    />
                    <TextInput
                      label="Funding currency"
                      value={form.funding_currency}
                      onChange={(value) => updateField("funding_currency", value)}
                      placeholder="EUR"
                    />
                  </div>

                  <TextArea
                    label="Short description"
                    value={form.short_description}
                    onChange={(value) => updateField("short_description", value)}
                    rows={3}
                  />

                  <TextInput
                    label="Stipend summary"
                    value={form.stipend_summary}
                    onChange={(value) => updateField("stipend_summary", value)}
                    placeholder="monthly stipend"
                  />
                  <p className="-mt-1 text-xs font-medium text-ink/55 dark:text-white/45">
                    Do not put the amount here. Put numeric amount in Funding amount and currency
                    in Funding currency. Use Stipend summary only for a short note.
                  </p>
                  {stipendWarnings.length > 0 ? (
                    <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                      <ul className="list-disc space-y-1 pl-4">
                        {stipendWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">Main content</h2>

                  <TextArea
                    label="Description"
                    value={form.description}
                    onChange={(value) => updateField("description", value)}
                    rows={6}
                  />
                  <TextArea
                    label="Benefits"
                    value={form.benefits}
                    onChange={(value) => updateField("benefits", value)}
                    rows={5}
                  />
                  <TextArea
                    label="Eligibility"
                    value={form.eligibility}
                    onChange={(value) => updateField("eligibility", value)}
                    rows={5}
                  />
                  <TextArea
                    label="How to apply"
                    value={form.how_to_apply}
                    onChange={(value) => updateField("how_to_apply", value)}
                    rows={5}
                  />
                </CardContent>
              </Card>

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    Classification and requirements
                  </h2>

                  <div className="grid gap-3 md:grid-cols-2">
                    <TextArea
                      label="Degree levels"
                      value={form.degree_levels}
                      onChange={(value) => updateField("degree_levels", value)}
                      rows={4}
                      placeholder="Bachelor&#10;Master&#10;PhD"
                    />
                    <TextArea
                      label="Fields of study"
                      value={form.fields_of_study}
                      onChange={(value) => updateField("fields_of_study", value)}
                      rows={4}
                      placeholder="Engineering&#10;Computer Science&#10;All Fields"
                    />
                    <TextArea
                      label="Eligible countries"
                      value={form.eligible_countries}
                      onChange={(value) => updateField("eligible_countries", value)}
                      rows={4}
                      placeholder="Pakistan&#10;All countries"
                    />
                    <TextArea
                      label="Required documents"
                      value={form.required_documents}
                      onChange={(value) => updateField("required_documents", value)}
                      rows={4}
                      placeholder="Transcript&#10;Passport&#10;SOP"
                    />
                  </div>

                  <TextArea
                    label="Tags"
                    value={form.tags}
                    onChange={(value) => updateField("tags", value)}
                    rows={3}
                    placeholder="fully funded&#10;pakistani students&#10;without ielts"
                  />
                </CardContent>
              </Card>
            </div>

            <aside className="grid content-start gap-4">
              {opportunity ? (
                <SocialImageUploadCard
                  initialImage={opportunity.social_image}
                  onUpload={(image, imagePrompt) =>
                    uploadAdminOpportunitySocialImage(opportunity.id, image, imagePrompt)
                  }
                  onSavePost={(postText, imagePrompt, linkUrl) =>
                    saveAdminOpportunitySocialPostReview(opportunity.id, {
                      post_text: postText,
                      image_prompt: imagePrompt,
                      link_url: linkUrl,
                    })
                  }
                  onPostNow={
                    opportunity.status === "published"
                      ? (force) => postScholarshipToFacebookNow(opportunity.id, { force })
                      : undefined
                  }
                />
              ) : null}

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">Publish readiness</h2>

                  {publishReadiness.length === 0 ? (
                    <div className="rounded-xl border border-pine/15 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine dark:border-pine/25 dark:bg-pine/10">
                      Core fields look ready. Verify against the official source before publishing.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {publishReadiness.map((item) => (
                        <Badge key={item} tone="saffron">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">Publishing</h2>

                  <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    Status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value as OpportunityStatus)
                      }
                      className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>

                  <div className="grid gap-2">
                    <Toggle
                      label="Featured"
                      checked={form.featured}
                      onChange={(checked) => updateField("featured", checked)}
                    />
                    <Toggle
                      label="Verified"
                      checked={form.verified_status}
                      onChange={(checked) => updateField("verified_status", checked)}
                    />
                  </div>

                  <TextArea
                    label="Verification note"
                    value={form.verification_note}
                    onChange={(value) => updateField("verification_note", value)}
                    rows={3}
                    placeholder="Checked official source and deadline."
                  />

                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Save size={15} aria-hidden="true" />
                    )}
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    Deadline and source
                  </h2>

                  <Toggle
                    label="Rolling deadline"
                    checked={form.is_rolling_deadline}
                    onChange={(checked) => updateField("is_rolling_deadline", checked)}
                  />

                  <TextInput
                    label="Deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(value) => updateField("deadline", value)}
                  />

                  <TextInput
                    label="Official link"
                    value={form.official_link}
                    onChange={(value) => updateField("official_link", value)}
                  />

                  <TextInput
                    label="Source URL"
                    value={form.source_url}
                    onChange={(value) => updateField("source_url", value)}
                  />

                  <TextInput
                    label="Source name"
                    value={form.source_name}
                    onChange={(value) => updateField("source_name", value)}
                  />

                  <div className="flex flex-wrap gap-2">
                    {form.official_link ? (
                      <a
                        href={form.official_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 py-2 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Official
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : null}
                    {form.source_url ? (
                      <a
                        href={form.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 py-2 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Source
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {opportunity ? (
                <DeadlineVerificationCard
                  opportunity={opportunity}
                  deadlinePackage={deadlinePackage}
                  deadlineChecking={deadlineChecking}
                  deadlineApplying={deadlineApplying}
                  deadlineMessage={deadlineMessage}
                  deadlineError={deadlineError}
                  onPrepare={() => void handlePrepareDeadlineCheck()}
                  onApply={(date, evidence, sourceUrl) =>
                    void handleApplyDetectedDeadline(date, evidence, sourceUrl)
                  }
                />
              ) : null}

              <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-2 p-3 md:p-4">
                  <h2 className="text-lg font-bold text-ink dark:text-white">Language and fees</h2>

                  <Toggle
                    label="Application fee required"
                    checked={form.application_fee_required}
                    onChange={(checked) => updateField("application_fee_required", checked)}
                  />
                  <Toggle
                    label="IELTS required"
                    checked={form.ielts_required}
                    onChange={(checked) => updateField("ielts_required", checked)}
                  />
                  <Toggle
                    label="TOEFL required"
                    checked={form.toefl_required}
                    onChange={(checked) => updateField("toefl_required", checked)}
                  />
                  <Toggle
                    label="Duolingo required"
                    checked={form.duolingo_required}
                    onChange={(checked) => updateField("duolingo_required", checked)}
                  />
                  <Toggle
                    label="HSK required"
                    checked={form.hsk_required}
                    onChange={(checked) => updateField("hsk_required", checked)}
                  />
                  <Toggle
                    label="English certificate accepted"
                    checked={form.english_proficiency_certificate_accepted}
                    onChange={(checked) =>
                      updateField("english_proficiency_certificate_accepted", checked)
                    }
                  />
                </CardContent>
              </Card>
            </aside>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminScholarshipEditPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminScholarshipEditContent />
    </ProtectedRoute>
  );
}
