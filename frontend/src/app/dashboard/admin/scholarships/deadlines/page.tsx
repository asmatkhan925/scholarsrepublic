"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, Download, FileJson, RefreshCw, Search } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import {
  getAdminDeadlineVerificationQueue,
  runAdminDeadlineVerificationAction,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  DeadlineVerificationQueueItem,
  DeadlineVerificationQueueResponse,
} from "@/types/opportunity";

type QueueFilter =
  | "all"
  | "near"
  | "needs_review"
  | "unclear"
  | "failed"
  | "confirmed"
  | "extended"
  | "image_stale";

const filters: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "near", label: "Near deadline" },
  { key: "needs_review", label: "Needs review" },
  { key: "unclear", label: "Unclear" },
  { key: "failed", label: "Failed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "extended", label: "Extended" },
  { key: "image_stale", label: "Image stale" },
];

const groups = [
  { key: "ready", label: "Ready for verification" },
  { key: "recent", label: "Checked recently" },
  { key: "review", label: "Needs review" },
  { key: "failed", label: "Failed/unclear" },
  { key: "updated", label: "Extended/updated" },
] as const;

const emptyStats: DeadlineVerificationQueueResponse["stats"] = {
  total_pending: 0,
  near_deadline: 0,
  unclear: 0,
  failed: 0,
  extended: 0,
  stale_social_image: 0,
};

function groupFor(item: DeadlineVerificationQueueItem) {
  if (item.deadline_check_status === "extended") return "updated";
  if (["unclear", "failed"].includes(item.deadline_check_status)) return "failed";
  if (item.deadline_check_status === "needs_review") return "review";
  if (item.deadline_last_checked_at) return "recent";
  return "ready";
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ScholarshipDeadlineVerificationPage() {
  const [items, setItems] = useState<DeadlineVerificationQueueItem[]>([]);
  const [stats, setStats] = useState<DeadlineVerificationQueueResponse["stats"]>(emptyStats);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadQueue(activeFilter: QueueFilter = filter) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await getAdminDeadlineVerificationQueue({
        limit: 50,
        days: 30,
        status: activeFilter,
      });
      setItems(response.items);
      setStats(response.stats ?? emptyStats);
      setSelectedIds([]);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Could not load deadline queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      items: items.filter((item) => groupFor(item) === group.key),
    }));
  }, [items]);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function toggleSelected(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  async function runSelectedAction(action: "prepare_packages" | "mark_reviewed" | "recheck") {
    if (selectedIds.length === 0) {
      setError("Select at least one scholarship first.");
      return;
    }
    setActionLoading(action);
    setError("");
    setMessage("");
    try {
      const response = await runAdminDeadlineVerificationAction({ action, ids: selectedIds });
      if (action === "prepare_packages") {
        downloadJson("deadline-verification-packages.json", response.packages ?? []);
        setMessage(`Prepared ${response.count ?? 0} package(s).`);
      } else {
        setMessage(
          action === "mark_reviewed"
            ? `Marked ${response.updated ?? 0} scholarship(s) as reviewed.`
            : `Rechecked ${response.count ?? 0} scholarship(s).`,
        );
      }
      await loadQueue(filter);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Deadline verification action failed.");
    } finally {
      setActionLoading("");
    }
  }

  function exportQueue() {
    downloadJson("deadline-verification-queue.json", { stats, items });
  }

  async function changeFilter(nextFilter: QueueFilter) {
    setFilter(nextFilter);
    await loadQueue(nextFilter);
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardShell
        title="Deadline Verification"
        description="Review published scholarships that need deadline confirmation."
        mode="admin"
      >
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink dark:text-white">
                Deadline Verification
              </h1>
              <p className="mt-1 text-sm text-ink/60 dark:text-white/55">
                Review published scholarships that need deadline confirmation.
              </p>
            </div>
            <Button type="button" onClick={() => void loadQueue()} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {loading ? "Loading..." : "Refresh queue"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Pending" value={stats.total_pending} />
            <StatCard label="Near deadline" value={stats.near_deadline} />
            <StatCard label="Unclear" value={stats.unclear} />
            <StatCard label="Failed" value={stats.failed} />
            <StatCard label="Extended" value={stats.extended} />
            <StatCard label="Stale images" value={stats.stale_social_image} />
          </div>

          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="grid gap-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {filters.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    size="sm"
                    variant={filter === item.key ? "primary" : "outline"}
                    onClick={() => void changeFilter(item.key)}
                    disabled={loading}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={toggleAll}>
                  {allSelected ? "Clear selection" : "Select visible"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void runSelectedAction("prepare_packages")}
                  disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                >
                  <FileJson size={15} aria-hidden="true" />
                  {actionLoading === "prepare_packages" ? "Preparing..." : "Prepare packages"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void runSelectedAction("mark_reviewed")}
                  disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Mark reviewed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void runSelectedAction("recheck")}
                  disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                >
                  <Search size={15} aria-hidden="true" />
                  Recheck selected
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={exportQueue}>
                  <Download size={15} aria-hidden="true" />
                  Export JSON
                </Button>
                <span className="text-xs font-semibold text-ink/55 dark:text-white/50">
                  {selectedIds.length} selected
                </span>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-xl border border-pine/20 bg-mint px-3 py-2 text-sm font-semibold text-pine dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
              {message}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {grouped.map((group) => (
              <Card key={group.key} className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-ink dark:text-white">
                      {group.label}
                    </h2>
                    <Badge tone="pine">{group.items.length}</Badge>
                  </div>

                  {group.items.length === 0 ? (
                    <p className="text-sm text-ink/55 dark:text-white/50">No scholarships.</p>
                  ) : (
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-pine/10 bg-white px-3 py-2 text-sm transition hover:border-pine/30 hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-pine/30"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            aria-label={`Select ${item.title}`}
                          />
                          <Link
                            href={`/dashboard/admin/scholarships/${item.id}/edit`}
                            className="grid gap-1"
                          >
                            <span className="font-bold text-ink dark:text-white">
                              {item.title}
                            </span>
                            <span className="text-xs text-ink/60 dark:text-white/55">
                              {item.country || "No country"} - {item.deadline || "No deadline"} -{" "}
                              {item.priority_reason}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase text-ink/50 dark:text-white/45">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
