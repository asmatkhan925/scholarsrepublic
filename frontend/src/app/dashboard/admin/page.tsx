"use client";

import { useEffect, useState } from "react";

import {
  Activity,
  ArrowRight,
  Database,
  FileSearch,
  GraduationCap,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminHero, AdminMetric, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui";
import { getAdminOverview, type AdminOverviewResponse } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type AdminHub = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

const adminHubs: AdminHub[] = [
  {
    title: "Scholarship Management",
    description: "Import, review, edit, publish, verify, and maintain scholarship listings.",
    href: "/dashboard/admin/scholarships",
    icon: GraduationCap,
    badge: "Core",
  },
  {
    title: "Research Leads",
    description: "Review scholarship links and GPT-assisted lead research before draft creation.",
    href: "/dashboard/admin/scholarships/research-leads",
    icon: FileSearch,
  },
  {
    title: "Social / Marketing Center",
    description: "Monitor social automation, Facebook plans, drafts, logs, and Custom GPT workflows.",
    href: "/dashboard/admin/social",
    icon: Activity,
    badge: "Social",
  },
  {
    title: "System / Monitoring",
    description: "Moderation, deadline queues, scheduler health, and operational monitoring.",
    href: "/dashboard/admin/comments",
    icon: ShieldCheck,
  },
  {
    title: "Settings / Tools",
    description: "Django admin fallback, pathways, users, profiles, and lower-level tools.",
    href: "/admin",
    icon: Settings,
  },
];

function HubCard({ item }: { item: AdminHub }) {
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      className="group rounded-2xl border border-pine/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-mint/20 hover:shadow-md dark:border-white/10 dark:bg-[#181b1d] dark:hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
          <Icon size={18} aria-hidden="true" />
        </span>
        {item.badge ? <Badge tone="mint">{item.badge}</Badge> : null}
      </div>

      <h2 className="mt-4 text-lg font-bold leading-snug text-ink group-hover:text-pine dark:text-white">
        {item.title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/58">
        {item.description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-pine">
        Open hub
        <ArrowRight size={13} aria-hidden="true" />
      </span>
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
      description="Structured hub for scholarship operations, social workflows, monitoring, and tools."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Admin Hub"
          title={`Welcome, ${user?.full_name ?? "Admin"}.`}
          description="Choose a work area, then drill into the specific review queue or tool you need."
          icon={Database}
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
                Review drafts
              </a>
            </>
          }
          metrics={
            <>
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
                label="Pending comments"
                value={overview?.comments.pending ?? "..."}
                tone={(overview?.comments.pending ?? 0) > 0 ? "warning" : "normal"}
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

        <section>
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Work areas
            </p>
            <h1 className="mt-1 text-xl font-bold text-ink dark:text-white">
              Admin centers
            </h1>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {adminHubs.map((item) => (
              <HubCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-pine" aria-hidden="true" />
            <h2 className="text-lg font-bold text-ink dark:text-white">
              Publishing rule
            </h2>
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-ink/60 dark:text-white/58">
            Keep source verification, deadline checks, social copy, and final publishing as separate
            review steps. Custom GPTs can help draft and review text, but the admin panel and Worker
            control what is saved, scheduled, and posted.
          </p>
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
