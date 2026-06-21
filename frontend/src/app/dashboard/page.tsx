"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  getApplications,
  getApplicationSummary,
  getProfileCompletion,
  getSavedOpportunities,
  startApplicationFromSaved,
} from "@/lib/api";
import {
  formatShortDate,
  getApplicationDeadline,
  getApplicationReadinessScore,
  getDaysUntil,
  getDeadlineLabel,
} from "@/features/applications/application-utils";
import { getErrorMessage } from "@/lib/errors";
import type {
  ApplicationSummary,
  OpportunityApplication,
  SavedOpportunity,
} from "@/types/opportunity";
import type { ProfileCompletion } from "@/types/profile";

type ActionTile = {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: typeof UserRoundCheck;
  badge?: string;
};

type NextStep = {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: typeof UserRoundCheck;
};

function getFirstName(fullName?: string) {
  if (!fullName) {
    return "Student";
  }

  return fullName.trim().split(/\s+/)[0] || "Student";
}

function getProviderName(application: OpportunityApplication) {
  return (
    application.opportunity_detail.provider_name ||
    application.opportunity_detail.university_name ||
    application.opportunity_detail.company_name ||
    "Provider not listed"
  );
}

function getOpportunityProvider(saved: SavedOpportunity) {
  const opportunity = saved.opportunity_detail;

  return (
    opportunity.provider_name ||
    opportunity.university_name ||
    opportunity.company_name ||
    "Provider not listed"
  );
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger" | "good";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300"
      : tone === "warning"
        ? "border-saffron/30 bg-saffron/15 text-ink dark:border-saffron/25 dark:bg-saffron/10 dark:text-white"
        : tone === "good"
          ? "border-pine/15 bg-mint text-pine dark:border-pine/25 dark:bg-pine/10"
          : "border-pine/10 bg-white/90 text-ink dark:border-white/10 dark:bg-white/5 dark:text-white";

  return (
    <div className={`min-w-0 rounded-xl border px-2.5 py-2 ${toneClass}`}>
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] opacity-55">
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-black leading-none">{value}</p>
    </div>
  );
}

