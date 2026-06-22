"use client";

import axios from "axios";
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Save, Sparkles } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  createStudentProfile,
  getCountries,
  getStudentProfile,
  getStudyFields,
  patchStudentProfile,
} from "@/lib/api";
import { api } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/errors";
import { COUNTRY_REGIONS, DOCUMENT_OPTIONS } from "@/lib/profile-options";
import type { StudentProfilePayload } from "@/types/profile";

import {
  ArrayField,
  CountryRegionMap,
  EMPTY_PROFILE,
  FALLBACK_STUDY_FIELD_CATEGORIES,
  FieldCategoryMap,
  FieldName,
  MISSING_FIELD_SECTION,
  PREFERRED_INTAKE_OPTIONS,
} from "./profile-constants";
import {
  completionFromProfile,
  constrainProfilePayload,
  getReadinessTone,
  normalizePayload,
  sanitizeFieldValue,
  validateProfilePayload,
  withProfileDefaults,
} from "./profile-utils";
import { CvAutofillModal } from "./CvAutofillModal";
import { ProfileSectionNav } from "./ProfileSectionNav";
import { AlertsSection } from "./sections/AlertsSection";
import { DocumentsSection } from "./sections/DocumentsSection";
import { EducationSection } from "./sections/EducationSection";
import { FundingSection } from "./sections/FundingSection";
import { PersonalSection } from "./sections/PersonalSection";
import { ResearchSection } from "./sections/ResearchSection";
import { TargetsSection } from "./sections/TargetsSection";
import { TestsSection } from "./sections/TestsSection";

