"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";

import {
  ArrowRight,
  BadgeCheck,
  BookmarkCheck,
  CalendarDays,
  Filter,
  GraduationCap,
  Search,
  Sparkles,
  Star,
  WalletCards,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { MatchScoreBadge, MatchScoreDialog } from "@/components/opportunities/MatchScoreBadge";
import { SaveOpportunityButton } from "@/components/opportunities/SaveOpportunityButton";
import { SiteHeader } from "@/components/site-header";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  getCountries,
  getOpportunityPathways,
  getOpportunityPathway,
  getStudyFields,
  getRecommendedScholarships,
  getSavedOpportunitySlugs,
  getScholarships,
} from "@/lib/api";
import type {
  OpportunityListItem,
  OpportunityListResponse,
  OpportunityMatch,
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
  onMatchSelect,
  onPathwaySelect,
}: {
  scholarship: OpportunityListItem;
  match?: RecommendedOpportunity["match"];
  profileRequired?: boolean;
  initiallySaved?: boolean;
  onSavedChange?: (slug: string, saved: boolean) => void;
  onMatchSelect?: (match: OpportunityMatch) => void;
  onPathwaySelect?: (pathway: OpportunityPathwayDetail) => void;
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
  const fundingLabel = humanize(scholarship.funding_type);

  return (
    <Card className="self-start overflow-hidden transition hover:-translate-y-0.5 hover:border-pine/20 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="flex flex-col p-0">
        <div className="border-b border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
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

            <div className="w-full shrink-0 sm:w-32">
              <SaveOpportunityButton
                opportunityType="scholarship"
                slug={scholarship.slug}
                initiallySaved={initiallySaved}
                onSavedChange={(saved) => onSavedChange?.(scholarship.slug, saved)}
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 md:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">
            {scholarship.country || "Country not listed"}
          </p>

          <h2 className="mt-2.5 text-base font-bold leading-snug text-ink md:text-lg">
            {scholarship.title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-ink/65">
            {provider} · {scholarship.country || "Country not listed"}
          </p>

          {scholarship.short_description ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink/65">
              {scholarship.short_description}
            </p>
          ) : null}

          <div className="mt-3 grid gap-2 rounded-2xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5 sm:grid-cols-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
                <CalendarDays size={13} className="text-pine" aria-hidden="true" />
                Deadline
              </p>
              <p
                className="mt-1 truncate text-xs font-bold text-ink dark:text-white"
                title={formatDate(scholarship.deadline)}
              >
                {formatDate(scholarship.deadline)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
                <WalletCards size={13} className="text-pine" aria-hidden="true" />
                Funding
              </p>
              <p
                className="mt-1 truncate text-xs font-bold text-ink dark:text-white"
                title={fundingLabel}
              >
                {fundingLabel}
              </p>
            </div>

            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
                <GraduationCap size={13} className="text-pine" aria-hidden="true" />
                Degree
              </p>
              <p
                className="mt-1 truncate text-xs font-bold text-ink dark:text-white"
                title={scholarship.degree_levels.join(", ") || "Not listed"}
              >
                {scholarship.degree_levels[0] || "Not listed"}
              </p>
            </div>
          </div>

          {scholarship.stipend_summary ? (
            <div className="mt-2.5">
              <Badge tone="saffron" className="px-2.5 py-0.5 text-[11px]">
                Stipend: {scholarship.stipend_summary}
              </Badge>
            </div>
          ) : null}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {degreeTags.map((degree) => (
              <Badge key={degree} tone="neutral">
                {degree}
              </Badge>
            ))}
            {extraDegreeCount > 0 ? <Badge tone="neutral">+{extraDegreeCount} more</Badge> : null}
            {fieldTags.map((field) => (
              <Badge key={field} tone="sky">
                {field}
              </Badge>
            ))}
          </div>

          {scholarship.pathway_detail ? (
            <button
              type="button"
              onClick={() => onPathwaySelect?.(scholarship.pathway_detail!)}
              className="mt-2.5 line-clamp-1 rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 text-left text-xs font-semibold text-pine transition hover:border-pine/30 hover:bg-mint/45 dark:border-white/10 dark:bg-white/5"
              title={scholarship.pathway_detail.full_path}
            >
              {scholarship.pathway_detail.full_path}
            </button>
          ) : null}

          {match ? (
            <div className="mt-2.5">
              <MatchScoreBadge match={match} onClick={() => onMatchSelect?.(match)} />
            </div>
          ) : null}

          {isAuthenticated && isStudent && profileRequired ? (
            <p className="mt-2.5 rounded-2xl bg-saffron/20 px-3 py-2.5 text-sm leading-6 text-ink/65">
              Complete your profile to see personalized match scores.
            </p>
          ) : null}
        </div>

        <div className="border-t border-pine/10 bg-white p-2.5 dark:border-white/10 dark:bg-white/5 md:p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink href={`/scholarships/${scholarship.slug}`} size="sm" variant="outline">
              View details
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

function ScholarshipCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="animate-pulse">
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-24 rounded-full bg-pine/10" />
            <div className="h-6 w-20 rounded-full bg-pine/10" />
          </div>
          <div className="mt-5 h-6 w-3/4 rounded bg-pine/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-pine/10" />
          <div className="mt-5 grid gap-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-4">
            <div className="h-4 w-32 rounded bg-pine/10" />
            <div className="h-4 w-48 rounded bg-pine/10" />
            <div className="flex gap-2">
              <div className="h-6 w-24 rounded-full bg-pine/10" />
              <div className="h-6 w-28 rounded-full bg-pine/10" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ScholarshipsPageProps = {
  initialData?: OpportunityListResponse | null;
};

export default function ScholarshipsPage({ initialData = null }: ScholarshipsPageProps) {
  const [data, setData] = useState<OpportunityListResponse | null>(initialData);
  const [recommendedData, setRecommendedData] = useState<RecommendedOpportunityResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(!initialData);
  const hasResultsRef = useRef(Boolean(initialData));
  const [error, setError] = useState<string | null>(null);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<OpportunityMatch | null>(null);
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
  const [exactPathway, setExactPathway] = useState(false);
  const [pathwayQueryInitialized, setPathwayQueryInitialized] = useState(false);

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
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [pathwaysOpen, setPathwaysOpen] = useState(false);

  const { user, loading: authLoading } = useAuth();

  function updateScholarshipUrl(nextFilters: OpportunityQueryParams) {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();

    if (nextFilters.search) params.set("search", String(nextFilters.search));
    if (nextFilters.country) params.set("country", String(nextFilters.country));
    if (nextFilters.field) params.set("field", String(nextFilters.field));
    if (nextFilters.funding_type) params.set("funding_type", String(nextFilters.funding_type));
    if (nextFilters.pathway) params.set("pathway", String(nextFilters.pathway));
    if (nextFilters.exact_pathway) params.set("exact_pathway", "true");
    if (nextFilters.no_ielts) params.set("no_ielts", "true");
    if (nextFilters.no_application_fee) params.set("no_application_fee", "true");
    if (nextFilters.verified) params.set("verified", "true");

    const query = params.toString();
    window.history.replaceState(null, "", query ? `/scholarships?${query}` : "/scholarships");
  }

  useEffect(() => {
    hasResultsRef.current = Boolean(data || recommendedData);
  }, [data, recommendedData]);

  useEffect(() => {
    if (typeof window === "undefined" || pathwayQueryInitialized) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search") ?? "";
    const initialCountry = params.get("country") ?? "";
    const initialField = params.get("field") ?? "";
    const initialFundingType = params.get("funding_type") ?? "";
    const initialPathway = params.get("pathway") ?? "";
    const initialExactPathway = params.get("exact_pathway") === "true";
    const initialNoIelts = params.get("no_ielts") === "true";
    const initialNoApplicationFee = params.get("no_application_fee") === "true";
    const initialVerified = params.get("verified") === "true";

    setSearch(initialSearch);
    setCountry(initialCountry);
    setField(initialField);
    setFundingType(initialFundingType);
    setSelectedPathwaySlug(initialPathway);
    setExactPathway(initialExactPathway);
    setNoIelts(initialNoIelts);
    setNoApplicationFee(initialNoApplicationFee);
    setVerified(initialVerified);
    setPathwaysOpen(Boolean(initialPathway));
    setFilters({
      ordering: "deadline",
      search: initialSearch || undefined,
      country: initialCountry || undefined,
      field: initialField || undefined,
      funding_type: initialFundingType || undefined,
      pathway: initialPathway || undefined,
      exact_pathway: initialExactPathway || undefined,
      no_ielts: initialNoIelts || undefined,
      no_application_fee: initialNoApplicationFee || undefined,
      verified: initialVerified || undefined,
    });
    setPathwayQueryInitialized(true);
  }, [pathwayQueryInitialized]);

  useEffect(() => {
    let mounted = true;

    async function loadSelectedPathwayContext() {
      if (!selectedPathwaySlug) {
        return;
      }

      try {
        const pathway = await getOpportunityPathway(selectedPathwaySlug);

        if (!mounted) {
          return;
        }

        setSelectedRootPathwaySlug(pathway.parent_slug || pathway.slug);
      } catch {
        if (mounted) {
          setSelectedRootPathwaySlug("");
        }
      }
    }

    void loadSelectedPathwayContext();

    return () => {
      mounted = false;
    };
  }, [selectedPathwaySlug]);

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

      setLoading(!hasResultsRef.current);
      setError(null);
      setMatchNotice(null);

      try {
        if (user?.role === "student") {
          try {
            const response = await getRecommendedScholarships(filters);

            if (mounted) {
              setRecommendedData(response);
              setData(null);
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
          setRecommendedData(null);
          setData(response);
        }
      } catch {
        if (mounted) {
          setRecommendedData(null);
          setData(null);
          setError("We could not load scholarships right now. Please refresh or try again later.");
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

  const resultCount = recommendedData?.count ?? data?.count ?? 0;
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.country ||
    filters.field ||
    filters.funding_type ||
    filters.pathway ||
    filters.exact_pathway ||
    filters.no_ielts ||
    filters.no_application_fee ||
    filters.verified,
  );

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

  const selectedFundingLabel = useMemo(() => {
    return FUNDING_TYPES.find((item) => item.value === fundingType)?.label ?? "";
  }, [fundingType]);

  const activeAdvancedFilters = useMemo(() => {
    return [
      country,
      field,
      selectedFundingLabel,
      noIelts ? "No IELTS" : "",
      noApplicationFee ? "No application fee" : "",
      verified ? "Verified only" : "",
    ].filter(Boolean);
  }, [country, field, noApplicationFee, noIelts, selectedFundingLabel, verified]);

  const activeFilterSummary = useMemo(() => {
    const pathwayLabel = selectedPathway
      ? exactPathway
        ? `Exact pathway: ${selectedPathway.full_path}`
        : `Under pathway: ${selectedPathway.full_path}`
      : "";

    return [...activeAdvancedFilters, pathwayLabel].filter(Boolean);
  }, [activeAdvancedFilters, exactPathway, selectedPathway]);

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();

    const nextFilters = {
      ordering: "deadline",
      search: search || undefined,
      country: country || undefined,
      field: field || undefined,
      funding_type: fundingType || undefined,
      pathway: selectedPathwaySlug || undefined,
      exact_pathway: exactPathway || undefined,
      no_ielts: noIelts || undefined,
      no_application_fee: noApplicationFee || undefined,
      verified: verified || undefined,
    };

    setFilters(nextFilters);
    updateScholarshipUrl(nextFilters);
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
    setExactPathway(false);
    const nextFilters = { ordering: "deadline" };
    setFilters(nextFilters);
    updateScholarshipUrl(nextFilters);
  }

  function handlePathwaySelect(
    pathway: OpportunityPathwayDetail,
    exact = Boolean(pathway.parent_id),
  ) {
    setSelectedPathwaySlug(pathway.slug);
    setExactPathway(exact);

    if (!pathway.parent_id) {
      setSelectedRootPathwaySlug(pathway.slug);
    }

    const nextFilters = {
      ...filters,
      search: search || undefined,
      country: country || undefined,
      field: field || undefined,
      funding_type: fundingType || undefined,
      no_ielts: noIelts || undefined,
      no_application_fee: noApplicationFee || undefined,
      verified: verified || undefined,
      ordering: "deadline",
      pathway: pathway.slug,
      exact_pathway: exact || undefined,
    };

    setFilters(nextFilters);
    updateScholarshipUrl(nextFilters);
  }

  function handleRootPathwaySelect(pathway: OpportunityPathwayDetail) {
    setSelectedRootPathwaySlug(pathway.slug);
    handlePathwaySelect(pathway, false);
  }

  function handleClearPathway() {
    setSelectedRootPathwaySlug("");
    setSelectedPathwaySlug("");
    setExactPathway(false);
    const next = { ...filters };
    delete next.pathway;
    delete next.exact_pathway;
    next.ordering = "deadline";
    setFilters(next);
    updateScholarshipUrl(next);
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

      <main className="bg-[#f7faf8] transition-colors dark:bg-[#0e1012]">
        <section className="mx-auto max-w-7xl px-4 py-2.5 sm:px-5 md:px-8 md:py-3">
          <div className="overflow-hidden rounded-[1.75rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
            <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="px-4 py-4 md:px-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  <Sparkles size={14} aria-hidden="true" />
                  Verified scholarship discovery
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Find scholarships worth applying to.
                </h1>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-ink/70 dark:text-white/60">
                  Search published opportunities by country, funding, deadline, degree level, and
                  pathway.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5 border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 lg:border-l lg:border-t-0">
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Results
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {loading ? "..." : resultCount}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Sorting
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    Deadline
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Sources
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-pine">Checked</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="mt-2 dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-3 md:p-3.5">
              <form onSubmit={handleFilterSubmit} className="grid gap-2">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <label className="grid min-w-0 text-xs font-semibold text-ink">
                    <span className="sr-only">Search scholarships</span>
                    <div className="relative">
                      <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
                        aria-hidden="true"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by scholarship, university, country..."
                        className="h-10 w-full rounded-2xl border border-pine/15 bg-white pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-2 sm:flex lg:shrink-0">
                    <Button type="submit" className="h-9 w-full px-3 text-xs sm:w-auto" size="sm">
                      Apply
                    </Button>
                    <Button
                      type="button"
                      aria-expanded={advancedFiltersOpen}
                      className="h-9 w-full whitespace-nowrap px-3 text-xs sm:w-auto"
                      onClick={() => setAdvancedFiltersOpen((current) => !current)}
                      size="sm"
                      variant={activeAdvancedFilters.length > 0 ? "outline" : "ghost"}
                    >
                      <Filter size={14} aria-hidden="true" />
                      Filters
                      {activeAdvancedFilters.length > 0 ? ` (${activeAdvancedFilters.length})` : ""}
                    </Button>
                    <Button
                      type="button"
                      aria-expanded={pathwaysOpen}
                      className="col-span-2 h-9 w-full whitespace-nowrap px-3 text-xs sm:col-span-1 sm:w-auto"
                      onClick={() => setPathwaysOpen((current) => !current)}
                      size="sm"
                      variant={selectedPathway ? "outline" : "ghost"}
                    >
                      <GraduationCap size={14} aria-hidden="true" />
                      Pathways{selectedPathway ? " (1)" : ""}
                    </Button>
                  </div>
                </div>

                {activeFilterSummary.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-2xl border border-pine/10 bg-white px-3 py-2 text-xs text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/60 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0">
                      <span className="font-bold text-ink/70">Filtered by:</span>{" "}
                      <span className="break-words">{activeFilterSummary.join(" · ")}</span>
                    </p>
                    <Button
                      type="button"
                      className="h-8 shrink-0 px-2.5 text-xs"
                      onClick={handleClearFilters}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={14} aria-hidden="true" />
                      Clear
                    </Button>
                  </div>
                ) : null}

                {advancedFiltersOpen ? (
                  <div className="grid gap-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="grid gap-2 md:grid-cols-3">
                      <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink dark:text-white">
                        Country
                        <select
                          value={country}
                          onChange={(event) => setCountry(event.target.value)}
                          className="h-9 w-full min-w-0 truncate rounded-xl border border-pine/15 bg-white px-3 text-[13px] text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                        >
                          <option value="">All countries</option>
                          {countryOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink dark:text-white">
                        Field
                        <select
                          value={field}
                          onChange={(event) => setField(event.target.value)}
                          className="h-9 w-full min-w-0 truncate rounded-xl border border-pine/15 bg-white px-3 text-[13px] text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                        >
                          <option value="">All fields</option>
                          {fieldOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink dark:text-white">
                        Funding
                        <select
                          value={fundingType}
                          onChange={(event) => setFundingType(event.target.value)}
                          className="h-9 w-full min-w-0 truncate rounded-xl border border-pine/15 bg-white px-3 text-[13px] text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                        >
                          <option value="">All funding</option>
                          {FUNDING_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap gap-1.5">
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
                            className="flex items-center gap-1.5 rounded-2xl border border-pine/10 bg-white px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-mint/40"
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(event) => item.onChange(event.target.checked)}
                              className="h-3.5 w-3.5 accent-pine"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex lg:shrink-0">
                        <Button
                          type="submit"
                          className="h-8 w-full px-3 text-xs sm:w-auto"
                          size="sm"
                        >
                          Apply
                        </Button>
                        <Button
                          type="button"
                          className="h-8 w-full px-3 text-xs sm:w-auto"
                          onClick={handleClearFilters}
                          size="sm"
                          variant="ghost"
                        >
                          <X size={14} aria-hidden="true" />
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {pathwaysOpen ? (
                  <div className="grid gap-2 rounded-2xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-center md:gap-1.5">
                        <h3 className="shrink-0 text-xs font-bold text-ink">Browse by pathway</h3>
                        <span className="hidden text-xs text-ink/35 md:inline">·</span>
                        <p className="min-w-0 text-[11px] leading-4 text-ink/55 md:truncate">
                          Explore scholarship families, programs, and application tracks.
                        </p>
                      </div>

                      {selectedPathway ? (
                        <Button
                          type="button"
                          className="h-8 px-2.5 text-xs"
                          size="sm"
                          variant="ghost"
                          onClick={handleClearPathway}
                        >
                          <X size={14} aria-hidden="true" />
                          Clear pathway
                        </Button>
                      ) : null}
                    </div>

                    {pathwaysLoading && rootPathways.length === 0 ? (
                      <p className="text-xs text-ink/55">Loading pathways...</p>
                    ) : null}

                    {sortedRootPathways.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sortedRootPathways.map((pathway) => {
                          const selected = selectedPathwaySlug === pathway.slug;
                          const hasPublished = pathway.published_opportunity_count > 0;

                          return (
                            <button
                              key={pathway.slug}
                              type="button"
                              onClick={() => handleRootPathwaySelect(pathway)}
                              className={`min-w-0 rounded-2xl border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                                selected
                                  ? "border-pine bg-pine text-white"
                                  : "border-pine/10 bg-white text-ink/75 hover:border-pine/30 hover:bg-mint/35"
                              } ${hasPublished ? "" : "opacity-80"}`}
                            >
                              <span>{pathway.title}</span>
                              {!hasPublished ? (
                                <span
                                  className={`ml-1.5 text-[11px] font-medium ${
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
                      <div className="flex flex-wrap gap-1.5 border-t border-pine/10 pt-2">
                        {sortedChildPathways.map((pathway) => {
                          const selected = selectedPathwaySlug === pathway.slug;

                          return (
                            <button
                              key={pathway.slug}
                              type="button"
                              onClick={() => handlePathwaySelect(pathway)}
                              className={`rounded-2xl border px-2.5 py-1.5 text-xs font-semibold transition ${
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
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink/65">
                        <span>Showing pathway:</span>
                        <Badge tone="mint" className="px-2 py-0.5 text-[11px]">
                          {selectedPathway.full_path}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>

          {matchNotice ? (
            <div className="mt-2 rounded-2xl border border-saffron/30 bg-saffron/15 p-3 text-sm text-ink/70">
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
            <section
              className="mt-2 grid gap-4 lg:grid-cols-2"
              aria-label="Scholarship result placeholders"
            >
              <ScholarshipCardSkeleton />
              <ScholarshipCardSkeleton />
            </section>
          ) : null}

          {error ? (
            <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && scholarships.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                action={
                  hasActiveFilters ? (
                    <Button type="button" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  ) : (
                    <ButtonLink href="/blog" variant="secondary">
                      Read Scholarship Guides
                    </ButtonLink>
                  )
                }
                description={
                  selectedPathway
                    ? "Try all scholarships or choose another pathway."
                    : hasActiveFilters
                      ? "Try removing filters or searching a broader country, field, or funding type."
                      : "No published scholarships are available yet. Browse the scholarship guides while new verified opportunities are added."
                }
                icon={<Search size={22} aria-hidden="true" />}
                title={
                  selectedPathway
                    ? "No published scholarships in this pathway yet"
                    : hasActiveFilters
                      ? "No scholarships match these filters yet"
                      : "No scholarships published yet"
                }
              />
            </div>
          ) : null}

          {!loading && !error && scholarships.length > 0 ? (
            <>
              <p className="mt-2 text-xs font-medium text-ink/55">
                {resultCount === 1 ? "1 opportunity found" : `${resultCount} opportunities found`}
              </p>
              <section className="mt-1.5 grid gap-4 lg:grid-cols-2">
                {scholarships.map((scholarship) => (
                  <ScholarshipCard
                    key={scholarship.id}
                    scholarship={scholarship}
                    match={matchByOpportunityId.get(scholarship.id)}
                    profileRequired={Boolean(matchNotice)}
                    initiallySaved={savedSlugs.has(scholarship.slug)}
                    onSavedChange={handleSavedChange}
                    onMatchSelect={setSelectedMatch}
                    onPathwaySelect={(pathway) => handlePathwaySelect(pathway, true)}
                  />
                ))}
              </section>
            </>
          ) : null}
        </section>
      </main>

      <MatchScoreDialog
        match={selectedMatch}
        open={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
      />
    </>
  );
}
