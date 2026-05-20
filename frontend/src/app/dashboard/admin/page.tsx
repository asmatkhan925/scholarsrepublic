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
import { AdminHero, AdminMetric, AdminNotice } from "@/components/admin/AdminUI";
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
        <AdminHero
          eyebrow="Scholarship Admin Workbench"
          title={`Welcome, ${user?.full_name ?? "Admin"}.`}
          description="Import scholarships, review drafts, publish verified listings, and moderate comments."
          icon={ShieldCheck}
          actions={
            <>
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
            </>
          }
          metrics={
            <>
              <AdminMetric
                label="Pending comments"
                value={overview?.comments.pending ?? "..."}
                tone={(overview?.comments.pending ?? 0) > 0 ? "warning" : "normal"}
              />
              <AdminMetric
                label="Needs review"
                value={overview?.drafts.needs_review ?? "..."}
                tone={(overview?.drafts.needs_review ?? 0) > 0 ? "warning" : "normal"}
              />
              <AdminMetric
                label="Published"
                value={overview?.scholarships.published ?? "..."}
                tone="success"
              />
              <AdminMetric
                label="Unverified"
                value={overview?.scholarships.unverified ?? "..."}
                tone={(overview?.scholarships.unverified ?? 0) > 0 ? "warning" : "normal"}
              />
            </>
          }
        />

        {overviewError ? <AdminNotice tone="danger">{overviewError}</AdminNotice> : null}

        {overview ? (
          <section className="grid gap-2 rounded-[1.25rem] border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d] md:grid-cols-4">
            <div className="rounded-xl bg-[#f7faf8] px-3 py-2 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                Draft queue
              </p>
              <p className="mt-1 text-sm font-semibold text-ink/70 dark:text-white/65">
                {overview.drafts.needs_review} need review, {overview.drafts.error} have errors.
              </p>
            </div>
            <div className="rounded-xl bg-[#f7faf8] px-3 py-2 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                Publishing
              </p>
              <p className="mt-1 text-sm font-semibold text-ink/70 dark:text-white/65">
                {overview.scholarships.draft} drafts, {overview.scholarships.expiring_soon} expiring soon.
              </p>
            </div>
            <div className="rounded-xl bg-[#f7faf8] px-3 py-2 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                Students
              </p>
              <p className="mt-1 text-sm font-semibold text-ink/70 dark:text-white/65">
                {overview.students.total} students, {overview.applications.saved} saved opportunities.
              </p>
            </div>
            <div className="rounded-xl bg-[#f7faf8] px-3 py-2 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
                Comments
              </p>
              <p className="mt-1 text-sm font-semibold text-ink/70 dark:text-white/65">
                {overview.comments.pending} pending, {overview.comments.active} approved.
              </p>
            </div>
          </section>
        ) : null}

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
