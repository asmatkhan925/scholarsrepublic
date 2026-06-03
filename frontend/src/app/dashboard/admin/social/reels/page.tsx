"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Check, Clipboard, Film, Play, RefreshCw, Save, Sparkles } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminHero, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import {
  type AdminSocialReelPlan,
  type AdminSocialReelGeneratePreview,
  type AdminSocialReelPlanPayload,
  createAdminSocialReelPlan,
  generateAdminSocialReelPlans,
  getAdminSocialReelPlans,
  renderAdminSocialReelPlan,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

const reelTypes = ["closing_soon", "prepare_early", "single_scholarship", "collection"] as const;
const statuses = [
  "all",
  "draft",
  "ready_for_render",
  "rendering",
  "rendered",
  "ready",
  "failed",
  "paused",
  "archived",
];

const defaultScenes = JSON.stringify(
  [
    {
      label: "Scholarship alert",
      title: "New scholarship opportunity",
      body: "Use verified details only. Add provider, country, funding, or deadline here.",
      duration: 4,
    },
    {
      label: "Deadline",
      title: "Check the official deadline",
      body: "Apply early and verify all requirements from the official source.",
      duration: 5,
    },
    {
      label: "Scholars Republic",
      title: "Follow for verified scholarship alerts",
      body: "Review details on Scholars Republic before applying.",
      duration: 4,
    },
  ],
  null,
  2,
);

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function audioLabel(plan: AdminSocialReelPlan) {
  if (plan.audio_status === "enabled") {
    return "audio enabled";
  }
  if (plan.audio_status === "missing_file") {
    return "music missing";
  }
  if (plan.audio_status === "mix_failed_fallback") {
    return "mix failed fallback";
  }
  return "silent";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function reelJson(plan: AdminSocialReelPlan) {
  return JSON.stringify(
    {
      title: plan.title,
      reel_type: plan.reel_type,
      template_key: plan.template_key,
      scenes_json: plan.scenes_json,
      caption_text: plan.caption_text,
      hashtags: plan.hashtags,
      source_opportunities: plan.source_opportunities,
      source_collection_id: plan.source_collection_id,
      source_collection_title: plan.source_collection_title,
      deadline_window: plan.deadline_window,
    },
    null,
    2,
  );
}

function gptPrompt(plan: AdminSocialReelPlan) {
  return `Create a short Facebook Reel script for Scholars Republic using only this JSON.

Rules:
- Use only the supplied JSON.
- Do not invent scholarship facts, deadlines, provider names, eligibility, or funding.
- Do not use Canva, Creatomate, Facebook posting, paid APIs, fake logos, official seals, or copyrighted logos.
- Keep scenes readable on mobile.
- Return up to 5 very short scenes, plus caption text, hashtags, and optional voiceover text.
- Do not write paragraph text for reel scenes.
- Keep the local render duration within the expected_duration_seconds value.

JSON:
${reelJson(plan)}`;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void copyValue()}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function parseIds(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function ReelPlanCard({
  plan,
  onRendered,
}: {
  plan: AdminSocialReelPlan;
  onRendered: (plan: AdminSocialReelPlan) => void;
}) {
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  async function renderPlan(force = false) {
    setRendering(true);
    setError("");
    try {
      const response = await renderAdminSocialReelPlan(plan.id, { force });
      onRendered(response.plan);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Render failed.");
    } finally {
      setRendering(false);
    }
  }

  return (
    <article className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="mint">#{plan.id}</Badge>
            <Badge tone="neutral">{formatLabel(plan.status)}</Badge>
            <Badge tone="sky">{formatLabel(plan.reel_type)}</Badge>
            <Badge tone="pine">{plan.template_key}</Badge>
            {plan.template_key.includes("premium_v3") ? (
              <Badge tone="saffron">premium v3 text-first</Badge>
            ) : null}
            <Badge tone="mint">Expected {plan.expected_duration_seconds ?? "-"}s</Badge>
            <Badge tone={plan.audio_status === "enabled" ? "saffron" : "neutral"}>
              {audioLabel(plan)}
            </Badge>
            {plan.deadline_window ? <Badge tone="saffron">{plan.deadline_window}</Badge> : null}
          </div>
          <h2 className="mt-2 text-base font-bold text-ink dark:text-white">{plan.title}</h2>
          <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
            Scenes {plan.scenes_json.length} | Priority {plan.priority_score} | Music{" "}
            {plan.music_configured ? plan.audio_path : "silent"} | Next post{" "}
            {formatDateTime(plan.next_post_at)}
          </p>
          {plan.music_license_metadata?.source_name || plan.music_license_metadata?.license_note ? (
            <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
              Music license: {plan.music_license_metadata.source_name || "source saved"} |{" "}
              {plan.music_license_metadata.license_note || "license metadata saved"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={gptPrompt(plan)} label="Copy GPT prompt" />
          <CopyButton value={reelJson(plan)} label="Copy JSON" />
          <Button type="button" size="sm" onClick={() => void renderPlan(false)} disabled={rendering}>
            <Play size={14} aria-hidden="true" />
            {rendering ? "Rendering" : "Render"}
          </Button>
          {plan.video_url ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void renderPlan(true)}
              disabled={rendering}
            >
              Force render
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">Scenes</p>
            <pre className="mt-1 max-h-56 overflow-auto rounded-xl border border-pine/10 bg-[#f7faf8] p-3 text-xs leading-5 text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
              {JSON.stringify(plan.scenes_json, null, 2)}
            </pre>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">Caption</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl border border-pine/10 bg-[#f7faf8] p-3 text-sm leading-6 text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
                {plan.caption_text || "No caption saved."}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">
                Source scholarships
              </p>
              <div className="mt-1 rounded-xl border border-pine/10 bg-[#f7faf8] p-3 text-sm leading-6 text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
                {plan.source_opportunities.length ? (
                  plan.source_opportunities.map((item) => (
                    <p key={item.id}>
                      #{item.id} {item.short_title || item.title} |{" "}
                      {item.deadline_window_label || item.deadline_window || "-"} | days{" "}
                      {item.days_until_deadline ?? "-"}
                    </p>
                  ))
                ) : (
                  <p>No source scholarships attached.</p>
                )}
              </div>
            </div>
          </div>
          {plan.render_error ? (
            <AdminNotice tone="danger">{plan.render_error}</AdminNotice>
          ) : error ? (
            <AdminNotice tone="danger">{error}</AdminNotice>
          ) : plan.audio_error ? (
            <AdminNotice tone="warning">{plan.audio_error}</AdminNotice>
          ) : null}
        </div>

        <div>
          {plan.video_url ? (
            <video
              src={plan.video_url}
              controls
              className="aspect-[9/16] w-full rounded-xl border border-pine/10 bg-black object-contain dark:border-white/10"
            />
          ) : (
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-dashed border-pine/20 bg-[#f7faf8] text-sm font-semibold text-ink/45 dark:border-white/10 dark:bg-white/5 dark:text-white/45">
              No rendered video
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CreateReelForm({ onCreated }: { onCreated: (plan: AdminSocialReelPlan) => void }) {
  const [title, setTitle] = useState("");
  const [reelType, setReelType] = useState<AdminSocialReelPlanPayload["reel_type"]>(
    "single_scholarship",
  );
  const [sourceIds, setSourceIds] = useState("");
  const [scenesText, setScenesText] = useState(defaultScenes);
  const [captionText, setCaptionText] = useState("");
  const [hashtags, setHashtags] = useState("#Scholarships #ScholarsRepublic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createPlan() {
    setSaving(true);
    setError("");
    try {
      const scenes = JSON.parse(scenesText) as AdminSocialReelPlanPayload["scenes_json"];
      if (!Array.isArray(scenes)) {
        throw new Error("Scenes JSON must be an array.");
      }
      const plan = await createAdminSocialReelPlan({
        title,
        reel_type: reelType,
        status: "ready_for_render",
        scenes_json: scenes,
        caption_text: captionText,
        hashtags,
        source_opportunity_ids: parseIds(sourceIds),
      });
      onCreated(plan);
      setTitle("");
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Reel plan could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]">
        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
            placeholder="Scholarship reel title"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Type
          <select
            value={reelType}
            onChange={(event) =>
              setReelType(event.target.value as AdminSocialReelPlanPayload["reel_type"])
            }
            className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
          >
            {reelTypes.map((item) => (
              <option key={item} value={item}>
                {formatLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Scholarship IDs
          <input
            value={sourceIds}
            onChange={(event) => setSourceIds(event.target.value)}
            className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
            placeholder="12, 34, 56"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Scenes JSON
          <textarea
            value={scenesText}
            onChange={(event) => setScenesText(event.target.value)}
            rows={12}
            className="rounded-xl border border-pine/15 bg-[#f7faf8] px-3 py-2 text-sm leading-6 outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
          />
        </label>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
            Caption
            <textarea
              value={captionText}
              onChange={(event) => setCaptionText(event.target.value)}
              rows={7}
              className="rounded-xl border border-pine/15 bg-[#f7faf8] px-3 py-2 text-sm leading-6 outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
              placeholder="Facebook caption for later manual review."
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
            Hashtags
            <input
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
            />
          </label>
          <Button type="button" onClick={() => void createPlan()} disabled={saving || !title.trim()}>
            <Save size={15} aria-hidden="true" />
            {saving ? "Creating" : "Create reel plan"}
          </Button>
          {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
        </div>
      </div>
    </section>
  );
}

function ReelsContent() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [plans, setPlans] = useState<AdminSocialReelPlan[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generationResult, setGenerationResult] = useState<AdminSocialReelGeneratePreview[]>([]);
  const [skippedReasons, setSkippedReasons] = useState<string[]>([]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminSocialReelPlans({
        q: query || undefined,
        status: statusFilter,
        reel_type: typeFilter,
        limit: 75,
      });
      setPlans(response.items);
      setCount(response.count);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Reel plans could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, typeFilter]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const allJson = useMemo(() => JSON.stringify(plans.map((plan) => JSON.parse(reelJson(plan))), null, 2), [plans]);

  async function generatePlans(
    reelType: "auto" | AdminSocialReelPlanPayload["reel_type"],
    options?: { dryRun?: boolean; render?: boolean },
  ) {
    setGenerating(true);
    setError("");
    try {
      const response = await generateAdminSocialReelPlans({
        reel_type: reelType,
        limit: 1,
        dry_run: options?.dryRun,
        render: options?.render,
      });
      setGenerationResult(response.plans);
      setSkippedReasons(response.skipped_reasons);
      if (!options?.dryRun) {
        await loadPlans();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Auto reel generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Social Reels"
      description="Create and render local Scholars Republic MP4 reels without paid design or AI APIs."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Social / Reels"
          title="Social Reels"
          description="Manual reel plans, GPT prompt copy, local MP4 rendering, and preview. Nothing is posted automatically."
          icon={Film}
          backHref="/dashboard/admin/social"
          backLabel="Social center"
          actions={
            <>
              <Button
                type="button"
                onClick={() => void generatePlans("auto")}
                disabled={generating}
              >
                <Sparkles size={15} aria-hidden="true" />
                Generate Auto Reel Plan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void generatePlans("auto", { dryRun: true })}
                disabled={generating}
              >
                Dry Run Selection
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void generatePlans("auto", { render: true })}
                disabled={generating}
              >
                Generate + Render
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadPlans()} disabled={loading}>
                <RefreshCw size={15} aria-hidden="true" />
                {loading ? "Refreshing" : "Refresh"}
              </Button>
              <CopyButton value={allJson} label="Copy visible JSON" />
            </>
          }
        />

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
        <AdminNotice>
          Default automatic reels use premium v3 text-first templates for mobile readability.
          Successful local renders become ready automatically. Source images are not embedded as
          poster previews.
        </AdminNotice>

        <section className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void generatePlans("closing_soon")}
              disabled={generating}
            >
              Generate Closing Soon Reel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void generatePlans("prepare_early")}
              disabled={generating}
            >
              Generate Prepare Early Reel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void generatePlans("single_scholarship")}
              disabled={generating}
            >
              Generate Single Reel
            </Button>
          </div>

          {skippedReasons.length ? (
            <AdminNotice tone="warning">
              Skipped: {skippedReasons.map((item) => formatLabel(item)).join(", ")}
            </AdminNotice>
          ) : null}

          {generationResult.length ? (
            <div className="mt-3 grid gap-3">
              {generationResult.map((result, index) => (
                <article
                  key={`${result.reel_type}-${result.id ?? index}`}
                  className="rounded-xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="sky">{result.reel_type ? formatLabel(result.reel_type) : "preview"}</Badge>
                    {result.template_key ? <Badge tone="pine">{result.template_key}</Badge> : null}
                    <Badge tone="neutral">{result.status}</Badge>
                    <Badge tone="mint">Expected {result.expected_duration_seconds ?? "-"}s</Badge>
                    {result.skip_reason ? <Badge tone="danger">{formatLabel(result.skip_reason)}</Badge> : null}
                  </div>
                  <h2 className="mt-2 text-base font-bold text-ink dark:text-white">{result.title}</h2>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {result.source_opportunities.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-pine/10 bg-white p-2 text-xs leading-5 text-ink/65 dark:border-white/10 dark:bg-[#101214] dark:text-white/65"
                      >
                        <p className="font-bold text-ink dark:text-white">
                          #{item.id} {item.short_title || item.title}
                        </p>
                        <p>{item.country || "No country"} | {item.degree || "Degree"}</p>
                        <p>
                          {item.deadline_window_label || item.deadline_window || "-"} | days{" "}
                          {item.days_until_deadline ?? "-"}
                        </p>
                        <p>Score {item.priority_score ?? "-"}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <CreateReelForm
          onCreated={(plan) => {
            setPlans((current) => [plan, ...current]);
            setCount((current) => current + 1);
          }}
        />

        <section className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem_auto] lg:items-end">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
                placeholder="Title, caption, error, hashtag"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm outline-none focus:border-pine dark:border-white/10 dark:bg-white/5"
              >
                {["all", ...reelTypes].map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" onClick={() => void loadPlans()} disabled={loading}>
              Apply
            </Button>
          </div>
          <p className="mt-2 text-xs font-semibold text-ink/45 dark:text-white/45">
            Showing {plans.length} of {count}. No Facebook posting controls are exposed here.
          </p>
        </section>

        <section className="grid gap-3">
          {plans.length ? (
            plans.map((plan) => (
              <ReelPlanCard
                key={plan.id}
                plan={plan}
                onRendered={(updated) =>
                  setPlans((current) => current.map((item) => (item.id === updated.id ? updated : item)))
                }
              />
            ))
          ) : (
            <div className="rounded-xl border border-pine/10 bg-white p-4 text-sm font-semibold text-ink/55 shadow-sm dark:border-white/10 dark:bg-[#181b1d] dark:text-white/55">
              No reel plans match the current filters.
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export default function SocialReelsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <ReelsContent />
    </ProtectedRoute>
  );
}
