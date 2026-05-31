"use client";

import { useCallback, useEffect, useState } from "react";

import { Activity, Clock, RefreshCw, Send, ShieldAlert } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import {
  getSocialSchedulerStatus,
  type SocialSchedulerStatusResponse,
} from "@/lib/api";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45 dark:text-white/45">
          {label}
        </p>
        <Icon size={18} className="text-pine" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}

function StatusRows({ values }: { values: Record<string, number> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(values).map(([key, value]) => (
        <div key={key} className="rounded-lg bg-[#f7faf8] px-3 py-2 dark:bg-white/5">
          <p className="text-xs font-bold uppercase text-ink/45 dark:text-white/45">
            {key.replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-lg font-black text-ink dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function SocialSchedulerContent() {
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
      title="Social Scheduler"
      description="Read-only health monitor for Facebook scheduler caps, due queue, plans, and logs."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Scheduler health
            </p>
            <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
              Server time: {formatDateTime(status?.server_time)}
            </p>
          </div>
          <Button onClick={() => void loadStatus()} disabled={loading} className="gap-2">
            <RefreshCw size={16} aria-hidden="true" />
            {loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        <section className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Posted today" value={status?.posted_today ?? "..."} icon={Send} />
          <MetricCard
            label="Daily remaining"
            value={status?.daily_remaining ?? "..."}
            icon={Activity}
          />
          <MetricCard
            label="Due now"
            value={status ? `${status.returned_count}/${status.due_count}` : "..."}
            icon={Clock}
          />
          <MetricCard
            label="Next allowed"
            value={formatDateTime(status?.next_allowed_post_at)}
            icon={ShieldAlert}
          />
        </section>

        {status ? (
          <>
            <section className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-ink dark:text-white">Due queue preview</h2>
                <Badge tone={status.reason ? "saffron" : "mint"}>
                  {status.reason || "ready"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink/60 dark:text-white/58">
                Due count {status.due_count}, returned {status.returned_count}, cap{" "}
                {status.daily_cap}, per run {status.per_run_cap}, spacing{" "}
                {status.min_spacing_minutes} minutes.
              </p>
              <div className="mt-3 grid gap-2">
                {status.due_items.length ? (
                  status.due_items.map((item) => (
                    <div
                      key={`${item.type}-${item.plan_id}`}
                      className="rounded-lg bg-[#f7faf8] p-3 dark:bg-white/5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={item.type === "collection" ? "sky" : "mint"}>
                          {item.type}
                        </Badge>
                        <p className="font-bold text-ink dark:text-white">
                          {item.collection_title || item.title || `Plan ${item.plan_id}`}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-ink/62 dark:text-white/60">
                        {item.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-[#f7faf8] p-3 text-sm text-ink/60 dark:bg-white/5 dark:text-white/60">
                    No due items are currently returned.
                  </p>
                )}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
                <h2 className="text-lg font-bold text-ink dark:text-white">
                  Individual plan summary
                </h2>
                <div className="mt-3">
                  <StatusRows
                    values={{
                      ready: status.individual_plans.ready,
                      due_ready: status.individual_plans.due_ready,
                      posted: status.individual_plans.posted,
                      failed: status.individual_plans.failed,
                      paused: status.individual_plans.paused,
                      draft: status.individual_plans.draft,
                    }}
                  />
                </div>
                <h3 className="mt-4 text-sm font-bold text-ink dark:text-white">
                  Auto social decisions
                </h3>
                <div className="mt-2">
                  <StatusRows values={status.individual_plans.by_auto_social_decision} />
                </div>
              </div>

              <div className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
                <h2 className="text-lg font-bold text-ink dark:text-white">
                  Collection plan summary
                </h2>
                <h3 className="mt-3 text-sm font-bold text-ink dark:text-white">
                  Collections
                </h3>
                <div className="mt-2">
                  <StatusRows values={status.collections.by_status} />
                </div>
                <h3 className="mt-4 text-sm font-bold text-ink dark:text-white">
                  Collection social plans
                </h3>
                <div className="mt-2">
                  <StatusRows values={status.collections.social_post_plans_by_status} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
              <h2 className="text-lg font-bold text-ink dark:text-white">
                Next collection plans
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs uppercase text-ink/45 dark:text-white/45">
                    <tr>
                      <th className="py-2 pr-3">Collection</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Priority</th>
                      <th className="py-2 pr-3">Next post</th>
                      <th className="py-2 pr-3">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.collections.next_plans.map((plan) => (
                      <tr key={plan.id} className="border-t border-pine/10 dark:border-white/10">
                        <td className="py-2 pr-3 font-semibold">{plan.collection_title}</td>
                        <td className="py-2 pr-3">{plan.status}</td>
                        <td className="py-2 pr-3">{plan.priority_score}</td>
                        <td className="py-2 pr-3">{formatDateTime(plan.next_post_at)}</td>
                        <td className="py-2 pr-3">{formatDateTime(plan.posted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              {[
                { title: "Recent opportunity logs", logs: status.recent_logs.opportunities },
                { title: "Recent collection logs", logs: status.recent_logs.collections },
              ].map((group) => (
                <div
                  key={group.title}
                  className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]"
                >
                  <h2 className="text-lg font-bold text-ink dark:text-white">{group.title}</h2>
                  <div className="mt-3 grid gap-2">
                    {group.logs.length ? (
                      group.logs.map((log, index) => (
                        <div
                          key={`${log.plan_id}-${index}`}
                          className="rounded-lg bg-[#f7faf8] p-3 dark:bg-white/5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={log.status === "failed" ? "saffron" : "mint"}>
                              {log.status}
                            </Badge>
                            <p className="font-semibold">{log.title}</p>
                          </div>
                          <p className="mt-1 text-xs text-ink/50 dark:text-white/50">
                            {formatDateTime(log.created_at)} · Plan {log.plan_id ?? "-"}
                          </p>
                          {log.error_message ? (
                            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                              {log.error_message}
                            </p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-[#f7faf8] p-3 text-sm text-ink/60 dark:bg-white/5 dark:text-white/60">
                        No logs yet.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function SocialSchedulerPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SocialSchedulerContent />
    </ProtectedRoute>
  );
}
