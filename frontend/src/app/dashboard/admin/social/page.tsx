"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  ArrowRight,
  Bot,
  CalendarClock,
  Check,
  Clipboard,
  ClipboardList,
  Clock,
  FileText,
  Layers,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminHero, AdminMetric, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import { getSocialSchedulerStatus, type SocialSchedulerStatusResponse } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type SocialTool = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type CustomGPTWorkflow = {
  title: string;
  purpose: string;
  whenToUse: string;
  links: Array<{ label: string; href: string }>;
  prompt: string;
};

const socialTools: SocialTool[] = [
  {
    title: "Scheduler Monitor",
    description: "Review caps, spacing, due queue previews, next collection plans, and recent logs.",
    href: "/dashboard/admin/social/scheduler",
    icon: Activity,
    badge: "Monitor",
  },
  {
    title: "Opportunity Social Plans",
    description: "Inspect individual scholarship Facebook plans, priority scores, captions, and images.",
    href: "/admin/opportunities/opportunitysocialpostplan/",
    icon: ClipboardList,
  },
  {
    title: "Collection Social Plans",
    description: "Review collection post plans, scheduled times, priorities, and posted state.",
    href: "/admin/opportunities/opportunitycollectionsocialpostplan/",
    icon: Layers,
  },
  {
    title: "Social Drafts",
    description: "Open GPT-assisted social drafts for scholarship content review.",
    href: "/admin/opportunities/opportunitysocialdraft/",
    icon: FileText,
  },
  {
    title: "Logs",
    description: "Audit posted, skipped, and failed social activity with backend error messages.",
    href: "/admin/opportunities/opportunitysocialpostlog/",
    icon: MessageSquareText,
  },
  {
    title: "Custom GPT Workflows",
    description: "Copy prompts and scheduler context for your existing Custom GPTs. No API call is made.",
    href: "#custom-gpt-workflows",
    icon: Bot,
    badge: "Copy prompts",
  },
];

