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
import { MatchScoreBadge, MatchScoreDialog } from "@/components/opportunities/MatchScoreBadge";
import { SaveOpportunityButton } from "@/components/opportunities/SaveOpportunityButton";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import { getScholarship, getScholarshipMatch } from "@/lib/api";
import { ScholarshipComments } from "@/features/scholarships/ScholarshipComments";
import { RelatedScholarships } from "@/features/scholarships/RelatedScholarships";
import { ScholarshipSocialShareCard } from "@/features/scholarships/ScholarshipSocialShareCard";
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

function formatFundingAmount(amount: string | number | null | undefined, currency?: string | null) {
  if (amount === null || amount === undefined || amount === "") {
    return "";
  }

  const amountText = String(amount).trim();
  if (!amountText) {
    return "";
  }

  const currencyText = currency?.trim();
  return currencyText ? `${currencyText} ${amountText}` : amountText;
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
    <Card className="overflow-hidden dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="border-b border-pine/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5 md:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
              {icon}
            </span>
            <h2 className="text-base font-black text-ink dark:text-white">{title}</h2>
          </div>
        </div>
        <div className="px-4 py-4 md:px-5">
          <div className="whitespace-pre-line text-sm leading-7 text-ink/72 dark:text-white/64">
            {content}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <Card className="dark:border-white/10 dark:bg-[#181b1d]">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
              <FileText size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-ink dark:text-white">Required documents</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                Required documents are not listed here. Confirm the document checklist on the
                official scholarship page before applying.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
            <FileText size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-ink dark:text-white">Required documents</h2>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
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

function MatchScoreSidebarCard({
  match,
  matchLoading,
  matchError,
}: {
  match: OpportunityMatch | null;
  matchLoading: boolean;
  matchError: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (matchLoading) {
    return (
      <Card className="dark:border-white/10 dark:bg-[#181b1d]">
        <CardContent className="p-3">
          <div className="inline-flex h-8 items-center gap-2 rounded-full border border-pine/10 bg-white/80 px-3 text-xs font-semibold text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pine/45" aria-hidden="true" />
            Checking match
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matchError) {
    return (
      <Card className="dark:border-white/10 dark:bg-[#181b1d]">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">
              Match score
            </p>
            <ButtonLink
              href="/dashboard/profile"
              className="h-8 rounded-xl px-3 text-xs"
              size="sm"
              variant="outline"
            >
              Complete profile
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">Match score</p>

          <MatchScoreBadge
            match={match}
            onClick={() => setDialogOpen(true)}
            className="h-8 rounded-xl px-2.5 py-1.5 shadow-none ring-0"
          />
        </div>

        <MatchScoreDialog match={match} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </CardContent>
    </Card>
  );
}

function TrustSidebarCard({ scholarship }: { scholarship: OpportunityDetail }) {
  const lastVerified = scholarship.last_verified_at
    ? formatDate(scholarship.last_verified_at)
    : null;
  const lastUpdated = scholarship.updated_at ? formatDate(scholarship.updated_at) : null;

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
              Updated
            </p>
            <p
              className="mt-0.5 truncate font-bold text-ink dark:text-white"
              title={lastUpdated || "Not listed"}
            >
              {lastUpdated || "Not listed"}
            </p>
          </div>

          <div className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
              Verified on
            </p>
            <p
              className="mt-0.5 truncate font-bold text-ink dark:text-white"
              title={lastVerified || "Not verified yet"}
            >
              {lastVerified || "Not listed"}
            </p>
          </div>

          {scholarship.source_name ? (
            <div className="col-span-2 rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">
                Source
              </p>
              <p
                className="mt-0.5 truncate font-bold text-ink dark:text-white"
                title={scholarship.source_name}
              >
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

        <div className="mt-2 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 text-xs leading-5 text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/58">
          <p>
            Found a wrong deadline, broken source link, or outdated eligibility note? Let us know so
            we can review it.
          </p>
          <div className="mt-2 grid gap-1.5">
            <ButtonLink
              href="/contact?topic=scholarship-correction"
              size="sm"
              variant="outline"
              className="h-8 rounded-xl px-2 text-[11px]"
            >
              Report incorrect information
            </ButtonLink>
            <ButtonLink
              href="/verification-policy"
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl px-2 text-[11px]"
            >
              Read verification policy
            </ButtonLink>
          </div>
        </div>
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

  const stipendFact = useMemo(() => {
    if (!scholarship) {
      return "Not listed";
    }

    return (
      formatFundingAmount(scholarship.funding_amount, scholarship.funding_currency) || "Not listed"
    );
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
        helper: formatFundingAmount(scholarship.funding_amount, scholarship.funding_currency),
      },
      {
        label: "Stipend",
        value: stipendFact,
      },
      {
        label: "Degree",
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
        label: "Country",
        value: scholarship.country || "Not listed",
        helper: scholarship.city || undefined,
      },
      {
        label: "Application fee",
        value: scholarship.application_fee_required ? "Required" : "No fee listed",
        helper: scholarship.application_fee_amount
          ? `${scholarship.application_fee_amount} ${scholarship.application_fee_currency}`
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
  }, [scholarship, stipendFact]);
  const applyHref = scholarship?.official_link || scholarship?.source_url || "";
  const applyLabel = scholarship?.official_link
    ? "Apply on official website"
    : "Open official source";
  const heroDegreeTags = scholarship?.degree_levels.slice(0, 3) ?? [];
  const heroFieldTags = scholarship?.fields_of_study.slice(0, 3) ?? [];

  return (
    <>
      <SiteHeader />

      <main className="bg-[#f7faf8] transition-colors dark:bg-[#0e1012]">
        <section className="mx-auto max-w-7xl px-4 pb-28 pt-1 sm:px-5 md:px-8 md:py-2">
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

                      <h1 className="mt-4 max-w-5xl text-xl font-bold tracking-tight text-ink dark:text-white md:text-3xl">
                        {scholarship.title}
                      </h1>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-ink/70 dark:text-white/62 md:text-base">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe2 size={16} className="text-pine" aria-hidden="true" />
                          {scholarship.country || "Country not listed"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap size={16} className="text-pine" aria-hidden="true" />
                          {provider}
                        </span>
                      </div>

                      {scholarship.short_description ? (
                        <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/70 dark:text-white/62 md:text-base">
                          {scholarship.short_description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {heroDegreeTags.map((item) => (
                          <Badge key={item} tone="neutral">
                            {item}
                          </Badge>
                        ))}
                        {heroFieldTags.map((item) => (
                          <Badge key={item} tone="sky">
                            {item}
                          </Badge>
                        ))}
                      </div>
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
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-pine px-3 text-sm font-bold text-white shadow-sm transition hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2"
                          >
                            Apply on official website
                            <ExternalLink size={15} aria-hidden="true" />
                          </a>
                        ) : applyHref ? (
                          <a
                            href={applyHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-pine px-3 text-sm font-bold text-white shadow-sm transition hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2"
                          >
                            Open official source
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

                <div className="grid divide-y divide-pine/10 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
                  {facts.slice(0, 5).map((fact) => (
                    <div key={fact.label} className="px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                        {fact.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                        {fact.value}
                      </p>
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

                  <DocumentsSection items={scholarship.required_documents} />

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
                        {facts.slice(5).map((fact) => (
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
                            <h3 className="text-xs font-bold text-ink dark:text-white">
                              Eligible countries
                            </h3>
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
                            <h3 className="text-xs font-bold text-ink dark:text-white">
                              Target regions
                            </h3>
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

                  <ScholarshipSocialShareCard scholarship={scholarship} slug={scholarship.slug} />
                </aside>
              </section>

              <ScholarshipComments slug={scholarship.slug} />

              <RelatedScholarships
                currentSlug={scholarship.slug}
                country={scholarship.country || null}
                fieldsOfStudy={scholarship.fields_of_study}
                fundingType={scholarship.funding_type || null}
              />
            </div>
          ) : null}
        </section>

        {!loading && !error && scholarship ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pine/10 bg-white/95 px-3 py-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
              <SaveOpportunityButton
                opportunityType="scholarship"
                slug={scholarship.slug}
                initiallySaved={isSaved}
                onSavedChange={setIsSaved}
              />

              {applyHref ? (
                <a
                  href={applyHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-pine px-3 text-sm font-bold text-white shadow-sm transition hover:bg-ink"
                >
                  {applyLabel}
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              ) : (
                <span className="inline-flex h-9 items-center justify-center rounded-xl border border-pine/10 bg-[#f7faf8] px-3 text-sm font-semibold text-ink/45">
                  Source pending
                </span>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
