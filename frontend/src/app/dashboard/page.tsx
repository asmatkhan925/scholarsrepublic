"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  BookOpenCheck,
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
import { Badge, ButtonLink, Card, CardContent, EmptyState, StatCard } from "@/components/ui";
import { getApplications, getApplicationSummary, getProfileCompletion } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityApplication, ApplicationSummary } from "@/types/opportunity";
import type { ProfileCompletion } from "@/types/profile";

type ActionCard = {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: typeof UserRoundCheck;
  badge?: string;
};

function getReadinessTone(level: string): "mint" | "saffron" | "danger" {
  if (level === "High") {
    return "mint";
  }

  if (level === "Medium") {
    return "saffron";
  }

  return "danger";
}

function getFirstName(fullName?: string) {
  if (!fullName) {
    return "Student";
  }

  return fullName.trim().split(/\s+/)[0] || "Student";
}

function getDaysUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  const deadline = new Date(value);
  const diff = deadline.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getApplicationDeadline(application: OpportunityApplication) {
  return application.personal_deadline || application.opportunity_detail.deadline;
}

function getApplicationReadinessScore(application: OpportunityApplication) {
  const checklist = application.checklist_snapshot ?? [];
  const completedChecklistCount = checklist.filter((item) => item.done).length;
  const linkedChecklistCount = checklist.filter((item) => item.url?.trim()).length;
  const checklistReadiness = checklist.length
    ? Math.round((completedChecklistCount / checklist.length) * 40)
    : 0;

  return Math.min(
    100,
    checklistReadiness +
      (application.latest_sop_draft ? 20 : 0) +
      (linkedChecklistCount > 0 ? 10 : 0) +
      (getApplicationDeadline(application) ? 10 : 0) +
      (application.next_step.trim() ? 10 : 0) +
      (application.status !== "preparing" ? 10 : 0),
  );
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
        <CardContent className="p-4 text-sm text-ink/60">
          Loading application alerts...
        </CardContent>
      </Card>
    );
  }

  if (totalTracked === 0) {
    return (
      <section className="rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
              <ClipboardCheck size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                Application Action Center
              </p>
              <h2 className="mt-1 text-lg font-bold text-ink">No tracked applications yet</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                Start tracking scholarships so deadlines, SOP drafts, documents, and next steps stay organized.
              </p>
            </div>
          </div>
          <ButtonLink href="/scholarships" className="w-full sm:w-auto" variant="outline">
            Browse Scholarships
            <ArrowRight size={16} aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    );
  }

  const alertItems = [
    { label: "Tracked", value: totalTracked, href: "/dashboard/applications" },
    { label: "Overdue", value: overdue, href: "/dashboard/applications" },
    { label: "Due soon", value: dueSoon, href: "/dashboard/applications" },
    { label: "Missing SOP", value: missingSop, href: "/dashboard/applications" },
    { label: "Weak readiness", value: weakReadiness, href: "/dashboard/applications" },
  ];

  return (
    <section className="rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
            <ClipboardCheck size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
              Application Action Center
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">
              {needsAttention > 0 ? "Some applications need attention" : "Applications look organized"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Review urgent deadlines, SOP gaps, and weak readiness before working on new scholarships.
            </p>
          </div>
        </div>

        <ButtonLink href="/dashboard/applications" className="w-full sm:w-auto" variant="secondary">
          Open Tracker
          <ArrowRight size={16} aria-hidden="true" />
        </ButtonLink>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {alertItems.map((item) => (
          <ButtonLink
            key={item.label}
            href={item.href}
            className="justify-between rounded-2xl border-pine/10 bg-cream/40 px-3 py-2 text-left text-ink hover:bg-pine/5"
            variant="outline"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/40">
              {item.label}
            </span>
            <span className="text-base font-bold text-ink">{item.value}</span>
          </ButtonLink>
        ))}
      </div>
    </section>
  );
}