function ProfilePageContent() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);
  const [completion, setCompletion] = useState(completionFromProfile(null));
  const [countryRegions, setCountryRegions] = useState<CountryRegionMap>(
    COUNTRY_REGIONS as CountryRegionMap,
  );
  const [studyFieldCategories, setStudyFieldCategories] = useState<FieldCategoryMap>(
    FALLBACK_STUDY_FIELD_CATEGORIES,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const pendingNavigationHrefRef = useRef<string | null>(null);
  const allowUnsafeNavigationRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [cvDownloading, setCvDownloading] = useState(false);
  const [showCvAutofill, setShowCvAutofill] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getStudentProfile();

        if (mounted) {
          setForm(constrainProfilePayload(withProfileDefaults({ ...EMPTY_PROFILE, ...profile })));
          setCompletion(completionFromProfile(profile));
          setProfileExists(true);
          setHasUnsavedChanges(false);
        }
      } catch (requestError) {
        if (mounted) {
          if (axios.isAxiosError(requestError) && requestError.response?.status === 404) {
            setMessage("Create your scholarship readiness profile.");
          } else {
            setError(getErrorMessage(requestError));
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCountries() {
      try {
        const response = await getCountries();

        if (mounted && Object.keys(response.regions).length > 0) {
          setCountryRegions(response.regions);
        }
      } catch {
        // Keep frontend fallback countries if reference API is unavailable.
      }
    }

    void loadCountries();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadStudyFields() {
      try {
        const response = await getStudyFields();

        if (mounted && Object.keys(response.categories).length > 0) {
          setStudyFieldCategories(response.categories);
        }
      } catch {
        // Keep frontend fallback study fields if reference API is unavailable.
      }
    }

    void loadStudyFields();

    return () => {
      mounted = false;
    };
  }, []);

  function markUnsaved() {
    setHasUnsavedChanges(true);
    setMessage(null);
  }

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowUnsafeNavigationRef.current || !hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const href = anchor.href;

      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(href, window.location.href);

      if (
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search === nextUrl.search &&
        currentUrl.hash !== nextUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      pendingNavigationHrefRef.current = nextUrl.href;
      setPendingNavigationHref(nextUrl.href);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  function setField<K extends FieldName>(name: K, value: StudentProfilePayload[K]) {
    markUnsaved();

    const sanitizedValue = sanitizeFieldValue(name, value) as StudentProfilePayload[K];

    setForm((current) => ({
      ...current,
      [name]: sanitizedValue,
    }));
  }

  function toggleArrayValue(name: ArrayField, value: string) {
    markUnsaved();
    setForm((current) => {
      const values = current[name];

      return {
        ...current,
        [name]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  }

  function textField(name: FieldName) {
    return {
      value: form[name],
      onChange: (value: string) => setField(name, value as never),
    };
  }

  function booleanField(name: FieldName) {
    return {
      checked: Boolean(form[name]),
      onChange: (value: boolean) => setField(name, value as never),
    };
  }

  function multiField(name: ArrayField) {
    return {
      values: form[name],
      onToggle: (value: string) => toggleArrayValue(name, value),
    };
  }

  function commaField(name: ArrayField) {
    return {
      values: form[name],
      onChange: (value: string[]) => setField(name, value as never),
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = normalizePayload(form);
      const validationError = validateProfilePayload(payload);

      if (validationError) {
        setError(validationError);
        setSaving(false);
        return;
      }

      const profile = profileExists
        ? await patchStudentProfile(payload)
        : await createStudentProfile(payload);

      setForm(constrainProfilePayload(withProfileDefaults({ ...EMPTY_PROFILE, ...profile })));
      setCompletion(completionFromProfile(profile));
      setProfileExists(true);
      setHasUnsavedChanges(false);

      const href = pendingNavigationHrefRef.current;
      pendingNavigationHrefRef.current = null;
      setPendingNavigationHref(null);

      if (href) {
        allowUnsafeNavigationRef.current = true;
        window.location.assign(href);
        return;
      }

      setMessage("Profile saved successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const preparedDocumentCount = useMemo(() => {
    const coreDocuments = [
      form.has_cnic,
      form.has_domicile,
      form.has_passport,
      form.has_transcript,
      form.has_degree,
      form.has_cv,
      form.has_sop,
      form.has_study_plan,
      form.has_recommendation_letters,
      form.has_research_proposal,
      form.has_publications,
      form.has_english_proficiency_letter,
      form.has_income_certificate,
      form.has_bank_statement,
      form.has_police_clearance,
      form.has_medical_certificate,
    ].filter(Boolean).length;

    return coreDocuments + form.additional_documents.length;
  }, [form]);

  const countryOptions = useMemo(() => {
    return Array.from(new Set(Object.values(countryRegions).flat())).sort();
  }, [countryRegions]);

  const nextProfileSteps = useMemo(() => {
    return [
      ...completion.missing_profile_fields.slice(0, 3),
      ...completion.missing_core_documents.slice(0, 3),
    ].slice(0, 5);
  }, [completion]);

  // Shared props passed to every section component
  const sectionProps = { form, textField, booleanField, multiField, commaField, setField };

  if (loading) {
    return (
      <DashboardShell description="" hideHeader title="Student Profile">
        <div className="grid gap-3 animate-pulse">
          <div className="h-28 rounded-[1.5rem] bg-slate-100 dark:bg-white/6" />
          <div className="h-11 rounded-2xl bg-slate-100 dark:bg-white/6" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[1.5rem] border border-pine/8 bg-white p-4 dark:border-white/8 dark:bg-[#181b1d]">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-white/10" />
                <div className="grid gap-1.5">
                  <div className="h-4 w-32 rounded bg-slate-100 dark:bg-white/10" />
                  <div className="h-3 w-56 rounded bg-slate-100 dark:bg-white/6" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-10 rounded-xl bg-slate-100 dark:bg-white/6" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardShell>
    );
  }

  async function downloadCV() {
    setCvDownloading(true);
    try {
      const response = await api.get("/profile/cv/download/", { responseType: "blob" });
      const blob = new Blob([response.data as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ScholarshipCV.pdf";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch {
      setError("CV download failed. Make sure your profile is saved, then try again.");
    } finally {
      setCvDownloading(false);
    }
  }

  return (
    <DashboardShell
      description="Keep your profile updated so recommendations and match scores stay useful."
      hideHeader
      title="Student Profile"
    >
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
        {/* ── Hero / readiness banner ── */}
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-3 py-3 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_36rem] xl:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
                  Student profile
                </p>
                <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
                  Improve your scholarship match.
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                  Fill the most important details first. You can save partial progress and return later.
                </p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-white/90 p-2.5 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5">
                <div className="grid gap-1.5 lg:grid-cols-[10rem_1fr] lg:items-stretch">
                  <div className="rounded-xl border border-pine/10 bg-mint/45 px-2.5 py-2 dark:border-white/10 dark:bg-pine/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                        Readiness
                      </p>
                      <Badge tone={getReadinessTone(completion.readiness_level)}>
                        {completion.readiness_level}
                      </Badge>
                    </div>

                    <div className="mt-1 flex items-end justify-between gap-2">
                      <p className="text-2xl font-black leading-none text-pine">
                        {completion.scholarship_readiness_score}
                        <span className="text-sm font-bold text-ink/45 dark:text-white/45">/100</span>
                      </p>
                      <span className="text-[11px] font-semibold text-ink/50 dark:text-white/45">
                        {completion.completion_percentage}%
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-pine"
                        style={{ width: `${completion.completion_percentage}%` }}
                      />
                    </div>

                    {hasUnsavedChanges && (
                      <p className="mt-1.5 text-[10px] font-medium text-pine/60 dark:text-pine/50">
                        Save to update score
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Complete</p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">{completion.completion_percentage}%</p>
                    </div>

                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Docs</p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                        {preparedDocumentCount}
                        <span className="text-[11px] font-bold text-ink/40 dark:text-white/40">/{DOCUMENT_OPTIONS.length}</span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Targets</p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">{form.target_countries.length}</p>
                    </div>

                    <div className="rounded-xl border border-pine/10 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Fields</p>
                      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">{form.target_fields.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Action strip ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-pine/10 px-3 py-2 dark:border-white/8">
            <p className="text-xs text-ink/50 dark:text-white/40">
              Generate a scholarship-ready PDF CV from your saved profile.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCvAutofill(true)}
                className="flex items-center gap-1.5 rounded-lg border border-saffron/40 bg-saffron/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-saffron/20 dark:border-saffron/30 dark:bg-saffron/10 dark:text-white"
              >
                <Sparkles size={12} aria-hidden="true" />
                Auto-fill from CV
              </button>
              <button
                type="button"
                onClick={downloadCV}
                disabled={cvDownloading}
                className="flex items-center gap-1.5 rounded-lg border border-pine/25 bg-white px-3 py-1.5 text-xs font-semibold text-pine transition-colors hover:bg-mint disabled:cursor-not-allowed disabled:opacity-50 dark:border-pine/30 dark:bg-pine/10 dark:text-pine dark:hover:bg-pine/20"
              >
                <Download size={12} aria-hidden="true" />
                {cvDownloading ? "Generating…" : "Download CV"}
              </button>
            </div>
          </div>
        </section>

        {/* ── Section nav ── */}
        <ProfileSectionNav
          missingFields={completion.missing_profile_fields}
          missingDocuments={completion.missing_core_documents}
        />

        {/* ── Next steps card ── */}
        {nextProfileSteps.length > 0 && (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">Next details to complete</p>
                  <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/58">
                    These fields can improve your match score and recommendations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextProfileSteps.map((item) => {
                    const href = MISSING_FIELD_SECTION[item];
                    return href ? (
                      <a key={item} href={href} className="no-underline">
                        <Badge tone="saffron">{item} ↓</Badge>
                      </a>
                    ) : (
                      <Badge key={item} tone="saffron">{item}</Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Status messages ── */}
        {message && (
          <div className="rounded-2xl border border-pine/10 bg-mint/40 p-4 text-sm font-medium text-pine dark:border-pine/20 dark:bg-pine/10">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* ── Profile sections ── */}
        <PersonalSection {...sectionProps} countryOptions={countryOptions} />
        <EducationSection {...sectionProps} studyFieldCategories={studyFieldCategories} />
        <TargetsSection
          {...sectionProps}
          countryRegions={countryRegions}
          studyFieldCategories={studyFieldCategories}
          preferredIntakeOptions={PREFERRED_INTAKE_OPTIONS}
        />
        <TestsSection {...sectionProps} />
        <DocumentsSection {...sectionProps} />
        <ResearchSection {...sectionProps} />
        <FundingSection {...sectionProps} />
        <AlertsSection {...sectionProps} />

        {/* ── Unsaved changes navigation guard ── */}
        {pendingNavigationHref && hasUnsavedChanges && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 px-4 py-5 backdrop-blur-sm dark:bg-black/55 sm:items-center">
            <div className="w-full max-w-md rounded-[1.5rem] border border-pine/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#181b1d]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron/25 text-pine">
                  <Save size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink dark:text-white">You have unsaved changes</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
                    Save your profile before leaving, or continue without saving these changes.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    pendingNavigationHrefRef.current = pendingNavigationHref;
                    formRef.current?.requestSubmit();
                  }}
                >
                  <Save size={16} aria-hidden="true" />
                  {saving ? "Saving..." : "Save and leave"}
                </Button>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const href = pendingNavigationHref;
                      allowUnsafeNavigationRef.current = true;
                      pendingNavigationHrefRef.current = null;
                      setHasUnsavedChanges(false);
                      setPendingNavigationHref(null);

                      if (href) {
                        window.location.assign(href);
                      }
                    }}
                  >
                    Leave without saving
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      pendingNavigationHrefRef.current = null;
                      setPendingNavigationHref(null);
                    }}
                  >
                    Keep editing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sticky save bar ── */}
        <Card className="sticky bottom-3 z-10 border-pine/15 bg-white/95 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#181b1d]/95">
          <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-ink dark:text-white">Save your profile</p>
              <p className="text-sm leading-6 text-ink/60 dark:text-white/58">
                {hasUnsavedChanges
                  ? "You have changes that are not saved yet."
                  : "Better profile data improves matches and recommendations."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/dashboard" variant="outline">
                Back to Dashboard
              </ButtonLink>
              <Button type="submit" disabled={saving}>
                <Save size={16} aria-hidden="true" />
                {saving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {showCvAutofill && (
        <CvAutofillModal
          onClose={() => setShowCvAutofill(false)}
          onApplied={async () => {
            try {
              const profile = await getStudentProfile();
              setForm(constrainProfilePayload(withProfileDefaults({ ...EMPTY_PROFILE, ...profile })));
              setCompletion(completionFromProfile(profile));
              setProfileExists(true);
            } catch (_) {
              // profile refresh failed silently
            }
          }}
        />
      )}
    </DashboardShell>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
