"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
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
  OpportunityApplication,
  ApplicationSummary,
  SavedOpportunity,
} from "@/types/opportunity";
import type { ProfileCompletion } from "@/types/profile";

type ActionCard = {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: typeof UserRoundCheck;
  badge?: string;
};


function getFirstName(fullName?: string) {
  if (!fullName) {
    return "Student";
  }

  return fullName.trim().split(/\s+/)[0] || "Student";
}

function ApplicationActionCenter({
  applications,
  summary,
  loading,
}: {
  applications: OpportunityApplication[];
  summary: ApplicationSummary | null;
  loading: boolean;
}) {
  const totalTracked = summary?.total ?? applications.length;
  const overdue = applications.filter((application) => {
    const daysUntilDeadline = getDaysUntil(getApplicationDeadline(application));
    return daysUntilDeadline !== null && daysUntilDeadline < 0;
  }).length;
  const dueSoon = applications.filter((application) => {
    const daysUntilDeadline = getDaysUntil(getApplicationDeadline(application));
    return daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7;
  }).length;
  const missingSop = applications.filter((application) => !application.latest_sop_draft).length;
  const weakReadiness = applications.filter(
    (application) => getApplicationReadinessScore(application) < 45,
  ).length;
  const needsAttention = overdue + dueSoon + missingSop + weakReadiness;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3 text-sm text-ink/60">Loading tracker alerts...</CardContent>
      </Card>
    );
  }

  if (totalTracked === 0) {
    return (
      <section className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
              <ClipboardCheck size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                Today&apos;s application focus
              </p>
              <h2 className="mt-1 text-base font-bold text-ink">No tracked applications yet</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                Start tracking scholarships so deadlines, SOP drafts, documents, and next steps stay organized.
              </p>
            </div>
          </div>
          <ButtonLink href="/scholarships" className="w-full sm:w-auto" size="sm" variant="outline">
            Browse Scholarships
            <ArrowRight size={15} aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    );
  }

  const alertItems = [
    { label: "Tracked", value: totalTracked, href: "/dashboard/applications" },
    { label: "Overdue", value: overdue, href: "/dashboard/applications?view=overdue" },
    { label: "Due soon", value: dueSoon, href: "/dashboard/applications?view=due_soon" },
    { label: "Missing SOP", value: missingSop, href: "/dashboard/applications?view=missing_sop" },
    { label: "Weak", value: weakReadiness, href: "/dashboard/applications?view=needs_work" },
  ];

  return (
    <section className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
            <ClipboardCheck size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Today&apos;s application focus
            </p>
            <h2 className="mt-1 text-base font-bold text-ink">
              {needsAttention > 0 ? "Review applications that need attention" : "Applications look organized"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Check urgent deadlines, SOP gaps, and weak readiness before starting new applications.
            </p>
          </div>
        </div>

        <ButtonLink href="/dashboard/applications" className="w-full sm:w-auto" size="sm" variant="secondary">
          Open Tracker
          <ArrowRight size={15} aria-hidden="true" />
        </ButtonLink>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {alertItems.map((item) => (
          <ButtonLink
            key={item.label}
            href={item.href}
            className="justify-between rounded-xl border-pine/10 bg-cream/40 px-2.5 py-2 text-left text-ink hover:bg-pine/5"
            size="sm"
            variant="outline"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">
              {item.label}
            </span>
            <span className="text-base font-bold leading-none text-ink">{item.value}</span>
          </ButtonLink>
        ))}
      </div>
    </section>
  );
}

function getProviderName(application: OpportunityApplication) {
  return (
    application.opportunity_detail.provider_name ||
    application.opportunity_detail.university_name ||
    application.opportunity_detail.company_name ||
    "Provider not listed"
  );
}

