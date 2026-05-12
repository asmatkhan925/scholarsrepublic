"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";

import {
  ArrowRight,
  BadgeCheck,
  BookmarkCheck,
  CalendarDays,
  GraduationCap,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { MatchScoreBadge } from "@/components/opportunities/MatchScoreBadge";
import { SaveOpportunityButton } from "@/components/opportunities/SaveOpportunityButton";
import { SiteHeader } from "@/components/site-header";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  getCountries,
  getOpportunityPathways,
  getStudyFields,
  getRecommendedScholarships,
  getSavedOpportunitySlugs,
  getScholarships,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  OpportunityListItem,
  OpportunityListResponse,
  OpportunityPathwayDetail,
  OpportunityQueryParams,
  RecommendedOpportunity,
  RecommendedOpportunityResponse,
} from "@/types/opportunity";

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

function getDeadlineTone(scholarship: OpportunityListItem): "mint" | "saffron" | "danger" | "sky" {
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

function getDeadlineLabel(scholarship: OpportunityListItem) {
  if (scholarship.days_until_deadline === null) {
    return "Rolling";
  }

  if (scholarship.days_until_deadline < 0) {
    return "Expired";
  }

  return `${scholarship.days_until_deadline} days left`;
}

function ScholarshipCard({
  scholarship,
  match,
  profileRequired,
  initiallySaved,
  onSavedChange,
}: {
  scholarship: OpportunityListItem;
  match?: RecommendedOpportunity["match"];
  profileRequired?: boolean;
  initiallySaved?: boolean;
  onSavedChange?: (slug: string, saved: boolean) => void;
}) {
  const { user, isAuthenticated } = useAuth();

  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";

  const secondaryHref = !isAuthenticated
    ? "/register"
    : isAdmin
      ? "/admin"
      : profileRequired
        ? "/dashboard/profile"
        : "/dashboard/saved";

  const secondaryLabel = !isAuthenticated
    ? "Create Profile"
    : isAdmin
      ? "Admin"
      : profileRequired
        ? "Complete Profile"
        : "Open Shortlist";

  const provider =
    scholarship.university_name ||
    scholarship.provider_name ||
    scholarship.company_name ||
    "Provider not listed";

  const degreeTags = scholarship.degree_levels.slice(0, 3);
  const fieldTags = scholarship.fields_of_study.slice(0, 2);
  const extraDegreeCount = Math.max(scholarship.degree_levels.length - degreeTags.length, 0);
  const deadlineTone = getDeadlineTone(scholarship);

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex-1 p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={deadlineTone}>{getDeadlineLabel(scholarship)}</Badge>
              {initiallySaved ? (
                <Badge tone="sky">
                  <BookmarkCheck size={13} aria-hidden="true" />
                  Saved
                </Badge>
              ) : null}
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
              {scholarship.featured ? (
                <Badge tone="saffron">
                  <Star size={13} aria-hidden="true" />
                  Featured
                </Badge>
              ) : null}
            </div>

            <div className="w-full shrink-0 sm:w-36">
              <SaveOpportunityButton
                opportunityType="scholarship"
                slug={scholarship.slug}
                initiallySaved={initiallySaved}
                onSavedChange={(saved) => onSavedChange?.(scholarship.slug, saved)}
              />
            </div>
          </div>

          <h2 className="mt-4 text-lg font-bold leading-snug text-ink md:text-xl">
            {scholarship.title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-ink/65">
            {provider} · {scholarship.country || "Country not listed"}
          </p>

          {scholarship.short_description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">
              {scholarship.short_description}
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
                <CalendarDays size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                  Deadline
                </p>
                <p className="mt-1 font-semibold text-ink">{formatDate(scholarship.deadline)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{humanize(scholarship.funding_type)}</Badge>
              {degreeTags.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {extraDegreeCount > 0 ? <Badge tone="neutral">+{extraDegreeCount} more</Badge> : null}
            </div>

            {fieldTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fieldTags.map((field) => (
                  <Badge key={field} tone="sky">
                    {field}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {match ? (
            <div className="mt-4 rounded-2xl border border-pine/10 bg-mint/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <MatchScoreBadge score={match.score} readinessLevel={match.readiness_level} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                  Profile match
                </span>
              </div>

              {match.matched_reasons.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm leading-5 text-ink/65">
                  {match.matched_reasons.slice(0, 2).map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <ShieldCheck
                        size={15}
                        className="mt-0.5 shrink-0 text-pine"
                        aria-hidden="true"
                      />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {!isAuthenticated ? (
            <p className="mt-4 rounded-2xl bg-skyglass px-4 py-3 text-sm leading-6 text-ink/65">
              Create a profile to save scholarships and unlock match scores.
            </p>
          ) : null}

          {isAuthenticated && isStudent && profileRequired ? (
            <p className="mt-4 rounded-2xl bg-saffron/20 px-4 py-3 text-sm leading-6 text-ink/65">
              Complete your profile to see personalized match scores.
            </p>
          ) : null}
        </div>

        <div className="border-t border-pine/10 bg-white p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink href={`/scholarships/${scholarship.slug}`} size="sm" variant="outline">
              View Details
              <ArrowRight size={15} aria-hidden="true" />
            </ButtonLink>

            <ButtonLink href={secondaryHref} size="sm" variant="secondary">
              {secondaryLabel}
            </ButtonLink>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [field, setField] = useState("");
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [rootPathways, setRootPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [childPathways, setChildPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [pathwaysLoading, setPathwaysLoading] = useState(false);
  const [selectedRootPathwaySlug, setSelectedRootPathwaySlug] = useState("");
  const [selectedPathwaySlug, setSelectedPathwaySlug] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCountryOptions() {
      try {
        const response = await getCountries();
        const options = Array.from(new Set(Object.values(response.regions).flat())).sort();

        if (mounted) {
          setCountryOptions(options);
        }
      } catch {
        if (mounted) {
          setCountryOptions([]);
        }
      }
    }

    void loadCountryOptions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFieldOptions() {
      try {
        const response = await getStudyFields();
        const options = Array.from(new Set(Object.values(response.categories).flat())).sort();

        if (mounted) {
          setFieldOptions(options);
        }
      } catch {
        if (mounted) {
          setFieldOptions([]);
        }
      }
    }

    void loadFieldOptions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadRootPathways() {
      setPathwaysLoading(true);

      try {
        const response = await getOpportunityPathways({ root_only: true });

        if (mounted) {
          setRootPathways(response.results);
        }
      } catch {
        if (mounted) {
          setRootPathways([]);
        }
      } finally {
        if (mounted) {
          setPathwaysLoading(false);
        }
      }
    }

    void loadRootPathways();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadChildPathways() {
      if (!selectedRootPathwaySlug) {
        setChildPathways([]);
        return;
      }

      setPathwaysLoading(true);

      try {
        const response = await getOpportunityPathways({ parent: selectedRootPathwaySlug });

        if (mounted) {
          setChildPathways(response.results);
        }
      } catch {
        if (mounted) {
          setChildPathways([]);
        }
      } finally {
        if (mounted) {
          setPathwaysLoading(false);
        }
      }
    }

    void loadChildPathways();

    return () => {
      mounted = false;
    };
  }, [selectedRootPathwaySlug]);

  const [fundingType, setFundingType] = useState("");
  const [noIelts, setNoIelts] = useState(false);
  const [noApplicationFee, setNoApplicationFee] = useState(false);
  const [verified, setVerified] = useState(false);
  const [filters, setFilters] = useState<OpportunityQueryParams>({ ordering: "deadline" });

  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";
  const isLoggedIn = isAuthenticated && !authLoading;

  useEffect(() => {
    let mounted = true;

    async function loadSavedSlugs() {
      if (authLoading || user?.role !== "student") {
        setSavedSlugs(new Set());
        return;
      }

      try {
        const response = await getSavedOpportunitySlugs();

        if (mounted) {
          setSavedSlugs(new Set(response.slugs));
        }
      } catch {
        if (mounted) {
          setSavedSlugs(new Set());
        }
      }
    }

    void loadSavedSlugs();

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.role]);

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

  const resultCount = recommendedData?.count ?? data?.count ?? scholarships.length;

  const selectedPathway = useMemo(() => {
    return [...rootPathways, ...childPathways].find((item) => item.slug === selectedPathwaySlug);
  }, [childPathways, rootPathways, selectedPathwaySlug]);

  const sortedRootPathways = useMemo(() => {
    return [...rootPathways].sort((first, second) => {
      const firstHasPublished = first.published_opportunity_count > 0 ? 0 : 1;
      const secondHasPublished = second.published_opportunity_count > 0 ? 0 : 1;

      if (firstHasPublished !== secondHasPublished) {
        return firstHasPublished - secondHasPublished;
      }

      return first.display_order - second.display_order || first.title.localeCompare(second.title);
    });
  }, [rootPathways]);

  const sortedChildPathways = useMemo(() => {
    return [...childPathways].sort((first, second) => {
      return first.display_order - second.display_order || first.title.localeCompare(second.title);
    });
  }, [childPathways]);

  const quickStats = useMemo(() => {
    const urgent = scholarships.filter((item) => {
      return (
        item.days_until_deadline !== null &&
        item.days_until_deadline >= 0 &&
        item.days_until_deadline <= 14
      );
    }).length;

    const rolling = scholarships.filter((item) => item.deadline === null).length;
    const fullyFunded = scholarships.filter((item) => item.funding_type === "fully_funded").length;

    return { urgent, rolling, fullyFunded };
  }, [scholarships]);

  const heroCopy = useMemo(() => {
    if (authLoading) {
      return {
        badge: "Scholarship search",
        title: "Find scholarships worth applying to.",
        description: "Search scholarships by country, funding, deadline, and profile fit.",
      };
    }

    if (isStudent) {
      return {
        badge: "Student workspace",
        title: "Build your scholarship shortlist.",
        description: "Find, save, and track scholarships from one student workspace.",
      };
    }

    if (isAdmin) {
      return {
        badge: "Scholarship directory",
        title: "Review published scholarships.",
        description: "Browse the public scholarship directory as an administrator.",
      };
    }

    return {
      badge: "Scholarship search",
      title: "Find scholarships worth applying to.",
      description: "Search by country, funding, and deadline. Create a profile when ready.",
    };
  }, [authLoading, isAdmin, isStudent]);

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();

    setFilters({
      ordering: "deadline",
      search: search || undefined,
      country: country || undefined,
      field: field || undefined,
      funding_type: fundingType || undefined,
      pathway: selectedPathwaySlug || undefined,
      no_ielts: noIelts || undefined,
      no_application_fee: noApplicationFee || undefined,
      verified: verified || undefined,
    });
  }

  function handleClearFilters() {
    setSearch("");
    setCountry("");
    setField("");
    setFundingType("");
    setNoIelts(false);
    setNoApplicationFee(false);
    setVerified(false);
    setSelectedRootPathwaySlug("");
    setSelectedPathwaySlug("");
    setFilters({ ordering: "deadline" });
  }

  function handlePathwaySelect(pathway: OpportunityPathwayDetail) {
    setSelectedPathwaySlug(pathway.slug);

    if (!pathway.parent_id) {
      setSelectedRootPathwaySlug(pathway.slug);
    }

    setFilters((current) => ({
      ...current,
      ordering: "deadline",
      pathway: pathway.slug,
    }));
  }

  function handleRootPathwaySelect(pathway: OpportunityPathwayDetail) {
    setSelectedRootPathwaySlug(pathway.slug);
    handlePathwaySelect(pathway);
  }

  function handleClearPathway() {
    setSelectedRootPathwaySlug("");
    setSelectedPathwaySlug("");
    setFilters((current) => {
      const next = { ...current };
      delete next.pathway;

      return {
        ...next,
        ordering: "deadline",
      };
    });
  }

  function handleSavedChange(slug: string, saved: boolean) {
    setSavedSlugs((current) => {
      const next = new Set(current);

      if (saved) {
        next.add(slug);
      } else {
        next.delete(slug);
      }

      return next;
    });
  }

  return (
    <>
      <SiteHeader />

      <main className="bg-[#f7faf8]">
        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <div className="overflow-hidden rounded-[1.75rem] border border-pine/10 bg-white shadow-soft">
            <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-5 py-5 md:px-7">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div className="min-w-0">
                  <Badge tone="mint" className="mb-3">
                    <GraduationCap size={14} aria-hidden="true" />
                    {heroCopy.badge}
                  </Badge>

                  <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl xl:whitespace-nowrap">
                    {heroCopy.title}
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-ink/70 md:text-base xl:whitespace-nowrap">
                    {heroCopy.description}
                  </p>
                </div>

                <div className="grid gap-2 sm:flex xl:justify-end">
                  {isLoggedIn && isStudent ? (
                    <>
                      <ButtonLink
                        href="/dashboard/saved"
                        className="w-full sm:w-auto"
                        size="sm"
                        variant="outline"
                      >
                        <BookmarkCheck size={15} aria-hidden="true" />
                        Saved
                      </ButtonLink>
                      <ButtonLink
                        href="/dashboard/applications"
                        className="w-full sm:w-auto"
                        size="sm"
                        variant="secondary"
                      >
                        Tracker
                      </ButtonLink>
                    </>
                  ) : isLoggedIn && isAdmin ? (
                    <ButtonLink
                      href="/admin"
                      className="w-full sm:w-auto"
                      size="sm"
                      variant="secondary"
                    >
                      Admin Dashboard
                    </ButtonLink>
                  ) : (
                    <>
                      <ButtonLink
                        href="/register"
                        className="w-full sm:w-auto"
                        size="sm"
                        variant="secondary"
                      >
                        Create Profile
                      </ButtonLink>
                      <ButtonLink
                        href="/login"
                        className="w-full sm:w-auto"
                        size="sm"
                        variant="outline"
                      >
                        Login
                      </ButtonLink>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid divide-y divide-pine/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              <div className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Results</p>
                <p className="mt-1 text-2xl font-bold text-ink">{resultCount}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {recommendedData ? "Personalized matches" : "Published scholarships"}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Urgent</p>
                <p className="mt-1 text-2xl font-bold text-ink">{quickStats.urgent}</p>
                <p className="mt-1 text-xs text-ink/50">Due within 14 days</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                  Fully funded
                </p>
                <p className="mt-1 text-2xl font-bold text-ink">{quickStats.fullyFunded}</p>
                <p className="mt-1 text-xs text-ink/50">In current results</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Rolling</p>
                <p className="mt-1 text-2xl font-bold text-ink">{quickStats.rolling}</p>
                <p className="mt-1 text-xs text-ink/50">No fixed deadline</p>
              </div>
            </div>
          </div>

          <Card className="mt-5">
            <CardContent className="p-4 md:p-5">
              <form onSubmit={handleFilterSubmit} className="grid gap-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-pine" aria-hidden="true" />
                  <h2 className="font-bold text-ink">Filter scholarships</h2>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Search
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
                        aria-hidden="true"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Country, provider, degree, field..."
                        className="w-full rounded-2xl border border-pine/15 bg-white py-3 pl-9 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Country
                    <select
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                    >
                      <option value="">All countries</option>
                      {countryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Field
                    <select
                      value={field}
                      onChange={(event) => setField(event.target.value)}
                      className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                    >
                      <option value="">All fields</option>
                      {fieldOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Funding
                    <select
                      value={fundingType}
                      onChange={(event) => setFundingType(event.target.value)}
                      className="rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                    >
                      <option value="">All funding</option>
                      {FUNDING_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-2 sm:flex lg:grid">
                    <Button type="submit" className="w-full" size="sm">
                      Apply
                    </Button>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleClearFilters}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={15} aria-hidden="true" />
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "No IELTS", checked: noIelts, onChange: setNoIelts },
                    {
                      label: "No application fee",
                      checked: noApplicationFee,
                      onChange: setNoApplicationFee,
                    },
                    { label: "Verified only", checked: verified, onChange: setVerified },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className="flex items-center gap-2 rounded-2xl border border-pine/10 bg-[#f7faf8] px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-mint/40"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) => item.onChange(event.target.checked)}
                        className="h-4 w-4 accent-pine"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>

                <div className="grid gap-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink">Browse by pathway</h3>
                      <p className="mt-1 text-xs leading-5 text-ink/55">
                        Explore scholarship families, programs, and application tracks.
                      </p>
                    </div>

                    {selectedPathway ? (
                      <Button type="button" size="sm" variant="ghost" onClick={handleClearPathway}>
                        <X size={15} aria-hidden="true" />
                        Clear pathway
                      </Button>
                    ) : null}
                  </div>

                  {pathwaysLoading && rootPathways.length === 0 ? (
                    <p className="text-sm text-ink/55">Loading pathways...</p>
                  ) : null}

                  {sortedRootPathways.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {sortedRootPathways.map((pathway) => {
                        const selected = selectedPathwaySlug === pathway.slug;
                        const hasPublished = pathway.published_opportunity_count > 0;

                        return (
                          <button
                            key={pathway.slug}
                            type="button"
                            onClick={() => handleRootPathwaySelect(pathway)}
                            className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                              selected
                                ? "border-pine bg-pine text-white"
                                : "border-pine/10 bg-white text-ink/75 hover:border-pine/30 hover:bg-mint/35"
                            } ${hasPublished ? "" : "opacity-80"}`}
                          >
                            <span>{pathway.title}</span>
                            {!hasPublished ? (
                              <span
                                className={`ml-2 text-xs font-medium ${
                                  selected ? "text-white/75" : "text-ink/40"
                                }`}
                              >
                                Coming soon
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {selectedRootPathwaySlug && sortedChildPathways.length > 0 ? (
                    <div className="flex flex-wrap gap-2 border-t border-pine/10 pt-3">
                      {sortedChildPathways.map((pathway) => {
                        const selected = selectedPathwaySlug === pathway.slug;

                        return (
                          <button
                            key={pathway.slug}
                            type="button"
                            onClick={() => handlePathwaySelect(pathway)}
                            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                              selected
                                ? "border-pine bg-white text-pine shadow-sm"
                                : "border-pine/10 bg-white text-ink/65 hover:border-pine/30 hover:bg-mint/35"
                            }`}
                          >
                            {pathway.title}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {selectedPathway ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-ink/65">
                      <span>Showing pathway:</span>
                      <Badge tone="mint">{selectedPathway.full_path}</Badge>
                    </div>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          {matchNotice ? (
            <div className="mt-5 rounded-2xl border border-saffron/30 bg-saffron/15 p-4 text-sm text-ink/70">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles size={16} className="text-pine" aria-hidden="true" />
                  {matchNotice}
                </span>
                <ButtonLink href="/dashboard/profile" size="sm" variant="secondary">
                  Complete Profile
                </ButtonLink>
              </div>
            </div>
          ) : null}

          {loading ? (
            <Card className="mt-5">
              <CardContent className="p-6 text-sm text-ink/70">Loading scholarships...</CardContent>
            </Card>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && scholarships.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                action={
                  <Button type="button" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                }
                description={
                  selectedPathway
                    ? "No published opportunities in this pathway yet. New verified opportunities will be added soon."
                    : "Try removing filters or searching a broader country, field, or funding type."
                }
                icon={<Search size={22} aria-hidden="true" />}
                title={
                  selectedPathway
                    ? "No published opportunities in this pathway yet"
                    : "No scholarships match these filters yet"
                }
              />
            </div>
          ) : null}

          {!loading && !error && scholarships.length > 0 ? (
            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              {scholarships.map((scholarship) => (
                <ScholarshipCard
                  key={scholarship.id}
                  scholarship={scholarship}
                  match={matchByOpportunityId.get(scholarship.id)}
                  profileRequired={Boolean(matchNotice)}
                  initiallySaved={savedSlugs.has(scholarship.slug)}
                  onSavedChange={handleSavedChange}
                />
              ))}
            </section>
          ) : null}
        </section>
      </main>
    </>
  );
}
