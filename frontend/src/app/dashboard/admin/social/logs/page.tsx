"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  ArrowRight,
  ExternalLink,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminHero, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import {
  getAdminSocialLogs,
  type AdminSocialLogItem,
  type AdminSocialLogListResponse,
  type AdminSocialLogQuery,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

const typeFilters: AdminSocialLogQuery["type"][] = ["all", "opportunity", "collection"];
const statusFilters: AdminSocialLogQuery["status"][] = ["all", "posted", "skipped", "failed"];

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

function statusTone(status: string) {
  if (status === "posted") {
    return "mint" as const;
  }
  if (status === "failed") {
    return "danger" as const;
  }
  if (status === "skipped") {
    return "saffron" as const;
  }
  return "neutral" as const;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "normal",
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  tone?: "normal" | "danger";
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45 dark:text-white/45">
          {label}
        </p>
        <Icon
          size={16}
          className={tone === "danger" ? "text-red-600 dark:text-red-300" : "text-pine"}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 text-2xl font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}

function LogActions({ log }: { log: AdminSocialLogItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      {log.link_url ? (
        <a
          href={log.link_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-pine/15 bg-white px-2.5 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5"
        >
          Public link
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      ) : null}
      {log.record_admin_url ? (
        <a
          href={log.record_admin_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-pine/15 bg-white px-2.5 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5"
        >
          Record
          <ArrowRight size={12} aria-hidden="true" />
        </a>
      ) : null}
      <a
        href={log.admin_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-pine/15 bg-white px-2.5 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5"
      >
        Log
        <ArrowRight size={12} aria-hidden="true" />
      </a>
    </div>
  );
}

function SocialLogsContent() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdminSocialLogQuery["type"]>("all");
  const [statusFilter, setStatusFilter] = useState<AdminSocialLogQuery["status"]>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<AdminSocialLogListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminSocialLogs({
        type: typeFilter,
        status: statusFilter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        q: query || undefined,
        limit: 100,
      });
      setData(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Social logs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, query, statusFilter, typeFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <DashboardShell
      mode="admin"
      title="Social Logs"
      description="Read-only log view for opportunity and collection social posting activity."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Social / Marketing Center"
          title="Social Logs"
          description="Filter posted, skipped, and failed opportunity and collection social logs in one table."
          icon={MessageSquareText}
          backHref="/dashboard/admin/social"
          backLabel="Social center"
          actions={
            <Button type="button" variant="outline" onClick={() => void loadLogs()} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" />
              {loading ? "Refreshing" : "Refresh"}
            </Button>
          }
        />

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        <section className="grid gap-3 md:grid-cols-5">
          <SummaryCard label="Posted today" value={data?.summary.posted_today ?? "..."} icon={Send} />
          <SummaryCard
            label="Failed today"
            value={data?.summary.failed_today ?? "..."}
            icon={ShieldAlert}
            tone={(data?.summary.failed_today ?? 0) > 0 ? "danger" : "normal"}
          />
          <SummaryCard
            label="Skipped today"
            value={data?.summary.skipped_today ?? "..."}
            icon={Activity}
          />
          <SummaryCard
            label="Collection posts"
            value={data?.summary.collection_posts_today ?? "..."}
            icon={MessageSquareText}
          />
          <SummaryCard
            label="Opportunity posts"
            value={data?.summary.opportunity_posts_today ?? "..."}
            icon={MessageSquareText}
          />
        </section>

        <section className="rounded-xl border border-pine/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-3 lg:grid-cols-[minmax(13rem,1fr)_10rem_10rem_10rem_10rem_auto] lg:items-end">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search title
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Opportunity or collection title"
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Type
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as AdminSocialLogQuery["type"])
                }
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {typeFilters.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item || "all")}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as AdminSocialLogQuery["status"])
                }
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {statusFilters.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item || "all")}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <Button type="button" onClick={() => void loadLogs()} disabled={loading}>
              Apply
            </Button>
          </div>
          <p className="mt-2 text-xs font-semibold text-ink/45 dark:text-white/45">
            Showing {data?.items.length ?? 0} of {data?.count ?? 0} matching logs. This page is read-only.
          </p>
        </section>

        <section className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-ink/45 dark:text-white/45">
                <tr>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Facebook ID</th>
                  <th className="py-2 pr-3">Error</th>
                  <th className="py-2 pr-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.length ? (
                  data.items.map((log) => (
                    <tr key={`${log.type}-${log.id}`} className="border-t border-pine/10 dark:border-white/10">
                      <td className="py-3 pr-3 text-xs font-semibold text-ink/58 dark:text-white/55">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={log.type === "collection" ? "sky" : "mint"}>
                          {log.type}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={statusTone(log.status)}>{log.status}</Badge>
                      </td>
                      <td className="py-3 pr-3 font-bold text-ink dark:text-white">
                        {log.title}
                      </td>
                      <td className="py-3 pr-3">{log.plan_id ?? "-"}</td>
                      <td className="py-3 pr-3 break-all text-xs">{log.facebook_post_id || "-"}</td>
                      <td className="py-3 pr-3 max-w-[18rem]">
                        {log.error_message ? (
                          <span className="line-clamp-3 text-sm text-red-700 dark:text-red-300">
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-ink/35 dark:text-white/35">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <LogActions log={log} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm font-semibold text-ink/55 dark:text-white/55">
                      No social logs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function SocialLogsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SocialLogsContent />
    </ProtectedRoute>
  );
}
