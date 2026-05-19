"use client";

import { useEffect, useState } from "react";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSearch,
  GraduationCap,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui";
import { getAdminOverview, type AdminOverviewResponse } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type AdminAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  tone?: "primary" | "normal" | "warning";
};

type WorkflowStep = {
  label: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const workflowSteps: WorkflowStep[] = [
  {
    label: "Step 1",
    title: "Import with GPT",
    description: "Paste the official source, copy the prompt, paste GPT JSON, and create a draft.",
    href: "/dashboard/admin/scholarships/import",
    icon: Sparkles,
  },
  {
    label: "Step 2",
    title: "Review queue",
    description: "Fix warnings, errors, missing fields, source link, funding, deadline, and eligibility.",
    href: "/dashboard/admin/scholarships/drafts",
    icon: FileSearch,
  },
  {
    label: "Step 3",
    title: "Edit scholarship",
    description: "Open the imported scholarship, fix fields, improve wording, and prepare it for students.",
    href: "/dashboard/admin/scholarships",
    icon: GraduationCap,
  },
  {
    label: "Step 4",
    title: "Publish and verify",
    description: "Publish only after checking the official source. Mark verified only after final review.",
    href: "/dashboard/admin/scholarships",
    icon: ShieldCheck,
  },
];

const mainActions: AdminAction[] = [
  {
    title: "Import scholarship with GPT",
    description: "Best starting point. Use an official source URL/text and create a structured OpportunityDraft.",
    href: "/dashboard/admin/scholarships/import",
    icon: Sparkles,
    badge: "Start here",
    tone: "primary",
  },
  {
    title: "Review queue",
    description: "Fix imported items that need action. Clean items become scholarship drafts automatically.",
    href: "/dashboard/admin/scholarships/drafts",
    icon: FileSearch,
    badge: "Review",
    tone: "primary",
  },
  {
    title: "Scholarship manager",
    description: "Search, publish, archive, feature, verify, preview, and edit scholarships.",
    href: "/dashboard/admin/scholarships",
    icon: GraduationCap,
    badge: "Main",
    tone: "primary",
  },
  {
    title: "Comment moderation",
    description: "Approve pending comments, hide active comments, and review deleted comments.",
    href: "/dashboard/admin/comments",
    icon: MessageSquare,
    badge: "Moderation",
    tone: "warning",
  },
];

const supportActions: AdminAction[] = [
  {
    title: "Django Admin fallback",
    description: "Use only when a field or model is not available in the custom workbench yet.",
    href: "/admin",
    icon: Database,
  },
  {
    title: "Manage pathways",
    description: "Organize country hubs, scholarship programs, application tracks, and pathway grouping.",
    href: "/admin/opportunities/opportunitypathway/",
    icon: BookOpenCheck,
  },
  {
    title: "Student users",
    description: "Review accounts, roles, staff status, and access issues.",
    href: "/admin/users/user/",
    icon: Users,
  },
  {
    title: "Student profiles",
    description: "Inspect profile data used for recommendations and match scoring.",
    href: "/admin/profiles/studentprofile/",
    icon: ShieldCheck,
  },
];

function MiniStat({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string | number;
  tone?: "normal" | "warning" | "danger";
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        tone === "danger"
          ? "border-red-200 bg-red-50 dark:border-red-400/25 dark:bg-red-500/10"
          : tone === "warning"
            ? "border-saffron/30 bg-saffron/10 dark:border-saffron/25 dark:bg-saffron/10"
            : "border-pine/10 bg-white dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ActionCard({ item }: { item: AdminAction }) {
  const Icon = item.icon;
  const primary = item.tone === "primary";
  const warning = item.tone === "warning";

  return (
    <a
      href={item.href}
      className={`group rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#181b1d] dark:hover:bg-white/5 ${
        primary
          ? "border-pine/15 bg-mint/30 hover:border-pine/30 hover:bg-mint/45"
          : warning
            ? "border-saffron/30 bg-saffron/10 hover:border-saffron/50"
            : "border-pine/10 bg-white hover:border-pine/25 hover:bg-mint/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
          <Icon size={17} aria-hidden="true" />
        </span>
        {item.badge ? <Badge tone={warning ? "saffron" : "mint"}>{item.badge}</Badge> : null}
      </div>

      <h2 className="mt-3 text-base font-bold leading-snug text-ink group-hover:text-pine dark:text-white">
        {item.title}
      </h2>

      <p className="mt-1 line-clamp-3 text-sm leading-5 text-ink/60 dark:text-white/58">
        {item.description}
      </p>

      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-pine">
        Open
        <ArrowRight size={13} aria-hidden="true" />
      </span>
    </a>
  );
}

function WorkflowCard({ step }: { step: WorkflowStep }) {
  const Icon = step.icon;

  return (
    <a
      href={step.href}
      className="rounded-2xl border border-pine/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-mint/25 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
          <Icon size={17} aria-hidden="true" />
        </span>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
            {step.label}
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-ink dark:text-white">{step.title}</h3>
          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/55">
            {step.description}
          </p>
        </div>
      </div>
    </a>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const data = await getAdminOverview();

        if (active) {
          setOverview(data);
          setOverviewError(null);
        }
      } catch (requestError) {
        if (active) {
          setOverviewError(getErrorMessage(requestError));
        }
      }
    }

    void loadOverview();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell
      mode="admin"
      title="Admin Dashboard"
      description="Scholarship research, GPT import, draft review, publishing, verification, and moderation."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="px-4 py-4 md:px-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                <ShieldCheck size={14} aria-hidden="true" />
                Scholarship Admin Workbench
              </div>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Welcome, {user?.full_name ?? "Admin"}.
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Import scholarships, review drafts, publish verified listings, and moderate comments.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/dashboard/admin/scholarships/import"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  Import scholarship
                  <ArrowRight size={15} aria-hidden="true" />
                </a>

                <a
                  href="/dashboard/admin/scholarships/drafts"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Review queue
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-1.5">
                <MiniStat
                  label="Pending comments"
                  value={overview?.comments.pending ?? "..."}
                  tone={(overview?.comments.pending ?? 0) > 0 ? "warning" : "normal"}
                />
                <MiniStat
                  label="Needs review"
                  value={overview?.drafts.needs_review ?? "..."}
                  tone={(overview?.drafts.needs_review ?? 0) > 0 ? "warning" : "normal"}
                />
                <MiniStat label="Published" value={overview?.scholarships.published ?? "..."} />
                <MiniStat
                  label="Unverified"
                  value={overview?.scholarships.unverified ?? "..."}
                  tone={(overview?.scholarships.unverified ?? 0) > 0 ? "warning" : "normal"}
                />
              </div>

              {overviewError ? (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
                  {overviewError}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Main admin actions
            </p>
            <h2 className="text-xl font-bold text-ink dark:text-white">
              Daily scholarship workflow
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {mainActions.map((item) => (
              <ActionCard key={item.href} item={item} />
            ))}
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-pine/10 bg-white p-3 shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d] md:p-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Recommended process
            </p>
            <h2 className="text-lg font-bold text-ink dark:text-white">
              From official source to published scholarship
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-ink/60 dark:text-white/58">
              Follow this order to avoid publishing weak, incomplete, or unverified scholarship content.
            </p>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <WorkflowCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                Support tools
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink dark:text-white">
                Admin backup and management
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {supportActions.map((item) => (
                <ActionCard key={item.href} item={item} />
              ))}
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded-[1.35rem] border border-saffron/30 bg-saffron/10 p-4 dark:border-saffron/25 dark:bg-saffron/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-pine" aria-hidden="true" />
                <h2 className="text-lg font-bold text-ink dark:text-white">
                  Before publishing
                </h2>
              </div>

              <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                <li>Official source URL is working.</li>
                <li>Deadline is correct or marked rolling.</li>
                <li>Funding claim is supported by source.</li>
                <li>IELTS/no IELTS claim is verified.</li>
                <li>Eligibility and documents are clear.</li>
                <li>Scholarship is marked verified only after final review.</li>
              </ul>
            </div>

            <div className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
              <div className="flex items-center gap-2">
                <Search size={17} className="text-pine" aria-hidden="true" />
                <h2 className="text-lg font-bold text-ink dark:text-white">
                  Research rule
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/58">
                Use official university, government, foundation, or scholarship provider pages. Avoid publishing from blogs, copied lists, or social posts unless verified against the official source.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