function StudentDashboardContent() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [applicationSummary, setApplicationSummary] = useState<ApplicationSummary | null>(null);
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
        const [applicationData, summaryData] = await Promise.all([
          getApplications(),
          getApplicationSummary(),
        ]);

        if (mounted) {
          setApplications(applicationData.results);
          setApplicationSummary(summaryData);
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-pine/10 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-6 md:p-8">
            <Badge tone="mint" className="mb-4">
              <GraduationCap size={14} aria-hidden="true" />
              Student workspace
            </Badge>

            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-4xl">
              Welcome back, {firstName}.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70 md:text-base">
              Use your dashboard to keep your scholarship search organized: improve your profile,
              save opportunities, track applications, and prepare documents before deadlines arrive.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard/profile" className="w-full sm:w-auto">
                Improve Profile
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/scholarships" className="w-full sm:w-auto" variant="outline">
                Browse Scholarships
              </ButtonLink>
            </div>
          </div>

          <div className="border-t border-pine/10 bg-mint/45 p-5 sm:p-6 md:p-7 lg:border-l lg:border-t-0">
            <div className="h-full rounded-[1.5rem] border border-pine/10 bg-white/90 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-pine">
                    Next best step
                  </p>
                  <h2 className="mt-3 text-xl font-bold text-ink">{nextStep.title}</h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pine text-white">
                  <NextStepIcon size={21} aria-hidden="true" />
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-ink/65">{nextStep.description}</p>

              <ButtonLink
                href={nextStep.href}
                className="mt-5 w-full sm:w-auto"
                variant="secondary"
              >
                {nextStep.action}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <ApplicationActionCenter
        applications={applications}
        loading={loadingApplications}
        summary={applicationSummary}
      />

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          description={
            loadingCompletion ? "Loading profile progress..." : "Profile fields completed"
          }
          label="Profile completion"
          value={`${completionPercent}%`}
        />
        <StatCard
          description="Based on profile details and preparation signals"
          label="Scholarship readiness"
          value={`${readinessScore}/100`}
        />
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine/70">
            Readiness level
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge tone={getReadinessTone(readinessLevel)}>{readinessLevel}</Badge>
            <span className="text-sm text-ink/60">Keep improving step by step</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-pine/10">
            <div
              className="h-full rounded-full bg-pine"
              style={{ width: `${Math.min(Math.max(readinessScore, 0), 100)}%` }}
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
                  Profile gaps
                </p>
                <h2 className="mt-2 text-xl font-bold text-ink">Missing profile fields</h2>
              </div>
              <ListChecks className="text-pine" size={24} aria-hidden="true" />
            </div>

            {missingFields.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {missingFields.slice(0, 6).map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-pine/10 bg-mint/30 px-4 py-2 text-sm text-ink/75"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="mt-4 p-5"
                description="Your key profile fields are complete. Keep them updated as your goals change."
                icon={<UserRoundCheck size={22} aria-hidden="true" />}
                title="Profile looks good"
              />
            )}

            {missingFields.length > 6 ? (
              <p className="mt-3 text-sm text-ink/55">
                +{missingFields.length - 6} more fields need attention.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
                  Documents
                </p>
                <h2 className="mt-2 text-xl font-bold text-ink">Missing core documents</h2>
              </div>
              <FileText className="text-pine" size={24} aria-hidden="true" />
            </div>

            {missingDocuments.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {missingDocuments.slice(0, 6).map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-pine/10 bg-skyglass px-4 py-2 text-sm text-ink/75"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="mt-4 p-5"
                description="Your important application documents look ready. Review official requirements before applying."
                icon={<BookOpenCheck size={22} aria-hidden="true" />}
                title="Core documents look ready"
              />
            )}

            {missingDocuments.length > 6 ? (
              <p className="mt-3 text-sm text-ink/55">
                +{missingDocuments.length - 6} more documents need attention.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
              Quick actions
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Keep your applications moving</h2>
          </div>
          <ButtonLink href="/blog" variant="outline">
            Scholarship Guides
          </ButtonLink>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.href} className="transition hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-pine">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    {item.badge ? <Badge tone="saffron">{item.badge}</Badge> : null}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{item.description}</p>
                  <ButtonLink href={item.href} className="mt-4" variant="ghost">
                    {item.action}
                    <ArrowRight size={16} aria-hidden="true" />
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
