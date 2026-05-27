"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RefreshCw } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { getAdminDeadlineVerificationQueue } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { DeadlineVerificationQueueItem } from "@/types/opportunity";

const groups = [
  { key: "ready", label: "Ready for verification" },
  { key: "recent", label: "Checked recently" },
  { key: "review", label: "Needs review" },
  { key: "failed", label: "Failed/unclear" },
  { key: "updated", label: "Extended/updated" },
] as const;

function groupFor(item: DeadlineVerificationQueueItem) {
  if (item.deadline_check_status === "extended") return "updated";
  if (["unclear", "failed"].includes(item.deadline_check_status)) return "failed";
  if (item.deadline_check_status === "needs_review") return "review";
  if (item.deadline_last_checked_at) return "recent";
  return "ready";
}

export default function ScholarshipDeadlineVerificationPage() {
  const [items, setItems] = useState<DeadlineVerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQueue() {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminDeadlineVerificationQueue({
        limit: 50,
        days: 30,
        status: "all",
      });
      setItems(response.items);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Could not load deadline queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const grouped = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      items: items.filter((item) => groupFor(item) === group.key),
    }));
  }, [items]);

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

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
              {error}
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
                        <Link
                          key={item.id}
                          href={`/dashboard/admin/scholarships/${item.id}/edit`}
                          className="grid gap-1 rounded-xl border border-pine/10 bg-white px-3 py-2 text-sm transition hover:border-pine/30 hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <span className="font-bold text-ink dark:text-white">{item.title}</span>
                          <span className="text-xs text-ink/60 dark:text-white/55">
                            {item.country || "No country"} · {item.deadline || "No deadline"} ·{" "}
                            {item.priority_reason}
                          </span>
                        </Link>
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
