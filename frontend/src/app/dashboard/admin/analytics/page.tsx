"use client";

import { useEffect, useState, useRef } from "react";
import { BarChart2, RefreshCw } from "lucide-react";
import {
  AdminAnalyticsResponse,
  getAdminAnalytics,
} from "@/lib/api/admin/users";
import {
  AdminHero,
  AdminMetric,
  AdminLoading,
  AdminNotice,
} from "@/components/admin/AdminUI";

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

function statusColor(s: string) {
  if (s === "selected") return "bg-pine";
  if (["rejected", "withdrawn"].includes(s)) return "bg-red-400";
  if (["interview", "result_waiting", "applied"].includes(s)) return "bg-saffron";
  return "bg-pine/30";
}

/** Simple horizontal bar chart using CSS widths */
function HBar({
  label,
  value,
  max,
  color = "bg-pine",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 truncate text-right text-xs text-pine/60">{label}</div>
      <div className="h-5 flex-1 rounded-lg bg-pine/5">
        <div
          className={`h-full rounded-lg ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-8 shrink-0 text-xs font-semibold text-pine">{value}</div>
    </div>
  );
}

/** Sparkline-style series bar chart */
function SparkBars({
  data,
  color = "bg-pine",
}: {
  data: { date: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-20 items-end gap-px">
      {data.map((d) => {
        const h = Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2);
        return (
          <div
            key={d.date}
            className="group relative flex-1"
            title={`${d.date}: ${d.count}`}
          >
            <div
              className={`w-full rounded-t-sm ${d.count > 0 ? color : "bg-pine/10"} transition-all`}
              style={{ height: `${h}%` }}
            />
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
              {d.date.slice(5)}: {d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didFetch = useRef(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminAnalytics();
      setData(res);
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void load();
  }, []);

  const s = data?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminHero
        eyebrow="Analytics"
        title="Platform Analytics"
        description="Growth, applications, readiness and scholarship engagement — last 30 days."
        backHref="/dashboard/admin"
        icon={BarChart2}
        metrics={
          s ? (
            <>
              <AdminMetric label="Total Users" value={s.total_users} />
              <AdminMetric label="New (30d)" value={s.new_users_30d} tone="success" />
              <AdminMetric label="Applications" value={s.total_applications} />
              <AdminMetric label="New Apps (30d)" value={s.new_applications_30d} tone="success" />
            </>
          ) : undefined
        }
      />

      {loading ? (
        <AdminLoading label="Loading analytics…" />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AdminNotice tone="danger">{error}</AdminNotice>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pine/20 px-3 py-1.5 text-sm text-pine hover:bg-pine/5"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : data ? (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <AdminMetric label="Students" value={s!.total_students} />
            <AdminMetric label="Profiles" value={s!.total_profiles} />
            <AdminMetric label="Published" value={s!.published_scholarships} tone="success" />
            <AdminMetric label="High Readiness" value={data.readiness_distribution.High} tone="success" />
            <AdminMetric label="Medium" value={data.readiness_distribution.Medium} tone="warning" />
            <AdminMetric label="Low" value={data.readiness_distribution.Low} tone="danger" />
            <AdminMetric
              label="Total Apps"
              value={s!.total_applications}
            />
          </div>

          {/* Two sparkline charts */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-pine/50">
                User Signups — last 30 days
              </p>
              <p className="mb-4 text-2xl font-black text-pine">
                {s!.new_users_30d}{" "}
                <span className="text-sm font-normal text-pine/40">new users</span>
              </p>
              <SparkBars data={data.signups_series} color="bg-pine" />
              <div className="mt-1 flex justify-between text-[10px] text-pine/30">
                <span>{data.signups_series[0]?.date.slice(5)}</span>
                <span>{data.signups_series[data.signups_series.length - 1]?.date.slice(5)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-pine/50">
                New Applications — last 30 days
              </p>
              <p className="mb-4 text-2xl font-black text-pine">
                {s!.new_applications_30d}{" "}
                <span className="text-sm font-normal text-pine/40">applications</span>
              </p>
              <SparkBars data={data.apps_series} color="bg-saffron" />
              <div className="mt-1 flex justify-between text-[10px] text-pine/30">
                <span>{data.apps_series[0]?.date.slice(5)}</span>
                <span>{data.apps_series[data.apps_series.length - 1]?.date.slice(5)}</span>
              </div>
            </div>
          </div>

          {/* Bottom row: status + top scholarships + countries */}
          <div className="grid gap-5 lg:grid-cols-3">

            {/* Application status breakdown */}
            <div className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-pine/50">
                Application Pipeline
              </p>
              <div className="space-y-2.5">
                {data.status_breakdown.map((row) => (
                  <HBar
                    key={row.status}
                    label={STATUS_LABELS[row.status] ?? row.status}
                    value={row.count}
                    max={data.status_breakdown[0]?.count ?? 1}
                    color={statusColor(row.status)}
                  />
                ))}
              </div>
            </div>

            {/* Top scholarships */}
            <div className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-pine/50">
                Top Scholarships by Applications
              </p>
              <div className="space-y-2.5">
                {data.top_scholarships.map((row) => (
                  <div key={row.id} className="flex items-start gap-2">
                    <span className="mt-0.5 min-w-[1.5rem] text-right text-xs font-black text-pine">
                      {row.count}
                    </span>
                    <span className="line-clamp-2 text-xs text-pine/70">{row.title}</span>
                  </div>
                ))}
                {data.top_scholarships.length === 0 && (
                  <p className="text-xs text-pine/40">No data yet.</p>
                )}
              </div>
            </div>

            {/* Profile readiness + top countries */}
            <div className="space-y-5">
              {/* Readiness donut-style */}
              <div className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-pine/50">
                  Profile Readiness
                </p>
                {(() => {
                  const rd = data.readiness_distribution;
                  const total = rd.High + rd.Medium + rd.Low;
                  return (
                    <div className="space-y-2">
                      {[
                        { label: "High", value: rd.High, color: "bg-pine" },
                        { label: "Medium", value: rd.Medium, color: "bg-saffron" },
                        { label: "Low", value: rd.Low, color: "bg-red-400" },
                      ].map((r) => (
                        <HBar key={r.label} label={r.label} value={r.value} max={total} color={r.color} />
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Top countries */}
              <div className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-pine/50">
                  Top Countries Applied To
                </p>
                <div className="space-y-2">
                  {data.top_countries.map((row) => (
                    <HBar
                      key={row.country}
                      label={row.country}
                      value={row.count}
                      max={data.top_countries[0]?.count ?? 1}
                      color="bg-pine/60"
                    />
                  ))}
                  {data.top_countries.length === 0 && (
                    <p className="text-xs text-pine/40">No data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
