"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  AdminFilterButton,
  AdminHero,
  AdminLoading,
  AdminMetric,
  AdminNotice,
} from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  getAdminOpportunityPathways,
  getAdminOpportunities,
  getAdminOverview,
  patchAdminOpportunity,
  type AdminOverviewResponse,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  OpportunityListItem,
  OpportunityPathwayDetail,
  OpportunityStatus,
} from "@/types/opportunity";

type VerifiedFilter = "all" | "verified" | "unverified";
type DeadlineFilter = "all" | "expiring" | "expired" | "rolling";
type ManagerView = "needs_publishing" | "unverified" | "published" | "drafts" | "archived" | "all";
type PathwayFilter = "all" | "missing" | string;

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
              {item.verified_status ? (
                <Badge tone="mint">Verified</Badge>
              ) : (
                <Badge tone="saffron">Needs verify</Badge>
              )}
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
              {item.pathway_detail ? (
                <Badge tone="sky">{item.pathway_detail.full_path}</Badge>
              ) : (
                <Badge tone="saffron">No pathway</Badge>
              )}
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

function AdminScholarshipTableRow({
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

  return (
    <tr className="border-t border-pine/10 align-top transition hover:bg-mint/20 dark:border-white/10 dark:hover:bg-white/5">
      <td className="min-w-[22rem] px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={getStatusTone(item.status)}>{humanize(item.status)}</Badge>
          <Badge tone={getDeadlineTone(item)}>{getDeadlineLabel(item)}</Badge>
          {item.verified_status ? (
            <Badge tone="mint">Verified</Badge>
          ) : (
            <Badge tone="saffron">Needs verify</Badge>
          )}
          {item.featured ? <Badge tone="sky">Featured</Badge> : null}
        </div>
        <Link
          href={`/dashboard/admin/scholarships/${item.id}/edit`}
          className="mt-2 block text-sm font-black leading-snug text-ink transition hover:text-pine dark:text-white"
        >
          {item.title}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-ink/55 dark:text-white/50">
          {provider} · {item.country || "Country not listed"}
        </p>
      </td>
      <td className="px-3 py-3 text-sm text-ink/70 dark:text-white/60">
        <span className="font-semibold text-ink dark:text-white">{formatDate(item.deadline)}</span>
        <span className="mt-1 block text-xs text-ink/45 dark:text-white/40">
          Updated {formatDate(item.updated_at)}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="neutral">{humanize(item.funding_type)}</Badge>
          {item.pathway_detail ? (
            <Badge tone="sky">{item.pathway_detail.title}</Badge>
          ) : (
            <Badge tone="saffron">No pathway</Badge>
          )}
          {safeTextList(item.degree_levels)
            .slice(0, 2)
            .map((degree) => (
              <Badge key={degree} tone="neutral">
                {degree}
              </Badge>
            ))}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex min-w-[18rem] flex-wrap gap-1.5">
          {item.status === "published" ? (
            <Button
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
              size="sm"
              variant="primary"
              disabled={updating}
              onClick={() => void onPatch(item.id, { status: "published", verified_status: true })}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Publish
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={updating}
            onClick={() => void onPatch(item.id, { verified_status: !item.verified_status })}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            {item.verified_status ? "Unverify" : "Verify"}
          </Button>
          <Link
            href={`/dashboard/admin/scholarships/${item.id}/edit`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-sm font-semibold text-pine shadow-sm transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <Edit3 size={14} aria-hidden="true" />
            Edit
          </Link>
          {item.status === "published" ? (
            <ButtonLink href={`/scholarships/${item.slug}`} size="sm" variant="outline">
              <Eye size={14} aria-hidden="true" />
              Preview
            </ButtonLink>
          ) : null}
          {updating ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-pine/5 px-3 text-xs font-bold text-pine">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Updating
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function AdminScholarshipManagerContent() {
  const [items, setItems] = useState<OpportunityListItem[]>([]);
  const [pathways, setPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OpportunityStatus>("draft");
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("unverified");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");
  const [pathwayFilter, setPathwayFilter] = useState<PathwayFilter>("all");
  const [pathwayTypeFilter, setPathwayTypeFilter] = useState("all");
  const [ordering, setOrdering] = useState("-updated_at");

  const activeManagerView = getManagerView(statusFilter, verifiedFilter);
  const visibleItems = useMemo(() => {
    if (deadlineFilter === "all") {
      return items;
    }

    return items.filter((item) => {
      const daysUntilDeadline =
        typeof item.days_until_deadline === "number" ? item.days_until_deadline : null;

      if (deadlineFilter === "rolling") {
        return item.is_rolling_deadline || daysUntilDeadline === null;
      }

      if (deadlineFilter === "expired") {
        return daysUntilDeadline !== null && daysUntilDeadline < 0;
      }

      return daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 30;
    });
  }, [deadlineFilter, items]);

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

  async function loadPathways() {
    try {
      const response = await getAdminOpportunityPathways({
        active: true,
        page_size: 300,
      });
      setPathways(response.results);
    } catch {
      setPathways([]);
    }
  }

  async function loadItems() {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminOpportunities({
        opportunity_type: "scholarship",
        page_size: 100,
        ordering,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(verifiedFilter === "verified" ? { verified: true } : {}),
        ...(verifiedFilter === "unverified" ? { verified: false } : {}),
        ...(pathwayFilter !== "all" && pathwayFilter !== "missing"
          ? { pathway: pathwayFilter }
          : {}),
        ...(pathwayFilter === "missing" ? { missing_pathway: true } : {}),
        ...(pathwayTypeFilter !== "all" ? { pathway_type: pathwayTypeFilter } : {}),
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
  }, [statusFilter, verifiedFilter, pathwayFilter, pathwayTypeFilter, ordering]);

  useEffect(() => {
    void loadPathways();
  }, []);

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
        <AdminHero
          eyebrow="Scholarship operations"
          title="Scholarship manager"
          description="Default view shows draft and unverified scholarships that need admin action."
          backHref="/dashboard/admin"
          backLabel="Back to admin workbench"
          icon={GraduationCap}
          actions={
            <>
              <ButtonLink href="/dashboard/admin/scholarships/import" size="sm">
                Import with GPT
                <ExternalLink size={15} aria-hidden="true" />
              </ButtonLink>

              <ButtonLink href="/dashboard/admin/scholarships/drafts" size="sm" variant="outline">
                Review drafts
                <ExternalLink size={15} aria-hidden="true" />
              </ButtonLink>

              <ButtonLink
                href="/dashboard/admin/scholarships/pathways"
                size="sm"
                variant="outline"
              >
                Manage pathways
                <ExternalLink size={15} aria-hidden="true" />
              </ButtonLink>
            </>
          }
          metrics={
            <>
              <AdminMetric label="Total" value={overview?.scholarships.total ?? "..."} />
              <AdminMetric
                label="Published"
                value={overview?.scholarships.published ?? "..."}
                tone="success"
              />
              <AdminMetric
                label="Draft"
                value={overview?.scholarships.draft ?? "..."}
                tone={(overview?.scholarships.draft ?? 0) > 0 ? "warning" : "normal"}
              />
              <AdminMetric
                label="Unverified"
                value={overview?.scholarships.unverified ?? "..."}
                tone={(overview?.scholarships.unverified ?? 0) > 0 ? "warning" : "normal"}
              />
            </>
          }
        />

        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="border-t border-pine/10 bg-mint/25 px-3 py-2 text-sm font-semibold leading-6 text-pine dark:border-white/10 dark:bg-pine/10">
            Scholarship Manager shows real scholarship records only. Review Queue keeps imported
            items until they pass validation and become real scholarship drafts.
          </div>

          <div className="border-t border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap gap-2">
              <AdminFilterButton
                label="Needs publishing"
                active={activeManagerView === "needs_publishing"}
                onClick={() => applyManagerView("needs_publishing")}
              />
              <AdminFilterButton
                label="Unverified"
                active={activeManagerView === "unverified"}
                onClick={() => applyManagerView("unverified")}
                count={overview?.scholarships.unverified}
              />
              <AdminFilterButton
                label="Published"
                active={activeManagerView === "published"}
                onClick={() => applyManagerView("published")}
                count={overview?.scholarships.published}
              />
              <AdminFilterButton
                label="Drafts"
                active={activeManagerView === "drafts"}
                onClick={() => applyManagerView("drafts")}
                count={overview?.scholarships.draft}
              />
              <AdminFilterButton
                label="Archived"
                active={activeManagerView === "archived"}
                onClick={() => applyManagerView("archived")}
                count={overview?.scholarships.archived}
              />
              <AdminFilterButton
                label="All"
                active={activeManagerView === "all"}
                onClick={() => applyManagerView("all")}
                count={overview?.scholarships.total}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white md:col-span-2">
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
                  className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  placeholder="Title, provider, country, field..."
                />
              </div>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | OpportunityStatus)
                }
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Verified
              <select
                value={verifiedFilter}
                onChange={(event) => setVerifiedFilter(event.target.value as VerifiedFilter)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Deadline
              <select
                value={deadlineFilter}
                onChange={(event) => setDeadlineFilter(event.target.value as DeadlineFilter)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All deadlines</option>
                <option value="expiring">Next 30 days</option>
                <option value="expired">Expired</option>
                <option value="rolling">Rolling/unknown</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white md:col-span-2">
              Pathway
              <select
                value={pathwayFilter}
                onChange={(event) => setPathwayFilter(event.target.value)}
                className="h-10 w-full min-w-0 truncate rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All pathways</option>
                <option value="missing">No pathway assigned</option>
                {pathways.map((pathway) => (
                  <option key={pathway.id} value={pathway.slug}>
                    {pathway.full_path}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Pathway type
              <select
                value={pathwayTypeFilter}
                onChange={(event) => setPathwayTypeFilter(event.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All types</option>
                {Array.from(new Set(pathways.map((pathway) => pathway.pathway_type))).map(
                  (type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Sort
              <select
                value={ordering}
                onChange={(event) => setOrdering(event.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="-updated_at">Recently updated</option>
                <option value="deadline">Deadline soonest</option>
                <option value="-published_at">Recently published</option>
                <option value="title">Title A-Z</option>
              </select>
            </label>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row md:col-span-2 xl:col-span-4">
              <Button
                type="button"
                onClick={() => void loadItems()}
                className="w-full sm:w-auto"
                size="sm"
                variant="outline"
              >
                <RefreshCw size={15} aria-hidden="true" />
                Refresh
              </Button>
              {pathwayFilter !== "all" || pathwayTypeFilter !== "all" ? (
                <Button
                  type="button"
                  onClick={() => {
                    setPathwayFilter("all");
                    setPathwayTypeFilter("all");
                  }}
                  className="w-full sm:w-auto"
                  size="sm"
                  variant="ghost"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        {loading ? <AdminLoading label="Loading scholarships..." /> : null}

        {!loading && visibleItems.length === 0 ? (
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

        {!loading && visibleItems.length > 0 ? (
          <section className="grid gap-3">
            <div className="hidden overflow-hidden rounded-[1.25rem] border border-pine/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#181b1d] lg:block">
              <div className="flex items-center justify-between border-b border-pine/10 px-3 py-2 dark:border-white/10">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
                  <CalendarClock size={16} className="text-pine" aria-hidden="true" />
                  Showing {visibleItems.length} scholarship{visibleItems.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs font-semibold text-ink/45 dark:text-white/45">
                  Quick actions update status immediately.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[58rem] text-left">
                  <thead className="bg-[#f7faf8] text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45 dark:bg-white/5 dark:text-white/40">
                    <tr>
                      <th className="px-3 py-2">Scholarship</th>
                      <th className="px-3 py-2">Deadline</th>
                      <th className="px-3 py-2">Funding</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <AdminScholarshipTableRow
                        key={item.id}
                        item={item}
                        updatingId={updatingId}
                        onPatch={handlePatch}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 lg:hidden">
              {visibleItems.map((item) => (
                <AdminScholarshipCard
                  key={item.id}
                  item={item}
                  updatingId={updatingId}
                  onPatch={handlePatch}
                />
              ))}
            </div>
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