const customGPTWorkflows: CustomGPTWorkflow[] = [
  {
    title: "Scholarship Scout GPT",
    purpose: "Find and structure verified scholarship research leads from official sources.",
    whenToUse: "Use before draft creation when you want a fresh batch of leads for admin review.",
    links: [
      { label: "Research leads", href: "/dashboard/admin/scholarships/research-leads" },
      { label: "Lead admin", href: "/admin/opportunities/scholarshipresearchlead/" },
    ],
    prompt:
      "Create a batch of 10 verified scholarship research leads for Scholars Republic.\n\nRules:\n- Use official university, government, foundation, or provider links only.\n- Do not use copied blog lists as sources.\n- Include title, provider, country, degree level, funding summary, detected deadline, official URL, source URL, and Pakistan relevance notes.\n- Do not invent funding, eligibility, or deadline details.\n- Mark uncertain details as needs_review.\n- Return structured JSON suitable for admin review.",
  },
  {
    title: "Draft Creator GPT",
    purpose: "Turn ready research leads into private scholarship draft content for review.",
    whenToUse: "Use after leads are verified enough to become OpportunityDraft records.",
    links: [
      { label: "Import with GPT", href: "/dashboard/admin/scholarships/import" },
      { label: "Draft review queue", href: "/dashboard/admin/scholarships/drafts" },
    ],
    prompt:
      "Create scholarship drafts from ready research leads for Scholars Republic.\n\nRules:\n- Use only the supplied lead data and official source text.\n- Produce one scholarship JSON object at a time.\n- Include title, provider, country, degree levels, fields, funding, deadline, eligibility, documents, how to apply, official link, and source URL.\n- Do not invent eligibility, IELTS claims, no-application-fee claims, or funding details.\n- Use clear student-friendly wording.\n- Keep uncertain values blank or flagged for review.",
  },
  {
    title: "Deadline Verifier GPT",
    purpose: "Review official source evidence for scholarships that need deadline verification.",
    whenToUse: "Use when the deadline queue or near-deadline social plans need a source-backed check.",
    links: [
      { label: "Deadline queue", href: "/dashboard/admin/scholarships/deadlines" },
      { label: "Scholarship manager", href: "/dashboard/admin/scholarships" },
    ],
    prompt:
      "Check the next batch of scholarships needing deadline verification for Scholars Republic.\n\nRules:\n- Use only official source evidence supplied in the prompt.\n- Identify whether the deadline is active, expired, changed, unclear, or source unreachable.\n- Quote short evidence snippets only when needed.\n- Return the verified deadline in YYYY-MM-DD format when available.\n- Do not infer a deadline from old blog posts or third-party summaries.\n- Include a concise admin note explaining the decision.",
  },
  {
    title: "Social Draft GPT",
    purpose: "Prepare reviewable social copy variants from existing scholarship/social plan data.",
    whenToUse: "Use before saving captions into opportunity or collection social post plans.",
    links: [
      { label: "Opportunity social plans", href: "/admin/opportunities/opportunitysocialpostplan/" },
      { label: "Collection social plans", href: "/admin/opportunities/opportunitycollectionsocialpostplan/" },
      { label: "Scheduler monitor", href: "/dashboard/admin/social/scheduler" },
    ],
    prompt:
      "Review these Scholars Republic scholarship/social plan records and improve the social drafts.\n\nRules:\n- Use existing scholarship/social plan data only.\n- Do not invent facts, deadlines, eligibility, funding, or provider names.\n- Use official links or Scholars Republic page links only.\n- Produce Facebook caption, WhatsApp text, and LinkedIn text.\n- Keep output professional, concise, and reviewable.\n- No emojis at the beginning.\n- Mention that students should verify details from official sources.\n- Do not post directly. The website/admin panel and Worker control actual posting.\n\nInput data:\nPASTE_SCHEDULER_OR_PLAN_JSON_HERE",
  },
  {
    title: "Facebook/Social Review GPT",
    purpose: "Review saved captions and suggest safer, clearer alternatives before scheduling.",
    whenToUse: "Use when captions already exist but need a fact-safety and tone pass.",
    links: [
      { label: "Social drafts", href: "/admin/opportunities/opportunitysocialdraft/" },
      { label: "Social logs", href: "/admin/opportunities/opportunitysocialpostlog/" },
    ],
    prompt:
      "Review these Scholars Republic social post plans and improve captions.\n\nRules:\n- Keep every claim supported by the supplied plan data.\n- Preserve official links and Scholars Republic page links.\n- Remove unsupported deadline, funding, or eligibility claims.\n- Make the caption professional and concise.\n- Return: risk notes, improved Facebook caption, optional WhatsApp text, optional LinkedIn text.\n- Keep everything reviewable. Do not post directly.",
  },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ToolCard({ item }: { item: SocialTool }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group rounded-2xl border border-pine/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-pine/25 hover:bg-mint/20 hover:shadow-md dark:border-white/10 dark:bg-[#181b1d] dark:hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
          <Icon size={17} aria-hidden="true" />
        </span>
        {item.badge ? <Badge tone="mint">{item.badge}</Badge> : null}
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
    </Link>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "normal",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "normal" | "warning";
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40 dark:text-white/40">
          {label}
        </p>
        <Icon
          size={15}
          className={tone === "warning" ? "text-red-600 dark:text-red-300" : "text-pine"}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1.5 text-lg font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}

function CopyButton({
  value,
  label = "Copy prompt",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void copyValue()}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function workflowSummary(status: SocialSchedulerStatusResponse | null) {
  if (!status) {
    return "";
  }

  return JSON.stringify(
    {
      server_time: status.server_time,
      daily_cap: status.daily_cap,
      daily_remaining: status.daily_remaining,
      due_count: status.due_count,
      returned_count: status.returned_count,
      reason: status.reason,
      due_items: status.due_items.map((item) => ({
        type: item.type,
        plan_id: item.plan_id,
        title: item.collection_title || item.title,
        link_url: item.link_url,
        priority_score: item.priority_score,
        next_post_at: item.next_post_at,
      })),
      next_collection_plans: status.collections.next_plans.map((plan) => ({
        plan_id: plan.id,
        collection_id: plan.collection_id,
        title: plan.collection_title,
        status: plan.status,
        link_url: plan.link_url,
        priority_score: plan.priority_score,
        next_post_at: plan.next_post_at,
      })),
    },
    null,
    2,
  );
}

function CustomGPTWorkflows({ status }: { status: SocialSchedulerStatusResponse | null }) {
  const schedulerJson = useMemo(() => workflowSummary(status), [status]);

  return (
    <section
      id="custom-gpt-workflows"
      className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
            Custom GPT Workflows
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink dark:text-white">
            Copy prompts for your existing GPTs
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-ink/60 dark:text-white/58">
            Custom GPTs generate drafts and review text. The website and Facebook Worker control
            actual saved captions, schedules, and posting.
          </p>
        </div>
        {schedulerJson ? <CopyButton value={schedulerJson} label="Copy scheduler JSON" /> : null}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {customGPTWorkflows.map((workflow) => (
          <article
            key={workflow.title}
            className="rounded-xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-ink dark:text-white">{workflow.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/58">
                  {workflow.purpose}
                </p>
              </div>
              <CopyButton value={workflow.prompt} />
            </div>

            <div className="mt-3 grid gap-2 text-sm leading-6 text-ink/65 dark:text-white/58">
              <p>
                <span className="font-bold text-ink dark:text-white">When:</span>{" "}
                {workflow.whenToUse}
              </p>
              <div className="flex flex-wrap gap-2">
                {workflow.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-pine/15 bg-white px-3 py-1 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    {link.label}
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>

            <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-pine/10 bg-white p-3 text-xs leading-5 text-ink/70 dark:border-white/10 dark:bg-[#101214] dark:text-white/65">
              {workflow.prompt}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function SocialCenterContent() {
  const [status, setStatus] = useState<SocialSchedulerStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSocialSchedulerStatus();
      setStatus(data);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <DashboardShell
      mode="admin"
      title="Social / Marketing Center"
      description="Read-only entry point for social automation monitoring, social records, and Custom GPT workflows."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Social Automation"
          title="Social / Marketing Center"
          description="Monitor scheduler health, open social records, and copy Custom GPT workflow prompts."
          icon={Activity}
          actions={
            <>
              <Link
                href="/dashboard/admin/social/scheduler"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Scheduler monitor
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="#custom-gpt-workflows"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Custom GPT workflows
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadStatus()}
                disabled={loading}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </>
          }
          metrics={
            <>
              <AdminMetric label="Posted today" value={status?.posted_today ?? "..."} />
              <AdminMetric label="Daily remaining" value={status?.daily_remaining ?? "..."} />
              <AdminMetric
                label="Due now"
                value={status ? `${status.returned_count}/${status.due_count}` : "..."}
                tone={(status?.returned_count ?? 0) > 0 ? "warning" : "normal"}
              />
              <AdminMetric
                label="Failed today"
                value={status?.failed_today ?? "..."}
                tone={(status?.failed_today ?? 0) > 0 ? "danger" : "normal"}
              />
            </>
          }
        />

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        <section className="grid gap-3 md:grid-cols-5">
          <SummaryTile label="Posted today" value={status?.posted_today ?? "..."} icon={Send} />
          <SummaryTile
            label="Daily remaining"
            value={status?.daily_remaining ?? "..."}
            icon={Activity}
          />
          <SummaryTile
            label="Due now"
            value={status ? `${status.returned_count}/${status.due_count}` : "..."}
            icon={Clock}
          />
          <SummaryTile
            label="Failed today"
            value={status?.failed_today ?? "..."}
            icon={ShieldAlert}
            tone={(status?.failed_today ?? 0) > 0 ? "warning" : "normal"}
          />
          <SummaryTile
            label="Next allowed"
            value={formatDateTime(status?.next_allowed_post_at)}
            icon={CalendarClock}
          />
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Social tools
            </p>
            <h2 className="text-xl font-bold text-ink dark:text-white">
              Monitoring and records
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {socialTools.map((item) => (
              <ToolCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <CustomGPTWorkflows status={status} />
      </div>
    </DashboardShell>
  );
}

export default function SocialCenterPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SocialCenterContent />
    </ProtectedRoute>
  );
}
