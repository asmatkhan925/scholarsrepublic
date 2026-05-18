"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StartApplicationButton } from "@/components/applications/StartApplicationButton";
import { DashboardShell } from "@/components/dashboard-shell";
import { SaveOpportunityButton } from "@/components/opportunities/SaveOpportunityButton";
import { Badge, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import { getRecommendedScholarships } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { RecommendedOpportunity, RecommendedOpportunityResponse } from "@/types/opportunity";

type MatchFilter = "all" | "high" | "medium" | "low";

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
    month: "short",
    day: "numeric",
  }).format(new Date(value));
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

function getDeadlineTone(days: number | null): "mint" | "saffron" | "danger" | "sky" {
  if (days === null) {
    return "sky";
  }

  if (days < 0) {
    return "danger";
  }

  if (days <= 14) {
    return "saffron";
  }

  return "mint";
}

function getDeadlineLabel(days: number | null) {
  if (days === null) {
    return "Rolling";
  }

  if (days < 0) {
    return "Expired";
  }

  return `${days} days left`;
}

function MatchScorePanel({ item }: { item: RecommendedOpportunity }) {
  const score = Math.min(Math.max(item.match.score, 0), 100);

  return (
    <div className="rounded-2xl border border-pine/10 bg-mint/35 p-4 dark:border-white/10 dark:bg-pine/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">Match score</p>
          <p className="mt-1 text-sm font-semibold text-ink/65 dark:text-white/58">Based on your profile</p>
        </div>
        <Badge tone={getReadinessTone(item.match.readiness_level)}>
          {item.match.readiness_level}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-black tracking-tight text-pine">
            {score}
            <span className="text-base font-bold text-ink/45">/100</span>
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">Fit</p>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-white/10">
          <div className="h-full rounded-full bg-pine" style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ item }: { item: RecommendedOpportunity }) {
  const { opportunity, match } = item;
  const provider =
    opportunity.university_name ||
    opportunity.provider_name ||
    opportunity.company_name ||
    "Provider not listed";

  const degreeTags = opportunity.degree_levels.slice(0, 3);
  const fieldTags = opportunity.fields_of_study.slice(0, 2);
  const deadlineTone = getDeadlineTone(opportunity.days_until_deadline);

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[1fr_19rem]">
          <div className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={deadlineTone}>{getDeadlineLabel(opportunity.days_until_deadline)}</Badge>
              <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
              {opportunity.verified_status ? <Badge tone="mint">Verified</Badge> : null}
            </div>

            <h2 className="mt-3 text-lg font-bold leading-snug text-ink dark:text-white md:text-xl">
              {opportunity.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
              {provider} · {opportunity.country || "Country not listed"}
            </p>

            {opportunity.short_description ? (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                {opportunity.short_description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {degreeTags.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {fieldTags.map((field) => (
                <Badge key={field} tone="sky">
                  {field}
                </Badge>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-pine">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink dark:text-white">Why it fits</h3>
                </div>

                {match.matched_reasons.length > 0 ? (
                  <ul className="mt-3 grid gap-2">
                    {match.matched_reasons.slice(0, 3).map((reason) => (
                      <li key={reason} className="text-sm leading-6 text-ink/65 dark:text-white/58">
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/58">
                    Your profile has partial overlap with this scholarship.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-saffron/30 bg-saffron/15 p-4 dark:border-saffron/25 dark:bg-saffron/10">
                <div className="flex items-center gap-2 text-pine">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink dark:text-white">Check before applying</h3>
                </div>

                {match.missing_requirements.length > 0 ? (
                  <ul className="mt-3 grid gap-2">
                    {match.missing_requirements.slice(0, 3).map((requirement) => (
                      <li key={requirement} className="text-sm leading-6 text-ink/65 dark:text-white/58">
                        {requirement}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink/65">
                    No major missing requirement detected from your profile.
                  </p>
                )}
              </div>
            </div>

            {match.suggestions.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-pine/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-pine">
                  <Sparkles size={16} aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink dark:text-white">Suggested next step</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/58">{match.suggestions[0]}</p>
              </div>
            ) : null}
          </div>

          <div className="border-t border-pine/10 bg-white p-4 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <MatchScorePanel item={item} />

            <div className="mt-4 grid gap-2">
              <ButtonLink
                href={`/scholarships/${opportunity.slug}`}
                className="w-full"
                size="sm"
                variant="outline"
              >
                View Details
                <ArrowRight size={15} aria-hidden="true" />
              </ButtonLink>

              <SaveOpportunityButton opportunityType="scholarship" slug={opportunity.slug} />

              <StartApplicationButton
                opportunitySlug={opportunity.slug}
                opportunityType="scholarship"
              />
            </div>

            <div className="mt-4 rounded-2xl bg-[#f7faf8] px-4 py-3 dark:bg-[#181b1d]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Deadline</p>
              <p className="mt-1 text-sm font-bold text-ink dark:text-white">{formatDate(opportunity.deadline)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsContent() {
  const [data, setData] = useState<RecommendedOpportunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      setLoading(true);
      setError(null);

      try {
        const response = await getRecommendedScholarships();

        if (mounted) {
          setData(response);
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

    void loadRecommendations();

    return () => {
      mounted = false;
    };
  }, []);

  const recommendations = useMemo(() => data?.results ?? [], [data?.results]);

  const filteredRecommendations = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return recommendations.filter((item) => {
      const opportunity = item.opportunity;
      const searchable = [
        opportunity.title,
        opportunity.country,
        opportunity.provider_name,
        opportunity.university_name,
        opportunity.company_name,
        opportunity.short_description,
        ...opportunity.degree_levels,
        ...opportunity.fields_of_study,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchValue || searchable.includes(searchValue);
      const matchesFilter =
        matchFilter === "all" || item.match.readiness_level.toLowerCase() === matchFilter;

      return matchesSearch && matchesFilter;
    });
  }, [matchFilter, recommendations, search]);

  const stats = useMemo(() => {
    const strong = recommendations.filter((item) => item.match.readiness_level === "High").length;
    const medium = recommendations.filter((item) => item.match.readiness_level === "Medium").length;
    const urgent = recommendations.filter((item) => {
      const days = item.opportunity.days_until_deadline;
      return days !== null && days >= 0 && days <= 14;
    }).length;

    return {
      total: recommendations.length,
      strong,
      medium,
      urgent,
    };
  }, [recommendations]);

  return (
    <DashboardShell
      description="Review scholarships matched to your student profile."
      hideHeader
      title="Recommendations"
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-4 py-4 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
                  Student workspace
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink dark:text-white md:text-3xl">
                  Recommended scholarships
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-ink/65 dark:text-white/60 xl:whitespace-nowrap">
                  Focus on scholarships that match your profile, deadlines, and application
                  readiness.
                </p>
              </div>

              <ButtonLink
                href="/dashboard/profile"
                className="w-full sm:w-auto"
                size="sm"
                variant="outline"
              >
                Improve Profile
              </ButtonLink>
            </div>
          </div>

          <div className="grid divide-y divide-pine/10 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Matches</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{stats.total}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Current recommendations</p>
            </div>
            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Strong</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{stats.strong}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">High readiness</p>
            </div>
            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Medium</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{stats.medium}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Needs checking</p>
            </div>
            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Urgent</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{stats.urgent}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Due within 14 days</p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-pine/10 bg-[#f7faf8] p-4 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_14rem]">
            <label className="grid gap-2 text-sm font-semibold text-ink dark:text-white">
              Search recommendations
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-2xl border border-pine/15 bg-white py-3 pl-9 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
                  placeholder="Search title, country, field..."
                />
              </div>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Match level
              <select
                value={matchFilter}
                onChange={(event) => setMatchFilter(event.target.value as MatchFilter)}
                className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              >
                <option value="all">All matches</option>
                <option value="high">High only</option>
                <option value="medium">Medium only</option>
                <option value="low">Low only</option>
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-6 text-sm text-ink/70 dark:text-white/60">
              Loading recommendations...
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-saffron/30 bg-saffron/15 p-4 text-sm leading-6 text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
            <p>{error}</p>
            <div className="mt-3">
              <ButtonLink href="/dashboard/profile" size="sm" variant="secondary">
                Complete Profile
              </ButtonLink>
            </div>
          </div>
        ) : null}

        {!loading && !error && recommendations.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/dashboard/profile">
                Complete Profile
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description="Complete your education, countries, field of study, documents, and goals so Scholars Republic can calculate useful matches."
            icon={<Target size={22} aria-hidden="true" />}
            title="No recommendations yet"
          />
        ) : null}

        {!loading &&
        !error &&
        recommendations.length > 0 &&
        filteredRecommendations.length === 0 ? (
          <EmptyState
            description="Try clearing search or selecting a different match level."
            icon={<Search size={22} aria-hidden="true" />}
            title="No recommendations match this filter"
          />
        ) : null}

        {!loading && !error && filteredRecommendations.length > 0 ? (
          <section className="grid gap-4">
            {filteredRecommendations.map((item) => (
              <RecommendationCard key={item.opportunity.id} item={item} />
            ))}
          </section>
        ) : null}

        {!loading && !error && recommendations.length > 0 ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
                  <GraduationCap size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-ink dark:text-white">Use recommendations carefully</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                    Match scores help you shortlist faster, but always verify eligibility, official
                    rules, and deadlines on the scholarship website before applying.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function RecommendationsPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <RecommendationsContent />
    </ProtectedRoute>
  );
}
