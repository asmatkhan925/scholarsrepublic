"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  ArrowRight,
  Bot,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  Layers,
  MessageSquareText,
  Save,
  RefreshCw,
  Sparkles,
  Send,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminHero, AdminMetric, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import {
  generateSocialGPTCaption,
  getSocialSchedulerStatus,
  type SocialGPTCaptionResponse,
  type SocialSchedulerStatusResponse,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";

type SocialTool = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
};

const socialTools: SocialTool[] = [
  {
    title: "Social Scheduler Monitor",
    description: "Review daily caps, spacing, due queue previews, next collection plans, and recent logs.",
    href: "/dashboard/admin/social/scheduler",
    icon: Activity,
    badge: "Monitor",
  },
  {
    title: "Opportunity Facebook Post Plans",
    description: "Inspect individual scholarship Facebook plans, priority scores, status, captions, and images.",
    href: "/admin/opportunities/opportunitysocialpostplan/",
    icon: ClipboardList,
  },
  {
    title: "Collection Facebook Post Plans",
    description: "Review approved collection post plans, scheduled times, priorities, and posted state.",
    href: "/admin/opportunities/opportunitycollectionsocialpostplan/",
    icon: Layers,
  },
  {
    title: "Social Draft Review",
    description: "Open GPT-assisted social drafts for scholarship content review.",
    href: "/admin/opportunities/opportunitysocialdraft/",
    icon: FileText,
  },
  {
    title: "Social Logs",
    description: "Audit post results, skipped items, failures, Facebook IDs, and backend error messages.",
    href: "/admin/opportunities/opportunitysocialpostlog/",
    icon: MessageSquareText,
  },
  {
    title: "GPT Social Assistant",
    description: "Generate reviewable caption drafts for opportunity and collection social plans.",
    href: "#gpt-social-assistant",
    icon: Bot,
    badge: "Draft only",
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
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
            item.disabled ? "bg-ink/35" : "bg-pine",
          )}
        >
          <Icon size={17} aria-hidden="true" />
        </span>
        {item.badge ? <Badge tone={item.disabled ? "neutral" : "mint"}>{item.badge}</Badge> : null}
      </div>

      <h2 className="mt-3 text-base font-bold leading-snug text-ink group-hover:text-pine dark:text-white">
        {item.title}
      </h2>

      <p className="mt-1 line-clamp-3 text-sm leading-5 text-ink/60 dark:text-white/58">
        {item.description}
      </p>

      <span
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 text-xs font-bold",
          item.disabled ? "text-ink/45 dark:text-white/45" : "text-pine",
        )}
      >
        {item.disabled ? "Planned" : "Open"}
        {!item.disabled ? <ArrowRight size={13} aria-hidden="true" /> : null}
      </span>
    </>
  );

  const className = cn(
    "group rounded-2xl border p-3 shadow-sm transition dark:border-white/10 dark:bg-[#181b1d]",
    item.disabled
      ? "border-ink/10 bg-white/70 dark:bg-white/5"
      : "border-pine/10 bg-white hover:-translate-y-0.5 hover:border-pine/25 hover:bg-mint/20 hover:shadow-md dark:hover:bg-white/5",
  );

  if (item.disabled) {
    return (
      <div id="future-gpt-social-assistant" className={className}>
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
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

function GPTSocialAssistant() {
  const [targetType, setTargetType] = useState<"opportunity" | "collection">("opportunity");
  const [planId, setPlanId] = useState("");
  const [preview, setPreview] = useState<SocialGPTCaptionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"preview" | "save" | null>(null);

  const numericPlanId = Number.parseInt(planId, 10);
  const canSubmit = Number.isFinite(numericPlanId) && numericPlanId > 0 && !loadingAction;

  async function runGenerate(save: boolean) {
    if (!canSubmit) {
      setError("Enter a valid social post plan ID.");
      return;
    }

    setLoadingAction(save ? "save" : "preview");
    try {
      const result = await generateSocialGPTCaption(targetType, numericPlanId, { save });
      setPreview(result);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section
      id="gpt-social-assistant"
      className="rounded-[1.35rem] border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
            GPT Social Assistant
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink dark:text-white">
            Generate reviewable Facebook caption drafts
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink/60 dark:text-white/58">
            GPT creates draft text only. It does not post, schedule, or overwrite post text until
            an admin explicitly saves the generated caption.
          </p>
        </div>
        <Badge tone="saffron">Review required</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[12rem_minmax(10rem,16rem)_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Plan type
          <select
            value={targetType}
            onChange={(event) => {
              setTargetType(event.target.value as "opportunity" | "collection");
              setPreview(null);
              setError(null);
            }}
            className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="opportunity">Opportunity plan</option>
            <option value="collection">Collection plan</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Plan ID
          <input
            value={planId}
            onChange={(event) => {
              setPlanId(event.target.value);
              setPreview(null);
              setError(null);
            }}
            inputMode="numeric"
            placeholder="Example: 12"
            className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void runGenerate(false)}
            disabled={!canSubmit}
          >
            <Sparkles size={15} aria-hidden="true" />
            {loadingAction === "preview" ? "Generating" : preview ? "Regenerate" : "Generate GPT Caption"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runGenerate(true)}
            disabled={!canSubmit}
          >
            <Save size={15} aria-hidden="true" />
            {loadingAction === "save" ? "Saving" : "Save to post text"}
          </Button>
        </div>
      </div>

      {error ? <div className="mt-3"><AdminNotice tone="danger">{error}</AdminNotice></div> : null}

      {preview ? (
        <div className="mt-4 rounded-xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={preview.type === "collection" ? "sky" : "mint"}>
                {preview.type}
              </Badge>
              <p className="font-bold text-ink dark:text-white">{preview.title}</p>
            </div>
            <Badge tone={preview.saved ? "mint" : "neutral"}>
              {preview.saved ? "Saved" : "Preview only"}
            </Badge>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/70 dark:text-white/68">
            {preview.generated_text}
          </p>
          <p className="mt-2 text-xs font-semibold text-ink/45 dark:text-white/45">
            {preview.generated_text.length}/{preview.max_chars} characters
          </p>
        </div>
      ) : null}
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
      description="Read-only entry point for social automation monitoring, Facebook plans, drafts, and logs."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Social Automation"
          title="Social / Marketing Center"
          description="Monitor scheduler health and open the social planning records behind Facebook automation."
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
              Monitoring and review
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {socialTools.map((item) => (
              <ToolCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <GPTSocialAssistant />
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
