"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { StartApplicationButton } from "@/components/applications/StartApplicationButton";
import { SaveOpportunityButton } from "@/components/opportunities/SaveOpportunityButton";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import { getScholarship, getScholarshipMatch } from "@/lib/api";
import { ScholarshipComments } from "@/features/scholarships/ScholarshipComments";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityDetail, OpportunityMatch } from "@/types/opportunity";

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Rolling or not listed";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function getDeadlineTone(scholarship: OpportunityDetail): "mint" | "saffron" | "danger" | "sky" {
  if (scholarship.days_until_deadline === null) {
    return "sky";
  }

  if (scholarship.days_until_deadline < 0) {
    return "danger";
  }

  if (scholarship.days_until_deadline <= 14) {
    return "saffron";
  }

  return "mint";
}

function getDeadlineLabel(scholarship: OpportunityDetail) {
  if (scholarship.days_until_deadline === null) {
    return "Rolling deadline";
  }

  if (scholarship.days_until_deadline < 0) {
    return "Deadline passed";
  }

  return `${scholarship.days_until_deadline} days left`;
}

function getProvider(scholarship: OpportunityDetail) {
  return (
    scholarship.university_name ||
    scholarship.provider_name ||
    scholarship.company_name ||
    "Provider not listed"
  );
}

