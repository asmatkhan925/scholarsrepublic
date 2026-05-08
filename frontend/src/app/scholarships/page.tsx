"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, Search, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { MatchScoreBadge } from "@/components/opportunities/MatchScoreBadge";
import { SiteHeader } from "@/components/site-header";
import { getRecommendedScholarships, getScholarships } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  OpportunityListItem,
  OpportunityListResponse,
  OpportunityQueryParams,
  RecommendedOpportunity,
  RecommendedOpportunityResponse,
} from "@/types/opportunity";

const COUNTRIES = ["China", "Taiwan", "Turkey", "Germany", "USA", "Pakistan", "Malaysia"];
const FUNDING_TYPES = [
  { label: "Fully funded", value: "fully_funded" },
  { label: "Partially funded", value: "partially_funded" },
  { label: "Tuition waiver", value: "tuition_waiver" },
  { label: "Need based", value: "need_based" },
  { label: "Merit based", value: "merit_based" },
];

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

function ScholarshipCard({
  scholarship,
  match,
  profileRequired,
}: {
  scholarship: OpportunityListItem;
  match?: RecommendedOpportunity["match"];
  profileRequired?: boolean;
}) {
  const { user, isAuthenticated } = useAuth();
  const eligibilityHref = !isAuthenticated
    ? "/register"
    : user?.role === "student" && profileRequired
      ? "/dashboard/profile"
      : user?.role === "admin"
        ? "/admin"
        : "/dashboard";
  const provider =
    scholarship.university_name ||
    scholarship.provider_name ||
    scholarship.company_name ||
    "Provider not listed";

  return (
    <article className="flex h-full flex-col rounded border border-ink/10 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap gap-2">
        {scholarship.verified_status && (
          <span className="inline-flex items-center gap-2 rounded bg-mint px-3 py-1 text-xs font-semibold text-pine">
            <BadgeCheck size={14} aria-hidden="true" />
            Verified
          </span>
        )}
        {scholarship.featured && (
          <span className="rounded bg-saffron/20 px-3 py-1 text-xs font-semibold text-ink">
            Featured
          </span>
        )}
      </div>

      <h2 className="text-lg font-semibold text-ink">{scholarship.title}</h2>
      <p className="mt-2 text-sm text-ink/65">{scholarship.short_description}</p>

      {match && (
        <div className="mt-4 grid gap-3">
          <MatchScoreBadge score={match.score} readinessLevel={match.readiness_level} />
          {match.matched_reasons.length > 0 && (
            <ul className="grid gap-1 text-sm text-ink/65">
              {match.matched_reasons.slice(0, 2).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <dl className="mt-5 grid gap-2 text-sm text-ink/70">
        <div className="flex justify-between gap-3">
          <dt>Country</dt>
          <dd className="font-medium text-ink">{scholarship.country || "Any"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Provider</dt>
          <dd className="text-right font-medium text-ink">{provider}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Funding</dt>
          <dd className="font-medium text-ink">{humanize(scholarship.funding_type)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Deadline</dt>
          <dd className="text-right font-medium text-ink">{formatDate(scholarship.deadline)}</dd>
        </div>
      </dl>

      {scholarship.days_until_deadline !== null && (
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink/65">
          <CalendarDays size={16} aria-hidden="true" />
          {scholarship.days_until_deadline < 0
            ? "Deadline passed"
            : `${scholarship.days_until_deadline} days left`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {scholarship.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded bg-skyglass px-2 py-1 text-xs text-ink/70">
            {tag}
          </span>
        ))}
      </div>

      {!isAuthenticated && (
        <p className="mt-5 rounded bg-skyglass px-3 py-2 text-sm text-ink/70">
          Create a free profile to check your match score.
        </p>
      )}

      {isAuthenticated && profileRequired && user?.role === "student" && (
        <p className="mt-5 rounded bg-skyglass px-3 py-2 text-sm text-ink/70">
          Complete your profile to see personalized match scores.
        </p>
      )}

      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
        <Link
          href={`/scholarships/${scholarship.slug}`}
          className="rounded border border-ink/15 px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-ink/5"
        >
          View Details
        </Link>
        <Link
          href={eligibilityHref}
          className="rounded bg-pine px-4 py-2 text-center text-sm font-semibold text-white hover:bg-pine/90"
        >
          Check Eligibility
        </Link>
      </div>
    </article>
  );
}

export default function ScholarshipsPage() {
  const [data, setData] = useState<OpportunityListResponse | null>(null);
  const [recommendedData, setRecommendedData] = useState<RecommendedOpportunityResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [fundingType, setFundingType] = useState("");
  const [noIelts, setNoIelts] = useState(false);
  const [noApplicationFee, setNoApplicationFee] = useState(false);
  const [verified, setVerified] = useState(false);
  const [filters, setFilters] = useState<OpportunityQueryParams>({
    ordering: "deadline",
  });

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function loadScholarships() {
      if (authLoading) {
        return;
      }

      setLoading(true);
      setError(null);
      setMatchNotice(null);
      setRecommendedData(null);
      setData(null);

      try {
        if (user?.role === "student") {
          try {
            const response = await getRecommendedScholarships(filters);
            if (mounted) {
              setRecommendedData(response);
            }
            return;
          } catch {
            if (mounted) {
              setMatchNotice("Complete your profile to see personalized match scores.");
            }
          }
        }

        const response = await getScholarships(filters);
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

    void loadScholarships();

    return () => {
      mounted = false;
    };
  }, [authLoading, filters, user?.role]);

  const recommendations = useMemo(() => recommendedData?.results ?? [], [recommendedData]);
  const scholarships = useMemo(
    () =>
      recommendedData ? recommendations.map((item) => item.opportunity) : (data?.results ?? []),
    [data?.results, recommendations, recommendedData],
  );
  const matchByOpportunityId = useMemo(() => {
    return new Map(recommendations.map((item) => [item.opportunity.id, item.match]));
  }, [recommendations]);
  const totalLabel = useMemo(() => {
    if (recommendedData) {
      return `${recommendedData.count} personalized scholarship${
        recommendedData.count === 1 ? "" : "s"
      }`;
    }
    if (!data) {
      return "Loading scholarships";
    }

    return `${data.count} published scholarship${data.count === 1 ? "" : "s"}`;
  }, [data, recommendedData]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      ordering: "deadline",
      search: search || undefined,
      country: country || undefined,
      funding_type: fundingType || undefined,
      no_ielts: noIelts || undefined,
      no_application_fee: noApplicationFee || undefined,
      verified: verified || undefined,
    });
  }

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-pine">Public scholarship browsing</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">
            Scholarships for Pakistani Students
          </h1>
          <p className="mt-3 text-ink/70">
            Browse published scholarship opportunities from the backend database. Create a free
            profile to check eligibility and save opportunities in the next phases.
          </p>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className="mt-8 grid gap-3 rounded border border-ink/10 bg-white p-4 shadow-soft lg:grid-cols-[1.4fr_1fr_1fr_auto]"
        >
          <label className="flex items-center gap-3 rounded border border-ink/10 bg-skyglass px-3 py-2">
            <span className="sr-only">Search scholarships</span>
            <Search size={18} className="text-pine" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by country, provider, degree, or field"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-ink/60">
            <span className="sr-only">Country</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="rounded border border-ink/10 bg-white px-3 py-2 text-sm font-normal text-ink"
            >
              <option value="">All countries</option>
              {COUNTRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-ink/60">
            <span className="sr-only">Funding type</span>
            <select
              value={fundingType}
              onChange={(event) => setFundingType(event.target.value)}
              className="rounded border border-ink/10 bg-white px-3 py-2 text-sm font-normal text-ink"
            >
              <option value="">All funding</option>
              {FUNDING_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-pine px-5 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            Apply Filters
          </button>
          <div className="grid gap-2 text-sm text-ink/70 sm:grid-cols-3 lg:col-span-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noIelts}
                onChange={(event) => setNoIelts(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              No IELTS
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noApplicationFee}
                onChange={(event) => setNoApplicationFee(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              No application fee
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={verified}
                onChange={(event) => setVerified(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Verified only
            </label>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-ink/65">{totalLabel}</p>
          <p className="inline-flex items-center gap-2 text-sm text-ink/55">
            <ShieldCheck size={16} aria-hidden="true" />
            Draft opportunities are hidden from public pages.
          </p>
        </div>

        {matchNotice && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded border border-saffron/40 bg-saffron/15 px-4 py-3 text-sm text-ink/75">
            <span>{matchNotice}</span>
            <Link href="/dashboard/profile" className="font-semibold text-pine hover:underline">
              Complete Profile
            </Link>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded border border-ink/10 bg-white p-6 text-sm text-ink/70">
            Loading scholarships...
          </div>
        )}

        {error && (
          <div className="mt-8 rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && scholarships.length === 0 && (
          <div className="mt-8 rounded border border-ink/10 bg-white p-6 text-sm text-ink/70">
            No published scholarships match these filters yet.
          </div>
        )}

        {!loading && !error && scholarships.length > 0 && (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scholarships.map((scholarship) => (
              <ScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
                match={matchByOpportunityId.get(scholarship.id)}
                profileRequired={Boolean(matchNotice)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
