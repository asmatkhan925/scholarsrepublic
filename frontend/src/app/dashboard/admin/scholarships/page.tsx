"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import { getAdminOpportunities, getAdminOverview, patchAdminOpportunity, type AdminOverviewResponse } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityListItem, OpportunityStatus } from "@/types/opportunity";

type VerifiedFilter = "all" | "verified" | "unverified";
type ManagerView = "needs_publishing" | "unverified" | "published" | "drafts" | "archived" | "all";

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Rolling or not listed";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function safeTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getStatusTone(status: OpportunityStatus): "mint" | "saffron" | "danger" | "neutral" {
  if (status === "published") {
    return "mint";
  }

  if (status === "draft") {
    return "saffron";
  }

  if (status === "archived") {
    return "danger";
  }

  return "neutral";
}

function getDeadlineTone(item: OpportunityListItem): "mint" | "saffron" | "danger" | "sky" {
  const daysUntilDeadline =
    typeof item.days_until_deadline === "number" ? item.days_until_deadline : null;

  if (item.is_rolling_deadline || daysUntilDeadline === null) {
    return "sky";
  }

  if (daysUntilDeadline < 0) {
    return "danger";
  }

  if (daysUntilDeadline <= 14) {
    return "saffron";
  }

  return "mint";
}

function getDeadlineLabel(item: OpportunityListItem) {
  const daysUntilDeadline =
    typeof item.days_until_deadline === "number" ? item.days_until_deadline : null;

  if (item.is_rolling_deadline || daysUntilDeadline === null) {
    return "Rolling";
  }

  if (daysUntilDeadline < 0) {
    return "Expired";
  }

  return `${daysUntilDeadline} days left`;
}

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

function getManagerView(
  statusFilter: "all" | OpportunityStatus,
  verifiedFilter: VerifiedFilter,
): ManagerView {
  if (statusFilter === "draft" && verifiedFilter === "unverified") {
    return "needs_publishing";
  }

  if (statusFilter === "all" && verifiedFilter === "unverified") {
    return "unverified";
  }

  if (statusFilter === "published" && verifiedFilter === "all") {
    return "published";
  }

  if (statusFilter === "draft" && verifiedFilter === "all") {
    return "drafts";
  }

  if (statusFilter === "archived" && verifiedFilter === "all") {
    return "archived";
  }

  if (statusFilter === "all" && verifiedFilter === "all") {
    return "all";
  }

  return "all";
}