function ContinueWorkingSection({
  applications,
  savedOpportunities,
  loading,
}: {
  applications: OpportunityApplication[];
  savedOpportunities: SavedOpportunity[];
  loading: boolean;
}) {
  const recentApplications = applications.slice(0, 3);
  const recentSaved = savedOpportunities.slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-ink/60">Loading recent work...</CardContent>
      </Card>
    );
  }

  if (recentApplications.length === 0 && recentSaved.length === 0) {
    return (
      <section className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Continue working
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">Nothing active yet</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Save scholarships or start tracking applications to resume them from here.
            </p>
          </div>
          <ButtonLink href="/scholarships" size="sm">
            Find Scholarships
            <ArrowRight size={15} aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
            Continue working
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink">Pick up where you left off</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/applications" size="sm" variant="outline">
            Tracker
          </ButtonLink>
          <ButtonLink href="/dashboard/saved" size="sm" variant="outline">
            Saved
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-pine/10 bg-mint/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">Recently updated applications</p>
            <Badge tone="mint">{recentApplications.length}</Badge>
          </div>

          {recentApplications.length > 0 ? (
            <div className="grid gap-2">
              {recentApplications.map((application) => {
                const deadline = getApplicationDeadline(application);
                const readinessScore = getApplicationReadinessScore(application);

                return (
                  <Link
                    key={application.id}
                    href={`/dashboard/applications?application=${application.id}`}
                    className="group block min-w-0 overflow-hidden rounded-xl border border-pine/10 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-pine/5 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="line-clamp-2 break-words text-sm font-bold leading-5 text-ink group-hover:text-pine">
                          {application.opportunity_detail.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink/55">
                          {getProviderName(application)} · {application.opportunity_detail.country || "Country not listed"}
                        </p>
                        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                          <Badge
                            className="max-w-full truncate"
                            tone={readinessScore >= 75 ? "mint" : readinessScore >= 45 ? "saffron" : "danger"}
                          >
                            {readinessScore}% ready
                          </Badge>
                          <Badge className="max-w-full truncate" tone={application.latest_sop_draft ? "mint" : "saffron"}>
                            {application.latest_sop_draft ? "SOP ready" : "No SOP"}
                          </Badge>
                          <Badge className="max-w-full truncate" tone="neutral">{getDeadlineLabel(deadline)}</Badge>
                        </div>
                      </div>

                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-pine"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink/60">
              No tracked applications yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-pine/10 bg-skyglass p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">Recent saved opportunities</p>
            <Badge tone="saffron">{recentSaved.length}</Badge>
          </div>

          {recentSaved.length > 0 ? (
            <div className="grid gap-2">
              {recentSaved.map((saved) => {
                const opportunity = saved.opportunity_detail;
                const degree = opportunity.degree_levels[0];

                return (
                  <Link
                    key={saved.id}
                    href={`/scholarships/${opportunity.slug}`}
                    className="group block min-w-0 overflow-hidden rounded-xl border border-pine/10 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-pine/5 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="line-clamp-2 break-words text-sm font-bold leading-5 text-ink group-hover:text-pine">{opportunity.title}</p>
                        <p className="mt-0.5 truncate text-xs text-ink/55">
                          {opportunity.provider_name ||
                            opportunity.university_name ||
                            opportunity.company_name ||
                            "Provider not listed"}{" "}
                          · {opportunity.country || "Country not listed"}
                        </p>
                        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                          <Badge className="max-w-[10rem] truncate" tone="neutral">{opportunity.funding_type || "Funding not listed"}</Badge>
                          {degree ? <Badge className="max-w-[10rem] truncate" tone="neutral">{degree}</Badge> : null}
                          <Badge className="max-w-full truncate" tone="neutral">{formatShortDate(opportunity.deadline)}</Badge>
                        </div>
                      </div>

                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-pine"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink/60">
              No saved opportunities yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StudentDashboardContent() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [applicationSummary, setApplicationSummary] = useState<ApplicationSummary | null>(null);
  const [recentSavedOpportunities, setRecentSavedOpportunities] = useState<SavedOpportunity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingCompletion, setLoadingCompletion] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);

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

    async function loadApplicationAlerts() {
      try {
        const [applicationData, summaryData, savedData] = await Promise.all([
          getApplications(),
          getApplicationSummary(),
          getSavedOpportunities({ page_size: 3 }),
        ]);

        if (mounted) {
          setApplications(summaryData.recently_updated.length ? summaryData.recently_updated : applicationData.results);
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

    void loadApplicationAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  const completionPercent = completion?.completion_percentage ?? 0;
  const readinessScore = completion?.scholarship_readiness_score ?? 0;
  const readinessLevel = completion?.readiness_level ?? "Low";
  const missingFields = completion?.missing_profile_fields ?? [];
  const missingDocuments = completion?.missing_core_documents ?? [];

  const firstName = getFirstName(user?.full_name);

  const nextStep = useMemo(() => {
    if (completionPercent < 50) {
      return {
        title: "Complete your profile first",
        description:
          "Add your education, goals, target countries, field preferences, and document status so your workspace becomes more useful.",
        href: "/dashboard/profile",
        action: "Update Profile",
        icon: UserRoundCheck,
      };
    }

    if (missingDocuments.length > 0) {
      return {
        title: "Prepare missing documents",
        description:
          "Your profile is improving. Now focus on the documents that most scholarship applications commonly ask for.",
        href: "/dashboard/profile",
        action: "Review Documents",
        icon: FileText,
      };
    }

    if (readinessScore < 70) {
      return {
        title: "Review recommended scholarships",
        description:
          "Use your profile to explore opportunities and decide which scholarships are worth your time.",
        href: "/dashboard/recommendations",
        action: "View Recommendations",
        icon: Star,
      };
    }

    return {
      title: "Move applications forward",
      description:
        "Your profile looks ready. Save promising scholarships and use the tracker to manage each application clearly.",
      href: "/dashboard/applications",
      action: "Open Tracker",
      icon: ClipboardCheck,
    };
  }, [completionPercent, missingDocuments.length, readinessScore]);

  const actionCards: ActionCard[] = [
    {
      title: "Find scholarships",
      description: "Browse opportunities and shortlist the ones that fit your academic goals.",
      href: "/scholarships",
      action: "Browse",
      icon: Search,
    },
    {
      title: "Saved opportunities",
      description: "Return to scholarships you saved and choose what to work on next.",
      href: "/dashboard/saved",
      action: "View Saved",
      icon: ShieldCheck,
    },
    {
      title: "Application tracker",
      description: "Manage deadlines, SOP drafts, checklists, Drive links, readiness, and next actions.",
      href: "/dashboard/applications",
      action: "Open Tracker",
      icon: ClipboardCheck,
    },
    {
      title: "SOP generator",
      description: "Prepare a scholarship SOP draft using your study goals and details.",
      href: "/dashboard/ai/sop",
      action: "Open Tool",
      icon: Sparkles,
      badge: "AI Tool",
    },
  ];

  const NextStepIcon = nextStep.icon;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <Badge tone="mint" className="mb-3">
              <GraduationCap size={14} aria-hidden="true" />
              Student workspace
            </Badge>

            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Welcome back, {firstName}.
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
              Keep your scholarship search organized: profile, recommendations, saved opportunities,
              SOP drafts, and tracked applications in one place.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
              <span className="rounded-full bg-cream px-2.5 py-1">
                Profile {completionPercent}%
              </span>
              <span className="rounded-full bg-cream px-2.5 py-1">
                Readiness {readinessScore}/100
              </span>
              <span className="rounded-full bg-cream px-2.5 py-1">
                Applications {applicationSummary?.total ?? applications.length}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/scholarships" className="w-full sm:w-auto" size="sm">
                Browse Scholarships
                <ArrowRight size={15} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/dashboard/applications" className="w-full sm:w-auto" size="sm" variant="outline">
                Open Tracker
              </ButtonLink>
              <ButtonLink href="/dashboard/profile" className="w-full sm:w-auto" size="sm" variant="ghost">
                Improve Profile
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-pine/10 bg-mint/35 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                  Next best step
                </p>
                <h2 className="mt-1 text-lg font-bold leading-snug text-ink">{nextStep.title}</h2>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
                <NextStepIcon size={19} aria-hidden="true" />
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-ink/65">{nextStep.description}</p>

            <ButtonLink href={nextStep.href} className="mt-3 w-full sm:w-auto" size="sm" variant="secondary">
              {nextStep.action}
            </ButtonLink>
          </div>
        </div>
      </section>

      <ApplicationActionCenter
        applications={applications}
        loading={loadingApplications}
        summary={applicationSummary}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Preparation overview
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">Profile, readiness, and gaps</h2>
          </div>
          <ButtonLink href="/dashboard/profile" size="sm" variant="outline">
            Update Profile
          </ButtonLink>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Profile", loadingCompletion ? "..." : `${completionPercent}%`],
            ["Readiness", `${readinessScore}/100`],
            ["Level", readinessLevel],
            ["Fields", missingFields.length],
            ["Docs", missingDocuments.length],
          ].map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-pine/10 bg-cream/35 px-3 py-2"
            >
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-ink/35">
                {label}
              </p>
              <p className="mt-0.5 truncate text-base font-bold leading-tight text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-pine/10">
          <div
            className="h-full rounded-full bg-pine"
            style={{ width: `${Math.min(Math.max(readinessScore, 0), 100)}%` }}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-pine/10 bg-mint/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListChecks size={16} className="text-pine" aria-hidden="true" />
                <p className="text-sm font-bold text-ink">Profile fields</p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/50">
                {missingFields.length}
              </span>
            </div>

            {missingFields.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missingFields.slice(0, 6).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/65"
                  >
                    {item}
                  </span>
                ))}
                {missingFields.length > 6 ? (
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/45">
                    +{missingFields.length - 6} more
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink/60">
                Key profile fields look complete.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-pine/10 bg-skyglass p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-pine" aria-hidden="true" />
                <p className="text-sm font-bold text-ink">Core documents</p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/50">
                {missingDocuments.length}
              </span>
            </div>

            {missingDocuments.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missingDocuments.slice(0, 6).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/65"
                  >
                    {item}
                  </span>
                ))}
                {missingDocuments.length > 6 ? (
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink/45">
                    +{missingDocuments.length - 6} more
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink/60">
                Core documents look ready.
              </p>
            )}
          </div>
        </div>
      </section>

      <ContinueWorkingSection
        applications={applicationSummary?.recently_updated ?? applications}
        loading={loadingApplications}
        savedOpportunities={recentSavedOpportunities}
      />

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Quick links
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">Continue working</h2>
          </div>
          <ButtonLink href="/blog" size="sm" variant="outline">
            Scholarship Guides
          </ButtonLink>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.href} className="transition hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    {item.badge ? <Badge tone="saffron">{item.badge}</Badge> : null}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-ink/60">{item.description}</p>
                  <ButtonLink href={item.href} className="mt-3" size="sm" variant="ghost">
                    {item.action}
                    <ArrowRight size={15} aria-hidden="true" />
                  </ButtonLink>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
