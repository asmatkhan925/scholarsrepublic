"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList, Search, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminApplication, getAdminApplications } from "@/lib/api/admin/users";
import {
  AdminHero,
  AdminMetric,
  AdminLoading,
} from "@/components/admin/AdminUI";

const PAGE_SIZE = 50;

const STATUS_CHOICES = [
  "preparing",
  "documents_pending",
  "documents_ready",
  "applied",
  "interview",
  "result_waiting",
  "selected",
  "rejected",
  "withdrawn",
  "deferred",
];

const STATUS_LABELS: Record<string, string> = {
  preparing: "Preparing",
  documents_pending: "Docs Pending",
  documents_ready: "Docs Ready",
  applied: "Applied",
  interview: "Interview",
  result_waiting: "Awaiting",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  deferred: "Deferred",
};

function statusBadge(s: string) {
  const positive = ["selected"];
  const negative = ["rejected", "withdrawn"];
  const active = ["interview", "result_waiting", "applied"];
  const base = "rounded-full px-2 py-0.5 text-xs font-medium";
  if (positive.includes(s))
    return (
      <span className={`${base} bg-pine/10 text-pine`}>
        {STATUS_LABELS[s] ?? s}
      </span>
    );
  if (negative.includes(s))
    return (
      <span className={`${base} bg-red-50 text-red-400`}>
        {STATUS_LABELS[s] ?? s}
      </span>
    );
  if (active.includes(s))
    return (
      <span className={`${base} bg-saffron/15 text-saffron-dark`}>
        {STATUS_LABELS[s] ?? s}
      </span>
    );
  return (
    <span className={`${base} bg-pine/5 text-pine/60`}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

function priorityBadge(p: string) {
  if (p === "high")
    return <span className="text-xs font-medium text-red-400">High</span>;
  if (p === "medium")
    return (
      <span className="text-xs font-medium text-saffron-dark">Med</span>
    );
  return <span className="text-xs text-pine/40">Low</span>;
}

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const { loading: authLoading } = useAuth();

  const fetchApps = useCallback(
    async (q: string, s: string, off: number) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: off,
        };
        if (q) params.search = q;
        if (s) params.status = s;
        const res = await getAdminApplications(
          params as Parameters<typeof getAdminApplications>[0],
        );
        setApps(res.results);
        setTotal(res.count);
      } catch {
        setError("Failed to load applications. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    const t = setTimeout(() => fetchApps(search, statusFilter, offset), 300);
    return () => clearTimeout(t);
  }, [authLoading, search, statusFilter, offset, fetchApps]);

  const selectedCount = apps.filter((a) => a.status === "selected").length;
  const activeCount = apps.filter((a) =>
    ["applied", "interview", "result_waiting"].includes(a.status),
  ).length;
  const rejectedCount = apps.filter((a) => a.status === "rejected").length;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminHero
        eyebrow="Applications"
        title="All Applications"
        description="Every student scholarship application across the platform."
        backHref="/dashboard/admin"
        icon={ClipboardList}
        metrics={
          <>
            <AdminMetric label="Total" value={total} />
            <AdminMetric label="Active" value={activeCount} />
            <AdminMetric label="Selected" value={selectedCount} tone="success" />
            <AdminMetric
              label="Rejected"
              value={rejectedCount}
              tone={rejectedCount > 0 ? "warning" : "normal"}
            />
          </>
        }
      />

      {/* Search + Status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pine/40"
          />
          <input
            type="text"
            placeholder="Search by student or scholarship…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-pine/20 bg-white py-2 pl-9 pr-3 text-sm text-pine placeholder:text-pine/40 focus:outline-none focus:ring-2 focus:ring-pine/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-xl border border-pine/20 bg-white py-2 pl-3 pr-8 text-sm text-pine focus:outline-none focus:ring-2 focus:ring-pine/30"
        >
          <option value="">All statuses</option>
          {STATUS_CHOICES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-pine/10 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <AdminLoading label="Loading applications…" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => fetchApps(search, statusFilter, offset)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pine/20 px-3 py-1.5 text-sm text-pine hover:bg-pine/5"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="py-16 text-center text-sm text-pine/50">
            No applications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pine/10 bg-pine/5 text-left">
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Student
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Scholarship
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Country
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Deadline
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Priority
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pine/5">
                {apps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-pine/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-pine">
                        {app.user_name || "—"}
                      </div>
                      <div className="text-xs text-pine/50">
                        {app.user_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="line-clamp-2 text-xs text-pine/80">
                        {app.opportunity_title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/60">
                      {app.country || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/60">
                      {app.opportunity_deadline
                        ? new Date(
                            app.opportunity_deadline,
                          ).toLocaleDateString()
                        : "Rolling"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(app.status)}</td>
                    <td className="px-4 py-3">
                      {priorityBadge(app.priority)}
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/50">
                      {new Date(app.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-pine/60">
          <span>
            Page {currentPage} of {totalPages} · {total} applications
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-lg border border-pine/20 px-3 py-1.5 hover:bg-pine/5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-pine/20 px-3 py-1.5 hover:bg-pine/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