function DetailSection({
  title,
  content,
  icon,
}: {
  title: string;
  content: string;
  icon: ReactNode;
}) {
  if (!content) {
    return null;
  }

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink dark:text-white">{title}</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70 dark:text-white/62">{content}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListSection({ title, items, icon }: { title: string; items: string[]; icon: ReactNode }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-ink dark:text-white">{title}</h2>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 text-sm leading-6 text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/62"
                >
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-pine" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FactItem({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div
      className="min-w-[7.5rem] flex-1 rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5"
      title={helper || undefined}
    >
      <div className="flex items-center justify-between gap-1.5">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
          {label}
        </p>
        {helper ? (
          <span className="shrink-0 rounded-full bg-pine/10 px-1.5 py-0.5 text-[9px] font-bold text-pine">
            i
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs font-bold leading-5 text-ink dark:text-white">
        {value}
      </p>
    </div>
  );
}

function getReadinessTone(level: string): "mint" | "saffron" | "danger" | "sky" {
  if (level === "High") {
    return "mint";
  }

  if (level === "Medium") {
    return "saffron";
  }

  if (level === "Low") {
    return "danger";
  }

  return "sky";
}

function MatchScoreSidebarCard({
  match,
  matchLoading,
  matchError,
}: {
  match: OpportunityMatch | null;
  matchLoading: boolean;
  matchError: string | null;
}) {
  if (matchLoading) {
    return (
      <Card className="dark:border-white/10 dark:bg-[#181b1d]">
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Match score</p>
          <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/60">Calculating your profile match...</p>
        </CardContent>
      </Card>
    );
  }

  if (matchError) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Match score</p>
          <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">Complete your profile first</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
            Add your education, goals, and target countries to calculate your fit for this
            scholarship.
          </p>
          <ButtonLink href="/dashboard/profile" className="mt-3" size="sm" variant="secondary">
            Complete Profile
          </ButtonLink>
        </CardContent>
      </Card>
    );
  }

  if (!match) {
    return null;
  }

  const score = Math.min(Math.max(match.score, 0), 100);

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">
            Match score
          </p>
          <Badge tone={getReadinessTone(match.readiness_level)}>{match.readiness_level}</Badge>
        </div>

        <div className="mt-2 rounded-xl border border-pine/10 bg-mint/35 px-2.5 py-2 dark:border-white/10 dark:bg-pine/10">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xl font-black tracking-tight text-pine">
              {score}
              <span className="text-sm font-bold text-ink/45 dark:text-white/45">/100</span>
            </p>
            <p className="text-xs font-semibold text-ink/55 dark:text-white/50">Profile fit</p>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white dark:bg-white/10">
            <div className="h-full rounded-full bg-pine" style={{ width: `${score}%` }} />
          </div>
        </div>

        {match.matched_reasons.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {match.matched_reasons.slice(0, 3).map((reason, index) => (
              <span
                key={reason}
                title={reason}
                className="inline-flex cursor-help items-center gap-1 rounded-full border border-pine/15 bg-pine/5 px-2 py-1 text-[11px] font-semibold text-pine dark:border-pine/25 dark:bg-pine/10"
              >
                <ShieldCheck size={12} aria-hidden="true" />
                Fit {index + 1}
              </span>
            ))}
          </div>
        ) : null}

        {match.missing_requirements.length > 0 ? (
          <div
            className="mt-2 inline-flex cursor-help items-center gap-1.5 rounded-full border border-saffron/30 bg-saffron/15 px-2.5 py-1 text-[11px] font-semibold text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/65"
            title={match.missing_requirements.slice(0, 3).join(" • ")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-saffron" aria-hidden="true" />
            Check {match.missing_requirements.length}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TrustSidebarCard({ scholarship }: { scholarship: OpportunityDetail }) {
  const lastVerified = scholarship.last_verified_at
    ? formatDate(scholarship.last_verified_at)
    : null;

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">
            Verification
          </p>
          <Badge tone={scholarship.verified_status ? "mint" : "neutral"}>
            {scholarship.verified_status ? <BadgeCheck size={13} aria-hidden="true" /> : null}
            {scholarship.verified_status ? "Verified" : "Check source"}
          </Badge>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs leading-5 text-ink/65 dark:text-white/60">
          <div className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
              Deadline
            </p>
            <p className="mt-0.5 truncate font-bold text-ink dark:text-white" title={formatDate(scholarship.deadline)}>
              {formatDate(scholarship.deadline)}
            </p>
          </div>

          <div className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
              Verified
            </p>
            <p className="mt-0.5 truncate font-bold text-ink dark:text-white" title={lastVerified || "Not verified yet"}>
              {lastVerified || "Not listed"}
            </p>
          </div>

          {scholarship.source_name ? (
            <div className="col-span-2 rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
                Source
              </p>
              <p className="mt-0.5 truncate font-bold text-ink dark:text-white" title={scholarship.source_name}>
                {scholarship.source_name}
              </p>
            </div>
          ) : null}

          {scholarship.verification_note ? (
            <p
              className="col-span-2 truncate rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 text-xs font-semibold dark:border-white/10 dark:bg-white/5"
              title={scholarship.verification_note}
            >
              Note: {scholarship.verification_note}
            </p>
          ) : null}

          {!scholarship.verified_status ? (
            <p
              className="col-span-2 cursor-help rounded-xl border border-saffron/30 bg-saffron/15 px-2.5 py-1.5 text-xs font-semibold dark:border-saffron/25 dark:bg-saffron/10"
              title="Always confirm deadline, eligibility, benefits, and application instructions on the official scholarship source before applying."
            >
              Verify official source before applying
            </p>
          ) : null}
        </div>

        {scholarship.official_link || scholarship.source_url ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {scholarship.official_link ? (
              <a
                href={scholarship.official_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-2 text-[11px] font-semibold text-ink shadow-sm transition hover:bg-mint/40 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
              >
                Official
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}

            {scholarship.source_url ? (
              <a
                href={scholarship.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-2 text-[11px] font-semibold text-ink shadow-sm transition hover:bg-mint/40 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
              >
                Source
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type ScholarshipDetailPageProps = {
  initialScholarship?: OpportunityDetail | null;
  slug?: string;
};

export default function ScholarshipDetailPage({
  initialScholarship = null,
  slug,
}: ScholarshipDetailPageProps) {
  const params = useParams<{ slug: string }>();
  const scholarshipSlug = slug ?? params.slug;
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [scholarship, setScholarship] = useState<OpportunityDetail | null>(initialScholarship);
  const [match, setMatch] = useState<OpportunityMatch | null>(null);
  const [loading, setLoading] = useState(!initialScholarship);
  const hasScholarshipRef = useRef(Boolean(initialScholarship));
  const studentFieldsLoadedRef = useRef(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(Boolean(initialScholarship?.is_saved));

  useEffect(() => {
    hasScholarshipRef.current = Boolean(scholarship);
  }, [scholarship]);

  useEffect(() => {
    let mounted = true;

    async function loadScholarship() {
      if (!scholarshipSlug) {
        return;
      }

      const needsPublicFallback = !hasScholarshipRef.current;
      const needsStudentFields =
        !authLoading && user?.role === "student" && !studentFieldsLoadedRef.current;

      if (!needsPublicFallback && !needsStudentFields) {
        return;
      }

      setLoading(!hasScholarshipRef.current);
      setError(null);

      try {
        const data = await getScholarship(scholarshipSlug);

        if (mounted) {
          setScholarship(data);
          hasScholarshipRef.current = true;
          setIsSaved(Boolean(data.is_saved));
          if (user?.role === "student") {
            studentFieldsLoadedRef.current = true;
          }
        }
      } catch (requestError) {
        if (mounted && !hasScholarshipRef.current) {
          const message = getErrorMessage(requestError);
          setError(
            message === "Not found." || message === "Scholarship not found."
              ? "Scholarship not found."
              : "Scholarship details are temporarily unavailable. Please try again later.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadScholarship();

    return () => {
      mounted = false;
    };
  }, [authLoading, scholarshipSlug, user?.role]);

  useEffect(() => {
    let mounted = true;

    async function loadMatch() {
      if (authLoading || user?.role !== "student" || !scholarshipSlug) {
        return;
      }

      setMatchLoading(true);
      setMatchError(null);

      try {
        const data = await getScholarshipMatch(scholarshipSlug);

        if (mounted) {
          setMatch(data);
        }
      } catch (requestError) {
        if (mounted) {
          setMatch(null);
          setMatchError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setMatchLoading(false);
        }
      }
    }

    void loadMatch();

    return () => {
      mounted = false;
    };
  }, [authLoading, scholarshipSlug, user?.role]);

  const provider = useMemo(() => {
    if (!scholarship) {
      return "";
    }

    return getProvider(scholarship);
  }, [scholarship]);

  const facts = useMemo(() => {
    if (!scholarship) {
      return [];
    }

    return [
      {
        label: "Deadline",
        value: formatDate(scholarship.deadline),
      },
      {
        label: "Funding",
        value: humanize(scholarship.funding_type),
        helper: scholarship.funding_amount
          ? `${scholarship.funding_amount} ${scholarship.funding_currency}`
          : undefined,
      },
      {
        label: "Country",
        value: scholarship.country || "Not listed",
        helper: scholarship.city || undefined,
      },
      {
        label: "Degree levels",
        value:
          scholarship.degree_levels.length > 0
            ? scholarship.degree_levels.slice(0, 3).join(", ")
            : "Not listed",
        helper:
          scholarship.degree_levels.length > 3
            ? `+${scholarship.degree_levels.length - 3} more`
            : undefined,
      },
      {
        label: "IELTS",
        value: scholarship.ielts_required ? "Required" : "Not required",
        helper: scholarship.english_proficiency_certificate_accepted
          ? "English proficiency certificate accepted"
          : undefined,
      },
      {
        label: "Application fee",
        value: scholarship.application_fee_required ? "Required" : "No fee listed",
        helper: scholarship.application_fee_amount
          ? `${scholarship.application_fee_amount} ${scholarship.application_fee_currency}`
          : undefined,
      },
      {
        label: "HEC",
        value: scholarship.hec_required ? "Required" : "Not required",
      },
      {
        label: "Apply method",
        value: scholarship.application_method
          ? humanize(scholarship.application_method)
          : "Not listed",
      },
    ];
  }, [scholarship]);

  return (
    <>
      <SiteHeader />

      <main className="bg-[#f7faf8] transition-colors dark:bg-[#0e1012]">
        <section className="mx-auto max-w-7xl px-4 py-1 sm:px-5 md:px-8 md:py-2">
          <ButtonLink
            href="/scholarships"
            className="mb-3 h-8 px-2 text-xs"
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Scholarships
          </ButtonLink>

          {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-ink/70">
                Loading scholarship details...
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && scholarship ? (
            <div className="grid gap-3">
              <section className="overflow-hidden rounded-[1.75rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
                <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-5 py-5 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-7">
                  <div className="grid gap-3 xl:grid-cols-[1fr_22.5rem] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={getDeadlineTone(scholarship)}>
                          {getDeadlineLabel(scholarship)}
                        </Badge>
                        {scholarship.verified_status ? (
                          <Badge tone="mint">
                            <BadgeCheck size={13} aria-hidden="true" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge tone="neutral" className="text-ink/60">
                            Verify official source
                          </Badge>
                        )}
                        {isSaved ? <Badge tone="sky">Saved</Badge> : null}
                        {scholarship.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} tone="neutral">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <h1 className="mt-4 max-w-5xl text-2xl font-bold tracking-tight text-ink dark:text-white md:text-4xl">
                        {scholarship.title}
                      </h1>

                      <p className="mt-3 text-sm leading-7 text-ink/70 dark:text-white/62 md:text-base">
                        {provider} · {scholarship.country || "Country not listed"}
                      </p>

                      {scholarship.short_description ? (
                        <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/70 dark:text-white/62 md:text-base">
                          {scholarship.short_description}
                        </p>
                      ) : null}

                      {scholarship.stipend_summary ? (
                        <div className="mt-3 inline-flex max-w-full items-start gap-2 rounded-2xl border border-saffron/35 bg-saffron/20 px-3 py-2 text-sm font-semibold text-ink dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/80">
                          <Sparkles
                            size={16}
                            className="mt-0.5 shrink-0 text-pine"
                            aria-hidden="true"
                          />
                          <span>
                            Stipend / allowance:{" "}
                            <span className="font-bold">{scholarship.stipend_summary}</span>
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-pine/10 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                        {isAuthenticated && user?.role === "student"
                          ? "Student actions"
                          : isAuthenticated
                            ? "Admin actions"
                            : "Check eligibility"}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
                        {isAuthenticated && user?.role === "student"
                          ? "Save this scholarship or add it to your tracker."
                          : isAuthenticated
                            ? "Review this scholarship from your admin account."
                            : "Create a profile to save, track, and check your match."}
                      </p>

                      <div className="mt-3 grid gap-2">
                        {isAuthenticated && user?.role === "student" ? (
                          <>
                            <SaveOpportunityButton
                              opportunityType="scholarship"
                              slug={scholarship.slug}
                              initiallySaved={isSaved}
                              onSavedChange={setIsSaved}
                            />

                            <StartApplicationButton
                              opportunitySlug={scholarship.slug}
                              opportunityType="scholarship"
                              savedOpportunityId={scholarship.saved_opportunity_id ?? undefined}
                              initiallyTracked={Boolean(scholarship.is_tracking)}
                              onStarted={(application) => {
                                setScholarship((current) =>
                                  current
                                    ? {
                                        ...current,
                                        application_id: application.id,
                                        is_tracking: true,
                                      }
                                    : current,
                                );
                              }}
                            />
                          </>
                        ) : isAuthenticated ? (
                          <ButtonLink
                            href="/admin"
                            className="w-full"
                            size="sm"
                            variant="secondary"
                          >
                            Admin Dashboard
                          </ButtonLink>
                        ) : (
                          <>
                            <ButtonLink
                              href="/register"
                              className="w-full"
                              size="sm"
                              variant="secondary"
                            >
                              Create Free Profile
                            </ButtonLink>
                            <ButtonLink
                              href="/login"
                              className="w-full"
                              size="sm"
                              variant="outline"
                            >
                              Login to Save
                            </ButtonLink>
                          </>
                        )}

                        {scholarship.official_link ? (
                          <a
                            href={scholarship.official_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-2.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-mint/40 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
                          >
                            Official Website
                            <ExternalLink size={15} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>

                      <p
                        className="mt-2 cursor-help text-xs leading-5 text-ink/45 dark:text-white/40"
                        title="Always confirm deadline, eligibility, benefits, and application instructions on the official scholarship source before applying."
                      >
                        Verify official source before applying.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid divide-y divide-pine/10 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                  {facts.slice(0, 4).map((fact) => (
                    <div key={fact.label} className="px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                        {fact.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink dark:text-white">{fact.value}</p>
                      {fact.helper ? (
                        <p className="mt-1 text-xs text-ink/50 dark:text-white/45">{fact.helper}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="grid gap-3">
                  <DetailSection
                    title="Overview"
                    content={scholarship.description || scholarship.short_description}
                    icon={<BookOpenCheck size={20} aria-hidden="true" />}
                  />

                  <DetailSection
                    title="Benefits"
                    content={scholarship.benefits}
                    icon={<Sparkles size={20} aria-hidden="true" />}
                  />

                  <DetailSection
                    title="Eligibility"
                    content={scholarship.eligibility}
                    icon={<ShieldCheck size={20} aria-hidden="true" />}
                  />

                  <ListSection
                    title="Required documents"
                    items={scholarship.required_documents}
                    icon={<FileText size={20} aria-hidden="true" />}
                  />

                  <DetailSection
                    title="How to apply"
                    content={scholarship.how_to_apply}
                    icon={<GraduationCap size={20} aria-hidden="true" />}
                  />
                </div>

                <aside className="grid content-start gap-2">
                  {user?.role === "student" ? (
                    <MatchScoreSidebarCard
                      match={match}
                      matchError={matchError}
                      matchLoading={matchLoading}
                    />
                  ) : null}

                  <TrustSidebarCard scholarship={scholarship} />

                  <Card className="dark:border-white/10 dark:bg-[#181b1d]">
                    <CardContent className="p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">
                        Key facts
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {facts.slice(4).map((fact) => (
                          <FactItem
                            key={fact.label}
                            label={fact.label}
                            value={fact.value}
                            helper={fact.helper}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {scholarship.fields_of_study.length > 0 ||
                  scholarship.eligible_countries.length > 0 ||
                  scholarship.target_regions.length > 0 ? (
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                          Fit details
                        </p>

                        {scholarship.fields_of_study.length > 0 ? (
                          <div className="mt-3">
                            <h3 className="text-xs font-bold text-ink dark:text-white">Fields</h3>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {scholarship.fields_of_study.slice(0, 8).map((item) => (
                                <Badge key={item} tone="sky">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {scholarship.eligible_countries.length > 0 ? (
                          <div className="mt-3">
                            <h3 className="text-xs font-bold text-ink dark:text-white">Eligible countries</h3>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {scholarship.eligible_countries.slice(0, 8).map((item) => (
                                <Badge key={item} tone="neutral">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {scholarship.target_regions.length > 0 ? (
                          <div className="mt-3">
                            <h3 className="text-xs font-bold text-ink dark:text-white">Target regions</h3>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {scholarship.target_regions.slice(0, 8).map((item) => (
                                <Badge key={item} tone="neutral">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                </aside>
              </section>

              <ScholarshipComments slug={scholarship.slug} />
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