function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
        active
          ? "border-pine bg-pine text-white shadow-sm"
          : "border-pine/15 bg-white text-pine hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      }`}
    >
      {label}
      {count !== undefined ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
            active ? "bg-white/20 text-white" : "bg-pine/10 text-pine"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function AdminScholarshipCard({
  item,
  updatingId,
  onPatch,
}: {
  item: OpportunityListItem;
  updatingId: number | null;
  onPatch: (id: number, payload: Partial<OpportunityListItem>) => Promise<void>;
}) {
  const provider =
    item.provider_name || item.university_name || item.company_name || "Provider not listed";
  const updating = updatingId === item.id;
  const degreeTags = safeTextList(item.degree_levels).slice(0, 2);
  const fieldTags = safeTextList(item.fields_of_study).slice(0, 2);

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={getStatusTone(item.status)}>{humanize(item.status)}</Badge>
              <Badge tone={getDeadlineTone(item)}>{getDeadlineLabel(item)}</Badge>
              {item.verified_status ? <Badge tone="mint">Verified</Badge> : <Badge tone="saffron">Needs verify</Badge>}
              {item.featured ? <Badge tone="sky">Featured</Badge> : null}
            </div>

            <h2 className="mt-2 text-lg font-bold leading-snug text-ink dark:text-white md:text-xl">
              {item.title}
            </h2>

            <p className="mt-1.5 text-sm leading-5 text-ink/62 dark:text-white/58">
              {provider} · {item.country || "Country not listed"}
            </p>

            {item.short_description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/62 dark:text-white/56">
                {item.short_description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{humanize(item.funding_type)}</Badge>
              {degreeTags.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {fieldTags.map((field) => (
                <Badge key={field} tone="sky">
                  {field}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink/50 dark:text-white/45">
              <span className="rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                Deadline: {formatDate(item.deadline)}
              </span>
              <span className="rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                Updated: {formatDate(item.updated_at)}
              </span>
            </div>
          </div>

          <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                {item.status === "published" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updating}
                    onClick={() => void onPatch(item.id, { status: "draft" })}
                  >
                    <FileText size={14} aria-hidden="true" />
                    Draft
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={updating}
                    onClick={() =>
                      void onPatch(item.id, {
                        status: "published",
                        verified_status: true,
                      })
                    }
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {item.verified_status ? "Publish" : "Verify & publish"}
                  </Button>
                )}

                {item.status === "archived" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updating}
                    onClick={() => void onPatch(item.id, { status: "draft" })}
                  >
                    <FileText size={14} aria-hidden="true" />
                    Restore
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updating}
                    onClick={() => void onPatch(item.id, { status: "archived" })}
                  >
                    <Archive size={14} aria-hidden="true" />
                    Archive
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={() => void onPatch(item.id, { verified_status: !item.verified_status })}
                >
                  {item.verified_status ? (
                    <XCircle size={14} aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={14} aria-hidden="true" />
                  )}
                  {item.verified_status ? "Unverify" : "Verify"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={() => void onPatch(item.id, { featured: !item.featured })}
                >
                  <Star size={14} aria-hidden="true" />
                  {item.featured ? "Unfeature" : "Feature"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {item.status === "published" ? (
                  <ButtonLink href={`/scholarships/${item.slug}`} size="sm" variant="outline">
                    <Eye size={14} aria-hidden="true" />
                    Preview
                  </ButtonLink>
                ) : (
                  <span className="inline-flex h-9 items-center justify-center rounded-xl border border-pine/10 bg-[#f7faf8] text-xs font-bold text-ink/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
                    No public preview
                  </span>
                )}

                <Link
                  href={`/dashboard/admin/scholarships/${item.id}/edit`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <Edit3 size={14} aria-hidden="true" />
                  Edit
                </Link>
              </div>

              {item.status !== "published" && !item.verified_status ? (
                <p className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-ink/65 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/60">
                  Publishing will also mark this scholarship verified.
                </p>
              ) : null}

              {updating ? (
                <p className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine/5 px-3 py-2 text-xs font-bold text-pine">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Updating...
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminScholarshipManagerContent() {
  const [items, setItems] = useState<OpportunityListItem[]>([]);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OpportunityStatus>("draft");
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("unverified");

  const activeManagerView = getManagerView(statusFilter, verifiedFilter);

  function applyManagerView(view: ManagerView) {
    if (view === "needs_publishing") {
      setStatusFilter("draft");
      setVerifiedFilter("unverified");
      return;
    }

    if (view === "unverified") {
      setStatusFilter("all");
      setVerifiedFilter("unverified");
      return;
    }

    if (view === "published") {
      setStatusFilter("published");
      setVerifiedFilter("all");
      return;
    }

    if (view === "drafts") {
      setStatusFilter("draft");
      setVerifiedFilter("all");
      return;
    }

    if (view === "archived") {
      setStatusFilter("archived");
      setVerifiedFilter("all");
      return;
    }

    setStatusFilter("all");
    setVerifiedFilter("all");
  }

  async function loadOverview() {
    try {
      setOverview(await getAdminOverview());
    } catch {
      // Keep the manager usable even if overview stats fail.
    }
  }

  async function loadItems() {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminOpportunities({
        opportunity_type: "scholarship",
        page_size: 100,
        ordering: "-updated_at",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(verifiedFilter === "verified" ? { verified: true } : {}),
        ...(verifiedFilter === "unverified" ? { verified: false } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      setItems(response.results);
      await loadOverview();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, verifiedFilter]);

  async function handlePatch(id: number, payload: Partial<OpportunityListItem>) {
    setUpdatingId(id);
    setError(null);

    try {
      const updated = await patchAdminOpportunity(id, payload);
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: updated.status,
                featured: updated.featured,
                verified_status: updated.verified_status,
                updated_at: updated.updated_at,
              }
            : item,
        ),
      );
      await loadOverview();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Scholarship Manager"
      description="Manage imported scholarship records that need publishing, verification, editing, or archiving."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="px-4 py-4 md:px-5">
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to admin workbench
              </Link>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Scholarship manager
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Default view shows draft + unverified scholarships that need admin action.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/admin/scholarships/import"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  Import with GPT
                  <ExternalLink size={15} aria-hidden="true" />
                </Link>

                <a
                  href="/dashboard/admin/scholarships/drafts"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Review drafts
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-1.5">
                <MiniStat label="Total" value={overview?.scholarships.total ?? "..."} />
                <MiniStat label="Published" value={overview?.scholarships.published ?? "..."} />
                <MiniStat
                  label="Draft"
                  value={overview?.scholarships.draft ?? "..."}
                  tone={(overview?.scholarships.draft ?? 0) > 0 ? "warning" : "normal"}
                />
                <MiniStat
                  label="Unverified"
                  value={overview?.scholarships.unverified ?? "..."}
                  tone={(overview?.scholarships.unverified ?? 0) > 0 ? "warning" : "normal"}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-pine/10 bg-mint/25 px-3 py-2 text-sm font-semibold leading-6 text-pine dark:border-white/10 dark:bg-pine/10">
            Scholarship Manager shows real scholarship records only. Review Queue keeps imported items until they pass validation and become real scholarship drafts.
          </div>

          <div className="border-t border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Needs publishing"
                active={activeManagerView === "needs_publishing"}
                onClick={() => applyManagerView("needs_publishing")}
              />
              <FilterChip
                label="Unverified"
                active={activeManagerView === "unverified"}
                onClick={() => applyManagerView("unverified")}
                count={overview?.scholarships.unverified}
              />
              <FilterChip
                label="Published"
                active={activeManagerView === "published"}
                onClick={() => applyManagerView("published")}
                count={overview?.scholarships.published}
              />
              <FilterChip
                label="Drafts"
                active={activeManagerView === "drafts"}
                onClick={() => applyManagerView("drafts")}
                count={overview?.scholarships.draft}
              />
              <FilterChip
                label="Archived"
                active={activeManagerView === "archived"}
                onClick={() => applyManagerView("archived")}
                count={overview?.scholarships.archived}
              />
              <FilterChip
                label="All"
                active={activeManagerView === "all"}
                onClick={() => applyManagerView("all")}
                count={overview?.scholarships.total}
              />
            </div>
          </div>

          <div className="grid gap-2 border-t border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_12rem_12rem_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/35"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void loadItems();
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  placeholder="Title, provider, country, field..."
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | OpportunityStatus)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Verified
              <select
                value={verifiedFilter}
                onChange={(event) => setVerifiedFilter(event.target.value as VerifiedFilter)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void loadItems()}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <RefreshCw size={15} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-ink/70 dark:text-white/60">
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Loading scholarships...
            </CardContent>
          </Card>
        ) : null}

        {!loading && items.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/dashboard/admin">
                Back to Workbench
                <ArrowLeft size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description="No scholarships matched the selected search and filters."
            icon={<Search size={22} aria-hidden="true" />}
            title="No scholarships found"
          />
        ) : null}

        {!loading && items.length > 0 ? (
          <section className="grid gap-3">
            {items.map((item) => (
              <AdminScholarshipCard
                key={item.id}
                item={item}
                updatingId={updatingId}
                onPatch={handlePatch}
              />
            ))}
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminScholarshipManagerPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminScholarshipManagerContent />
    </ProtectedRoute>
  );
}