function ActionTileCard({ item }: { item: ActionTile }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group rounded-2xl border border-pine/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-pine/20 hover:shadow-md dark:border-white/10 dark:bg-[#181b1d] dark:hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
          <Icon size={17} aria-hidden="true" />
        </span>
        {item.badge ? <Badge tone="saffron">{item.badge}</Badge> : null}
      </div>

      <h3 className="mt-3 text-sm font-bold text-ink group-hover:text-pine dark:text-white">
        {item.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/58 dark:text-white/55">
        {item.description}
      </p>

      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-pine">
        {item.action}
        <ArrowRight size={13} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function MiniApplicationCard({ application }: { application: OpportunityApplication }) {
  const deadline = getApplicationDeadline(application);
  const readinessScore = getApplicationReadinessScore(application);

  return (
    <Link
      href={`/dashboard/applications?application=${application.id}`}
      className="group block rounded-xl border border-pine/10 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-pine/5 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold leading-5 text-ink group-hover:text-pine dark:text-white">
            {application.opportunity_detail.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink/55 dark:text-white/50">
            {getProviderName(application)} · {application.opportunity_detail.country || "Country not listed"}
          </p>
        </div>

        <ArrowRight
          size={15}
          aria-hidden="true"
          className="mt-1 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-pine dark:text-white/30"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={readinessScore >= 75 ? "mint" : readinessScore >= 45 ? "saffron" : "danger"}>
          {readinessScore}% ready
        </Badge>
        <Badge tone={application.latest_sop_draft ? "mint" : "saffron"}>
          {application.latest_sop_draft ? "SOP ready" : "No SOP"}
        </Badge>
        <Badge tone="neutral">{getDeadlineLabel(deadline)}</Badge>
      </div>
    </Link>
  );
}

function MiniSavedCard({
  saved,
  onTrack,
  tracking,
}: {
  saved: SavedOpportunity;
  onTrack: (saved: SavedOpportunity) => void;
  tracking: boolean;
}) {
  const opportunity = saved.opportunity_detail;
  const degree = opportunity.degree_levels[0];

  return (
    <div className="group rounded-xl border border-pine/10 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-pine/5 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
      <Link href={`/scholarships/${opportunity.slug}`} className="block">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-5 text-ink group-hover:text-pine dark:text-white">
              {opportunity.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-ink/55 dark:text-white/50">
              {getOpportunityProvider(saved)} · {opportunity.country || "Country not listed"}
            </p>
          </div>

          <ArrowRight
            size={15}
            aria-hidden="true"
            className="mt-1 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-pine dark:text-white/30"
          />
        </div>
      </Link>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="neutral">{opportunity.funding_type || "Funding not listed"}</Badge>
        {degree ? <Badge tone="neutral">{degree}</Badge> : null}
        <Badge tone="neutral">{formatShortDate(opportunity.deadline)}</Badge>
        {saved.is_tracking ? <Badge tone="mint">Tracking</Badge> : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-pine/10 pt-2 dark:border-white/10">
        <span className="truncate text-[11px] font-semibold text-ink/40 dark:text-white/40">
          Saved shortlist item
        </span>
        <button
          type="button"
          disabled={tracking}
          onClick={() => onTrack(saved)}
          className="shrink-0 rounded-full border border-pine/15 bg-white px-2.5 py-1 text-[11px] font-bold text-pine transition hover:bg-pine hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-pine"
        >
          {tracking ? "Opening..." : saved.is_tracking ? "Open tracker" : "Track"}
        </button>
      </div>
    </div>
  );
}

function StudentDashboardContent() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [applicationSummary, setApplicationSummary] = useState<ApplicationSummary | null>(null);
  const [recentSavedOpportunities, setRecentSavedOpportunities] = useState<SavedOpportunity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setLoadingCompletion] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [trackingSavedId, setTrackingSavedId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCompletion() {
      try {
        const data = await getProfileCompletion();

        if (mounted) {
          setCompletion(data);
          setError(null);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoadingCompletion(false);
        }
      }
    }

    void loadCompletion();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const [applicationData, summaryData, savedData] = await Promise.all([
          getApplications(),
          getApplicationSummary(),
          getSavedOpportunities({ page_size: 3 }),
        ]);

        if (mounted) {
          setApplications(
            summaryData.recently_updated.length
              ? summaryData.recently_updated
              : applicationData.results,
          );
          setApplicationSummary(summaryData);
          setRecentSavedOpportunities(savedData.results);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoadingApplications(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleTrackSaved(saved: SavedOpportunity) {
    if (saved.is_tracking && saved.application_id) {
      window.location.href = `/dashboard/applications?application=${saved.application_id}`;
      return;
    }

    setTrackingSavedId(saved.id);
    setError(null);

    try {
      const application = await startApplicationFromSaved(saved.id);
      window.location.href = `/dashboard/applications?application=${application.id}`;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setTrackingSavedId(null);
    }
  }

  const completionPercent = completion?.completion_percentage ?? 0;
  const readinessScore = completion?.scholarship_readiness_score ?? 0;
  const readinessLevel = completion?.readiness_level ?? "Low";
  const missingFields = completion?.missing_profile_fields ?? [];
  const missingDocuments = completion?.missing_core_documents ?? [];
  const totalTracked = applicationSummary?.total ?? applications.length;
  const firstName = getFirstName(user?.full_name);

  const trackedForAlerts = applications;
  const overdue = trackedForAlerts.filter((application) => {
    const days = getDaysUntil(getApplicationDeadline(application));
    return days !== null && days < 0;
  }).length;
  const dueSoon = trackedForAlerts.filter((application) => {
    const days = getDaysUntil(getApplicationDeadline(application));
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const missingSop = trackedForAlerts.filter((application) => !application.latest_sop_draft).length;
  const weakReadiness = trackedForAlerts.filter(
    (application) => getApplicationReadinessScore(application) < 45,
  ).length;

  const nextStep = useMemo<NextStep>(() => {
    if (completionPercent < 50) {
      return {
        title: "Complete your profile first",
        description: "Add education, goals, countries, fields, and document status.",
        href: "/dashboard/profile",
        action: "Update Profile",
        icon: UserRoundCheck,
      };
    }

    if (missingDocuments.length > 0) {
      return {
        title: "Prepare missing documents",
        description: "Review the core documents scholarship applications commonly ask for.",
        href: "/dashboard/profile#profile-documents",
        action: "Review Documents",
        icon: FileText,
      };
    }

    if (readinessScore < 70) {
      return {
        title: "Review recommended scholarships",
        description: "Use your profile to decide which scholarships are worth your time.",
        href: "/dashboard/recommendations",
        action: "View Recommendations",
        icon: Star,
      };
    }

    return {
      title: "Move applications forward",
      description: "Your profile looks ready. Manage applications and deadlines clearly.",
      href: "/dashboard/applications",
      action: "Open Tracker",
      icon: ClipboardCheck,
    };
  }, [completionPercent, missingDocuments.length, readinessScore]);

  const actionTiles: ActionTile[] = [
    {
      title: "Find scholarships",
      description: "Browse and shortlist scholarships that fit your goals.",
      href: "/scholarships",
      action: "Browse",
      icon: Search,
    },
    {
      title: "Recommendations",
      description: "See scholarship matches based on your profile.",
      href: "/dashboard/recommendations",
      action: "Review",
      icon: Star,
    },
    {
      title: "Saved shortlist",
      description: "Compare saved opportunities and decide what to track.",
      href: "/dashboard/saved",
      action: "Open",
      icon: ShieldCheck,
    },
    {
      title: "SOP generator",
      description: "Draft your scholarship SOP with AI support.",
      href: "/dashboard/ai/sop",
      action: "Generate",
      icon: Sparkles,
      badge: "AI",
    },
  ];

  const NextStepIcon = nextStep.icon;

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="bg-gradient-to-r from-mint/80 via-white to-skyglass px-4 py-4 dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-5">
            <Badge tone="mint" className="mb-2">
              <GraduationCap size={14} aria-hidden="true" />
              Student command center
            </Badge>

            <h1 className="text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
              Welcome back, {firstName}.
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
              Start with the next useful step, then continue applications or saved scholarships without searching around the dashboard.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={nextStep.href} className="w-full sm:w-auto" size="sm">
                {nextStep.action}
                <ArrowRight size={15} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/scholarships" className="w-full sm:w-auto" size="sm" variant="outline">
                Browse Scholarships
              </ButtonLink>
              <ButtonLink href="/dashboard/applications" className="w-full sm:w-auto" size="sm" variant="ghost">
                Open Tracker
              </ButtonLink>
            </div>
          </div>

          <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <div className="rounded-2xl border border-pine/10 bg-mint/40 p-3 dark:border-white/10 dark:bg-pine/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                    Next best step
                  </p>
                  <h2 className="mt-1 text-base font-bold leading-snug text-ink dark:text-white">
                    {nextStep.title}
                  </h2>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
                  <NextStepIcon size={18} aria-hidden="true" />
                </span>
              </div>

              <p className="mt-1.5 text-sm leading-5 text-ink/65 dark:text-white/58">
                {nextStep.description}
              </p>
            </div>

          </aside>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actionTiles.map((item) => (
          <ActionTileCard key={item.href} item={item} />
        ))}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                    Today board
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
                    Applications that need attention
                  </h2>
                </div>
                <ButtonLink href="/dashboard/applications" size="sm" variant="outline">
                  Open Tracker
                </ButtonLink>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                <MetricPill label="Tracked" value={loadingApplications ? "..." : totalTracked} />
                <MetricPill label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : "default"} />
                <MetricPill label="Due soon" value={dueSoon} tone={dueSoon > 0 ? "warning" : "default"} />
                <MetricPill label="No SOP" value={missingSop} tone={missingSop > 0 ? "warning" : "default"} />
                <MetricPill label="Weak" value={weakReadiness} tone={weakReadiness > 0 ? "danger" : "default"} />
              </div>

              <div className="mt-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center gap-2 text-pine">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <p className="text-sm font-bold text-ink dark:text-white">
                    Recent applications
                  </p>
                </div>

                {loadingApplications ? (
                  <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink/60 dark:bg-white/5 dark:text-white/58">
                    Loading applications...
                  </p>
                ) : applications.length > 0 ? (
                  <div className="grid gap-2">
                    {applications.slice(0, 3).map((application) => (
                      <MiniApplicationCard key={application.id} application={application} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink/60 dark:bg-white/5 dark:text-white/58">
                    No tracked applications yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                    Saved shortlist
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
                    Decide what to track next
                  </h2>
                </div>
                <ButtonLink href="/dashboard/saved" size="sm" variant="outline">
                  View Saved
                </ButtonLink>
              </div>

              <div className="mt-3 grid gap-2">
                {loadingApplications ? (
                  <p className="rounded-xl bg-[#f7faf8] px-3 py-2 text-sm text-ink/60 dark:bg-white/5 dark:text-white/58">
                    Loading saved opportunities...
                  </p>
                ) : recentSavedOpportunities.length > 0 ? (
                  recentSavedOpportunities.map((saved) => (
                    <MiniSavedCard
                      key={saved.id}
                      saved={saved}
                      tracking={trackingSavedId === saved.id}
                      onTrack={handleTrackSaved}
                    />
                  ))
                ) : (
                  <p className="rounded-xl bg-[#f7faf8] px-3 py-2 text-sm text-ink/60 dark:bg-white/5 dark:text-white/58">
                    No saved opportunities yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="grid gap-4 content-start">
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                    Preparation
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
                    Profile gaps
                  </h2>
                </div>
                <ButtonLink href="/dashboard/profile" size="sm" variant="outline">
                  Edit
                </ButtonLink>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink/60 dark:text-white/50">Scholarship readiness</span>
                  <span className={`text-sm font-bold ${readinessScore >= 70 ? "text-pine" : "text-saffron"}`}>{readinessScore}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${readinessScore >= 70 ? "bg-pine" : readinessScore >= 40 ? "bg-saffron" : "bg-red-400"}`}
                    style={{ width: `${readinessScore}%` }}
                    role="progressbar"
                    aria-valuenow={readinessScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Scholarship readiness"
                  />
                </div>
                {(missingFields.length + missingDocuments.length) > 0 && (
                  <p className="mt-1 text-[11px] text-ink/45 dark:text-white/35">
                    {missingFields.length + missingDocuments.length} item{missingFields.length + missingDocuments.length !== 1 ? "s" : ""} remaining — complete profile to improve match score
                  </p>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <MetricPill label="Level" value={readinessLevel} />
                <MetricPill label="Docs" value={missingDocuments.length} tone={missingDocuments.length > 0 ? "warning" : "good"} />
                <MetricPill label="Fields" value={missingFields.length} tone={missingFields.length > 0 ? "warning" : "good"} />
                <MetricPill label="Ready" value={`${readinessScore}%`} tone={readinessScore >= 70 ? "good" : "warning"} />
              </div>

              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl border border-pine/10 bg-mint/25 p-3 dark:border-white/10 dark:bg-pine/10">
                  <div className="flex items-center gap-2">
                    <ListChecks size={16} className="text-pine" aria-hidden="true" />
                    <p className="text-sm font-bold text-ink dark:text-white">Missing fields</p>
                  </div>

                  {missingFields.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {missingFields.slice(0, 5).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/65 dark:bg-white/10 dark:text-white/65"
                        >
                          {item}
                        </span>
                      ))}
                      {missingFields.length > 5 ? (
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/45 dark:bg-white/10 dark:text-white/45">
                          +{missingFields.length - 5} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink/60 dark:bg-white/10 dark:text-white/58">
                      Key profile fields look complete.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-pine/10 bg-skyglass p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-pine" aria-hidden="true" />
                    <p className="text-sm font-bold text-ink dark:text-white">Missing documents</p>
                  </div>

                  {missingDocuments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {missingDocuments.slice(0, 5).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/65 dark:bg-white/10 dark:text-white/65"
                        >
                          {item}
                        </span>
                      ))}
                      {missingDocuments.length > 5 ? (
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/45 dark:bg-white/10 dark:text-white/45">
                          +{missingDocuments.length - 5} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink/60 dark:bg-white/10 dark:text-white/58">
                      Core documents look ready.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardShell
        description="Your scholarship search, saved opportunities, application tracker, and preparation tools in one place."
        hideHeader
        title="Student dashboard"
      >
        <StudentDashboardContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
