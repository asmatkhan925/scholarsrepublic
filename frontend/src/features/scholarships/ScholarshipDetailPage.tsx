"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
import { getSavedOpportunitySlugs, getScholarship, getScholarshipMatch } from "@/lib/api";
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
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70">{content}</div>
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
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 rounded-2xl border border-pine/10 bg-[#f7faf8] px-4 py-3 text-sm leading-6 text-ink/70"
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
    <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-ink/50">{helper}</p> : null}
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
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Match score</p>
          <p className="mt-3 text-sm leading-6 text-ink/65">Calculating your profile match...</p>
        </CardContent>
      </Card>
    );
  }

  if (matchError) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Match score</p>
          <h2 className="mt-2 text-lg font-bold text-ink">Complete your profile first</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Add your education, goals, and target countries to calculate your fit for this
            scholarship.
          </p>
          <ButtonLink href="/dashboard/profile" className="mt-4" size="sm" variant="secondary">
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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Match score</p>
            <h2 className="mt-2 text-lg font-bold text-ink">Based on your profile</h2>
          </div>
          <Badge tone={getReadinessTone(match.readiness_level)}>{match.readiness_level}</Badge>
        </div>

        <div className="mt-5 rounded-2xl border border-pine/10 bg-mint/35 p-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-3xl font-black tracking-tight text-pine">
              {score}
              <span className="text-base font-bold text-ink/45">/100</span>
            </p>
            <p className="text-sm font-semibold text-ink/60">Profile fit</p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-pine" style={{ width: `${score}%` }} />
          </div>
        </div>

        {match.matched_reasons.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-bold text-ink">Why it may fit</p>
            <ul className="mt-2 grid gap-2">
              {match.matched_reasons.slice(0, 3).map((reason) => (
                <li key={reason} className="flex gap-2 text-sm leading-6 text-ink/65">
                  <ShieldCheck size={15} className="mt-1 shrink-0 text-pine" aria-hidden="true" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {match.missing_requirements.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-saffron/30 bg-saffron/15 p-3">
            <p className="text-sm font-bold text-ink">Check before applying</p>
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-ink/65">
              {match.missing_requirements.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ScholarshipDetailPage() {
  const params = useParams<{ slug: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [scholarship, setScholarship] = useState<OpportunityDetail | null>(null);
  const [match, setMatch] = useState<OpportunityMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadScholarship() {
      setLoading(true);
      setError(null);

      try {
        const data = await getScholarship(params.slug);

        if (mounted) {
          setScholarship(data);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (params.slug) {
      void loadScholarship();
    }

    return () => {
      mounted = false;
    };
  }, [params.slug]);

  useEffect(() => {
    let mounted = true;

    async function loadMatch() {
      if (authLoading || user?.role !== "student" || !params.slug) {
        return;
      }

      setMatchLoading(true);
      setMatchError(null);

      try {
        const data = await getScholarshipMatch(params.slug);

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
  }, [authLoading, params.slug, user?.role]);

  useEffect(() => {
    let mounted = true;

    async function loadSavedState() {
      if (authLoading || user?.role !== "student" || !params.slug) {
        if (mounted) {
          setIsSaved(false);
        }

        return;
      }

      try {
        const response = await getSavedOpportunitySlugs();

        if (mounted) {
          setIsSaved(response.slugs.includes(params.slug));
        }
      } catch {
        if (mounted) {
          setIsSaved(false);
        }
      }
    }

    void loadSavedState();

    return () => {
      mounted = false;
    };
  }, [authLoading, params.slug, user?.role]);

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

      <main className="bg-[#f7faf8]">
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
              <section className="overflow-hidden rounded-[1.75rem] border border-pine/10 bg-white shadow-soft">
                <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-5 py-5 md:px-7">
                  <div className="grid gap-3 xl:grid-cols-[1fr_21rem] xl:items-start">
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
                        ) : null}
                        {isSaved ? <Badge tone="sky">Saved</Badge> : null}
                        {scholarship.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} tone="neutral">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <h1 className="mt-4 max-w-5xl text-2xl font-bold tracking-tight text-ink md:text-4xl">
                        {scholarship.title}
                      </h1>

                      <p className="mt-3 text-sm leading-7 text-ink/70 md:text-base">
                        {provider} · {scholarship.country || "Country not listed"}
                      </p>

                      {scholarship.short_description ? (
                        <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/70 md:text-base">
                          {scholarship.short_description}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-pine/10 bg-white/90 p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                        {isAuthenticated && user?.role === "student"
                          ? "Student actions"
                          : isAuthenticated
                            ? "Admin actions"
                            : "Check eligibility"}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-ink/65">
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
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-mint/40"
                          >
                            Official Website
                            <ExternalLink size={15} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>

                      <p className="mt-3 text-xs leading-5 text-ink/50">
                        Verify details on official site.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid divide-y divide-pine/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                  {facts.slice(0, 4).map((fact) => (
                    <div key={fact.label} className="px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                        {fact.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink">{fact.value}</p>
                      {fact.helper ? (
                        <p className="mt-1 text-xs text-ink/50">{fact.helper}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-[1fr_22rem]">
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

                <aside className="grid content-start gap-3">
                  {user?.role === "student" ? (
                    <MatchScoreSidebarCard
                      match={match}
                      matchError={matchError}
                      matchLoading={matchLoading}
                    />
                  ) : null}

                  <Card>
                    <CardContent className="p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                        Key facts
                      </p>
                      <div className="mt-4 grid gap-3">
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
                          <div className="mt-4">
                            <h3 className="text-sm font-bold text-ink">Fields</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {scholarship.fields_of_study.slice(0, 8).map((item) => (
                                <Badge key={item} tone="sky">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {scholarship.eligible_countries.length > 0 ? (
                          <div className="mt-4">
                            <h3 className="text-sm font-bold text-ink">Eligible countries</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {scholarship.eligible_countries.slice(0, 8).map((item) => (
                                <Badge key={item} tone="neutral">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {scholarship.target_regions.length > 0 ? (
                          <div className="mt-4">
                            <h3 className="text-sm font-bold text-ink">Target regions</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
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

                  {scholarship.source_name || scholarship.source_url ? (
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                          Source
                        </p>
                        <div className="mt-3 flex items-start gap-3 text-sm leading-6 text-ink/65">
                          <Globe2
                            size={18}
                            className="mt-1 shrink-0 text-pine"
                            aria-hidden="true"
                          />
                          <div>
                            <p>{scholarship.source_name || "Official source"}</p>
                            {scholarship.source_url ? (
                              <a
                                href={scholarship.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-pine hover:text-ink"
                              >
                                Visit source
                              </a>
                            ) : null}
                          </div>
                        </div>
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
