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
import { MatchScoreBadge, MatchScoreDialog } from "@/components/opportunities/MatchScoreBadge";
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

function CompactMatchHint({
  type,
  count,
  fallback,
  title,
}: {
  type: "fit" | "check";
  count: number;
  fallback: string;
  title: string;
}) {
  const Icon = type === "fit" ? ShieldCheck : TriangleAlert;

  return (
    <span
      title={title || fallback}
      className={
        type === "fit"
          ? "inline-flex cursor-help items-center gap-1.5 rounded-full border border-pine/15 bg-pine/5 px-2.5 py-1 text-xs font-semibold text-pine dark:border-pine/25 dark:bg-pine/10"
          : "inline-flex cursor-help items-center gap-1.5 rounded-full border border-saffron/30 bg-saffron/15 px-2.5 py-1 text-xs font-semibold text-ink/70 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/65"
      }
    >
      <Icon size={13} aria-hidden="true" />
      {type === "fit" ? "Why it fits" : "Check"} {count > 0 ? `(${count})` : ""}
    </span>
  );
}

function RecommendationCard({ item }: { item: RecommendedOpportunity }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { opportunity, match } = item;
  const provider =
    opportunity.university_name ||
    opportunity.provider_name ||
    opportunity.company_name ||
    "Provider not listed";

  const degreeTags = opportunity.degree_levels.slice(0, 2);
  const fieldTags = opportunity.fields_of_study.slice(0, 2);
  const deadlineTone = getDeadlineTone(opportunity.days_until_deadline);
  const fitTitle =
    match.matched_reasons.length > 0
      ? match.matched_reasons.slice(0, 4).join(" • ")
      : "Your profile has partial overlap with this scholarship.";
  const checkTitle =
    match.missing_requirements.length > 0
      ? match.missing_requirements.slice(0, 4).join(" • ")
      : "No major missing requirement detected from your profile.";

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_16.5rem]">
          <div className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={deadlineTone}>{getDeadlineLabel(opportunity.days_until_deadline)}</Badge>
              <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
              {opportunity.verified_status ? <Badge tone="mint">Verified</Badge> : null}
            </div>

            <h2 className="mt-2 text-lg font-bold leading-snug text-ink dark:text-white md:text-xl">
              {opportunity.title}
            </h2>

            <p className="mt-1.5 text-sm leading-5 text-ink/62 dark:text-white/58">
              {provider} · {opportunity.country || "Country not listed"}
            </p>

            {opportunity.short_description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/62 dark:text-white/56">
                {opportunity.short_description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
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

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <CompactMatchHint
                type="fit"
                count={match.matched_reasons.length}
                fallback="Your profile has partial overlap with this scholarship."
                title={fitTitle}
              />
              <CompactMatchHint
                type="check"
                count={match.missing_requirements.length}
                fallback="No major missing requirement detected from your profile."
                title={checkTitle}
              />
            </div>

            {match.suggestions.length > 0 ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                <p className="line-clamp-2 text-sm leading-5 text-ink/65 dark:text-white/58">
                  {match.suggestions[0]}
                </p>
              </div>
            ) : null}
          </div>

          <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <div className="flex flex-col gap-2">
              <MatchScoreBadge
                match={match}
                onClick={() => setDialogOpen(true)}
                className="w-full justify-center rounded-xl px-2.5 py-2 shadow-none ring-0"
              />

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

            <div className="mt-2 rounded-xl bg-[#f7faf8] px-3 py-2 dark:bg-[#181b1d]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
                Deadline
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">
                {formatDate(opportunity.deadline)}
              </p>
            </div>
          </aside>
        </div>

        <MatchScoreDialog
          match={match}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
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
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-3 py-3 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem] xl:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                  Student workspace
                </p>
                <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
                  Recommended scholarships
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                  Shortlist scholarships based on your profile, deadlines, and readiness.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Matches
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Strong
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.strong}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Medium
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.medium}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Urgent
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.urgent}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 border-t border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_12rem]">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/35"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  placeholder="Search title, country, field..."
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Match
              <select
                value={matchFilter}
                onChange={(event) => setMatchFilter(event.target.value as MatchFilter)}
                className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
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
          <section className="grid gap-3">
            {filteredRecommendations.map((item) => (
              <RecommendationCard key={item.opportunity.id} item={item} />
            ))}
          </section>
        ) : null}

        {!loading && !error && recommendations.length > 0 ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
                  <GraduationCap size={17} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-ink dark:text-white">Use recommendations carefully</h2>
                  <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-white/58">
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
