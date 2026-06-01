"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  Check,
  Clipboard,
  ExternalLink,
  RefreshCw,
  Save,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminHero, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import {
  type AdminCollectionSocialPlan,
  type AdminOpportunitySocialPlan,
  type AdminSocialPlanQuery,
  getAdminCollectionSocialPlans,
  getAdminOpportunitySocialPlans,
  saveAdminCollectionSocialPlanCaption,
  saveAdminOpportunitySocialPlanCaption,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type PlanKind = "opportunity" | "collection";
type SocialPlan = AdminOpportunitySocialPlan | AdminCollectionSocialPlan;

type SocialPlanReviewPageProps = {
  kind: PlanKind;
  title: string;
  description: string;
  icon: LucideIcon;
};

const opportunityStatuses = ["all", "draft", "ready", "paused", "archived"];
const collectionStatuses = ["all", "draft", "ready", "posted", "failed", "paused", "archived"];
const collectionRecordStatuses = ["all", "draft", "ready", "approved", "posted", "paused", "archived"];
const decisions = ["all", "individual", "collection_candidate", "website_only", "manual_review"];
const deadlineWindows = [
  "all",
  "urgent",
  "soon",
  "advance_notice",
  "early_awareness",
  "far",
  "missing",
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

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function planTitle(plan: SocialPlan) {
  return plan.type === "collection" ? plan.collection_title : plan.opportunity_title;
}

function planRecordStatus(plan: SocialPlan) {
  return plan.type === "collection" ? plan.collection_status : plan.opportunity_status;
}

function planNearDeadline(plan: SocialPlan) {
  return plan.type === "collection" ? plan.has_near_deadline_item : plan.is_near_deadline;
}

function blockingReasonLabels(plan: SocialPlan) {
  return plan.hard_blocking_reasons.length
    ? plan.hard_blocking_reasons.map(formatLabel).join(", ")
    : "None";
}

function qualityWarningLabels(plan: SocialPlan) {
  return plan.quality_warnings.length ? plan.quality_warnings.map(formatLabel).join(", ") : "None";
}

function tierBadge(plan: SocialPlan) {
  if (plan.hard_blocking_reasons.length) {
    return { tone: "danger" as const, label: "Hard blocked" };
  }
  if (plan.fallback_eligible) {
    return { tone: "saffron" as const, label: "Fallback eligible" };
  }
  return { tone: "mint" as const, label: "Strict best" };
}

function planJson(plan: SocialPlan) {
  return JSON.stringify(
    {
      type: plan.type,
      plan_id: plan.id,
      title: planTitle(plan),
      record_status: planRecordStatus(plan),
      plan_status: plan.status,
      caption: plan.post_text,
      link_url: plan.link_url,
      next_post_at: plan.next_post_at,
      priority_score: plan.priority_score,
      deadline_window: plan.deadline_window,
      deadline_window_label: plan.deadline_window_label,
      has_image: plan.has_image,
      has_caption: plan.has_caption,
      auto_post_tier: plan.auto_post_tier,
      auto_post_tier_label: plan.auto_post_tier_label,
      auto_post_rank_score: plan.auto_post_rank_score,
      fallback_eligible: plan.fallback_eligible,
      hard_blocking_reasons: plan.hard_blocking_reasons,
      quality_warnings: plan.quality_warnings,
      ...(plan.type === "opportunity"
        ? {
            opportunity_id: plan.opportunity_id,
            provider_name: plan.provider_name,
            country: plan.country,
            deadline: plan.deadline,
            days_until_deadline: plan.days_until_deadline,
            is_near_deadline: plan.is_near_deadline,
            auto_social_decision: plan.auto_social_decision,
          }
        : {
            collection_id: plan.collection_id,
            collection_type: plan.collection_type,
            deadline: plan.deadline,
            days_until_deadline: plan.days_until_deadline,
            has_near_deadline_item: plan.has_near_deadline_item,
            has_expired_item: plan.has_expired_item,
            posted_at: plan.posted_at,
          }),
    },
    null,
    2,
  );
}

function customGPTPrompt(plan: SocialPlan) {
  return `Review this Scholars Republic social post plan for a Custom GPT workflow.

Rules:
- Use only the supplied plan data.
- Do not invent facts, deadlines, eligibility, funding, or provider names.
- Preserve official links or Scholars Republic page links.
- Produce improved Facebook caption, WhatsApp text, and LinkedIn text.
- Keep output reviewable.
- Do not post directly. The website/admin panel and Worker control actual posting.

Plan data:
${planJson(plan)}`;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
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

function PlanCard({
  plan,
  onSaveCaption,
}: {
  plan: SocialPlan;
  onSaveCaption: (plan: SocialPlan, caption: string) => Promise<void>;
}) {
  const [caption, setCaption] = useState(plan.post_text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCaption(plan.post_text);
  }, [plan.post_text]);

  async function saveCaption() {
    setSaving(true);
    setError("");
    try {
      await onSaveCaption(plan, caption);
    } catch (saveError) {
      setError(getErrorMessage(saveError) ?? "Caption save failed.");
    } finally {
      setSaving(false);
    }
  }
  const statusBadge = tierBadge(plan);

  return (
    <article className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={plan.type === "collection" ? "sky" : "mint"}>#{plan.id}</Badge>
            <Badge tone="neutral">{plan.status}</Badge>
            <Badge tone="neutral">{planRecordStatus(plan)}</Badge>
            {"auto_social_decision" in plan ? (
              <Badge tone="neutral">{formatLabel(plan.auto_social_decision)}</Badge>
            ) : null}
            <Badge tone={plan.has_image ? "mint" : "danger"}>
              {plan.has_image ? "Has image" : "Missing image"}
            </Badge>
            <Badge tone={plan.has_caption ? "mint" : "danger"}>
              {plan.has_caption ? "Has caption" : "Missing caption"}
            </Badge>
            <Badge tone={planNearDeadline(plan) ? "mint" : "saffron"}>
              {planNearDeadline(plan) ? "Near deadline" : "Not near deadline"}
            </Badge>
            <Badge tone="sky">{plan.deadline_window_label}</Badge>
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
            <Badge tone="neutral">{plan.auto_post_tier_label}</Badge>
          </div>
          <h2 className="mt-2 text-base font-bold text-ink dark:text-white">{planTitle(plan)}</h2>
          <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
            Next post: {formatDateTime(plan.next_post_at)} · Priority {plan.priority_score}
          </p>
          {"provider_name" in plan ? (
            <p className="mt-1 text-xs text-ink/55 dark:text-white/50">
              {plan.provider_name || "No provider"} · {plan.country || "No country"} · Deadline{" "}
              {plan.deadline || "-"}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink/55 dark:text-white/50">
              Collection #{plan.collection_id} · {formatLabel(plan.collection_type)}
            </p>
          )}
          <p className="mt-2 text-xs font-semibold text-ink/55 dark:text-white/55">
            Rank: {plan.auto_post_rank_score} · Hard blockers: {blockingReasonLabels(plan)} ·
            Quality warnings: {qualityWarningLabels(plan)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CopyButton value={customGPTPrompt(plan)} label="Copy for GPT" />
          <CopyButton value={planJson(plan)} label="Copy JSON" />
          {plan.link_url ? (
            <a
              href={plan.link_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-3 text-sm font-semibold text-pine shadow-sm transition hover:border-pine/30 hover:bg-mint/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Link
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : null}
          <a
            href={plan.admin_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-3 text-sm font-semibold text-pine shadow-sm transition hover:border-pine/30 hover:bg-mint/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Django admin
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Caption
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={7}
            className="rounded-xl border border-pine/15 bg-[#f7faf8] px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
            placeholder="No caption saved yet."
          />
        </label>
        <div className="grid content-end gap-2">
          <p className="text-xs font-semibold text-ink/45 dark:text-white/45">
            {caption.length} characters
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void saveCaption()}
            disabled={saving || caption === plan.post_text}
          >
            <Save size={15} aria-hidden="true" />
            {saving ? "Saving" : "Save caption"}
          </Button>
        </div>
      </div>

      {plan.link_url ? (
        <p className="mt-2 break-all text-xs font-semibold text-pine">{plan.link_url}</p>
      ) : null}
      {error ? (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </article>
  );
}

function SocialPlanReviewContent({ kind, title, description, icon: Icon }: SocialPlanReviewPageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [collectionStatusFilter, setCollectionStatusFilter] = useState("all");
  const [dueOnly, setDueOnly] = useState(false);
  const [strictBestOnly, setStrictBestOnly] = useState(false);
  const [fallbackEligibleOnly, setFallbackEligibleOnly] = useState(false);
  const [hardBlockedOnly, setHardBlockedOnly] = useState(false);
  const [missingImageOnly, setMissingImageOnly] = useState(false);
  const [missingCaptionOnly, setMissingCaptionOnly] = useState(false);
  const [nearDeadlineOnly, setNearDeadlineOnly] = useState(false);
  const [deadlineWindowFilter, setDeadlineWindowFilter] = useState("all");
  const [plans, setPlans] = useState<SocialPlan[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    const params: AdminSocialPlanQuery = {
      q: query || undefined,
      status: statusFilter,
      due: dueOnly || undefined,
      strict_best: strictBestOnly || undefined,
      fallback_eligible: fallbackEligibleOnly || undefined,
      hard_blocked: hardBlockedOnly || undefined,
      missing_image: missingImageOnly || undefined,
      missing_caption: missingCaptionOnly || undefined,
      near_deadline: nearDeadlineOnly || undefined,
      deadline_window: deadlineWindowFilter === "all" ? undefined : deadlineWindowFilter,
      limit: 75,
    };
    if (kind === "opportunity") {
      params.auto_social_decision = decisionFilter;
    } else {
      params.collection_status = collectionStatusFilter;
    }
    try {
      const response =
        kind === "opportunity"
          ? await getAdminOpportunitySocialPlans(params)
          : await getAdminCollectionSocialPlans(params);
      setPlans(response.items);
      setCount(response.count);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Social plans could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [
    collectionStatusFilter,
    deadlineWindowFilter,
    decisionFilter,
    dueOnly,
    fallbackEligibleOnly,
    hardBlockedOnly,
    kind,
    missingCaptionOnly,
    missingImageOnly,
    nearDeadlineOnly,
    query,
    statusFilter,
    strictBestOnly,
  ]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  async function saveCaption(plan: SocialPlan, caption: string) {
    const updated =
      plan.type === "opportunity"
        ? await saveAdminOpportunitySocialPlanCaption(plan.id, caption)
        : await saveAdminCollectionSocialPlanCaption(plan.id, caption);
    setPlans((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  const allPlansJson = useMemo(
    () =>
      JSON.stringify(
        plans.map((plan) => JSON.parse(planJson(plan)) as unknown),
        null,
        2,
      ),
    [plans],
  );

  return (
    <DashboardShell mode="admin" title={title} description={description} hideHeader>
      <div className="space-y-4">
        <AdminHero
          eyebrow="Social / Marketing Center"
          title={title}
          description={description}
          icon={Icon}
          backHref="/dashboard/admin/social"
          backLabel="Social center"
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => void loadPlans()} disabled={loading}>
                <RefreshCw size={15} aria-hidden="true" />
                {loading ? "Refreshing" : "Refresh"}
              </Button>
              <CopyButton value={allPlansJson} label="Copy visible plans" />
            </>
          }
        />

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        <section className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_10rem_auto] lg:items-end">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Plan ID, title, caption, provider, link"
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Plan status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {(kind === "opportunity" ? opportunityStatuses : collectionStatuses).map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            {kind === "opportunity" ? (
              <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                Decision
                <select
                  value={decisionFilter}
                  onChange={(event) => setDecisionFilter(event.target.value)}
                  className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  {decisions.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
                Collection
                <select
                  value={collectionStatusFilter}
                  onChange={(event) => setCollectionStatusFilter(event.target.value)}
                  className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  {collectionRecordStatuses.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex h-10 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={dueOnly}
                onChange={(event) => setDueOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Due only
            </label>

            <Button type="button" onClick={() => void loadPlans()} disabled={loading}>
              Apply
            </Button>
          </div>
          <div className="mt-3 grid gap-3 sm:max-w-xs">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Deadline window
              <select
                value={deadlineWindowFilter}
                onChange={(event) => setDeadlineWindowFilter(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {deadlineWindows.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={strictBestOnly}
                onChange={(event) => setStrictBestOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Strict best
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={fallbackEligibleOnly}
                onChange={(event) => setFallbackEligibleOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Fallback eligible
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={hardBlockedOnly}
                onChange={(event) => setHardBlockedOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Hard blocked
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={missingImageOnly}
                onChange={(event) => setMissingImageOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Missing image
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={missingCaptionOnly}
                onChange={(event) => setMissingCaptionOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Missing caption
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-pine/10 px-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                checked={nearDeadlineOnly}
                onChange={(event) => setNearDeadlineOnly(event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Near deadline
            </label>
          </div>
          <p className="mt-2 text-xs font-semibold text-ink/45 dark:text-white/45">
            Showing {plans.length} of {count} matching plans. These pages do not post to Facebook.
          </p>
        </section>

        <section className="grid gap-3">
          {plans.length ? (
            plans.map((plan) => (
              <PlanCard key={`${plan.type}-${plan.id}`} plan={plan} onSaveCaption={saveCaption} />
            ))
          ) : (
            <div className="rounded-xl border border-pine/10 bg-white p-4 text-sm font-semibold text-ink/55 shadow-sm dark:border-white/10 dark:bg-[#181b1d] dark:text-white/55">
              No plans match the current filters.
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export function SocialPlanReviewPage(props: SocialPlanReviewPageProps) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SocialPlanReviewContent {...props} />
    </ProtectedRoute>
  );
}
