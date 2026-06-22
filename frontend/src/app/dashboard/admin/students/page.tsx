"use client";

import { useEffect, useState, useCallback } from "react";
import { GraduationCap, Search } from "lucide-react";
import {
  AdminStudentProfile,
  getAdminStudentProfiles,
} from "@/lib/api/admin/users";
import {
  AdminHero,
  AdminMetric,
  AdminLoading,
  AdminFilterButton,
} from "@/components/admin/AdminUI";

const PAGE_SIZE = 50;

type ReadinessFilter = "all" | "High" | "Medium" | "Low";

const READINESS_FILTERS: { key: ReadinessFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "High", label: "High" },
  { key: "Medium", label: "Medium" },
  { key: "Low", label: "Low" },
];

function readinessBadge(level: string) {
  if (level === "High")
    return (
      <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">
        High
      </span>
    );
  if (level === "Medium")
    return (
      <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-xs font-semibold text-saffron-dark">
        Medium
      </span>
    );
  return (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-400">
      Low
    </span>
  );
}

function CompletionBar({ pct }: { pct: number }) {
  const fill =
    pct >= 70 ? "bg-pine" : pct >= 40 ? "bg-saffron" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-pine/10">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-pine/60">{pct}%</span>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [profiles, setProfiles] = useState<AdminStudentProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [readiness, setReadiness] = useState<ReadinessFilter>("all");
  const [offset, setOffset] = useState(0);

  const fetchProfiles = useCallback(
    async (q: string, r: ReadinessFilter, off: number) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: off,
        };
        if (q) params.search = q;
        if (r !== "all") params.readiness = r;
        const res = await getAdminStudentProfiles(
          params as Parameters<typeof getAdminStudentProfiles>[0],
        );
        setProfiles(res.results);
        setTotal(res.count);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(
      () => fetchProfiles(search, readiness, offset),
      300,
    );
    return () => clearTimeout(t);
  }, [search, readiness, offset, fetchProfiles]);

  const highCount = profiles.filter((p) => p.readiness_level === "High").length;
  const medCount = profiles.filter(
    (p) => p.readiness_level === "Medium",
  ).length;
  const avgCompletion = profiles.length
    ? Math.round(
        profiles.reduce((s, p) => s + p.completion_percentage, 0) /
          profiles.length,
      )
    : 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminHero
        eyebrow="Student Profiles"
        title="Profile Overview"
        description="Completion and scholarship readiness across all student accounts."
        backHref="/dashboard/admin"
        icon={GraduationCap}
        metrics={
          <>
            <AdminMetric label="Profiles" value={total} />
            <AdminMetric label="High Readiness" value={highCount} />
            <AdminMetric label="Medium" value={medCount} />
            <AdminMetric label="Avg Completion" value={`${avgCompletion}%`} />
          </>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pine/40"
          />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-pine/20 bg-white py-2 pl-9 pr-3 text-sm text-pine placeholder:text-pine/40 focus:outline-none focus:ring-2 focus:ring-pine/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {READINESS_FILTERS.map((f) => (
            <AdminFilterButton
              key={f.key}
              label={f.label}
              active={readiness === f.key}
              onClick={() => {
                setReadiness(f.key);
                setOffset(0);
              }}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-pine/10 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <AdminLoading label="Loading profiles…" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-16 text-center text-sm text-pine/50">
            No profiles found.
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
                    Institution
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">Level</th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Completion
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Readiness
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">Score</th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Missing
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pine/5">
                {profiles.map((p) => (
                  <tr
                    key={p.user_id}
                    className={`hover:bg-pine/[0.02] transition-colors ${!p.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-pine">
                        {p.full_name || "—"}
                      </div>
                      <div className="text-xs text-pine/50">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/70">
                      {p.current_institution || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/70 capitalize">
                      {p.current_education_level?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <CompletionBar pct={p.completion_percentage} />
                    </td>
                    <td className="px-4 py-3">
                      {readinessBadge(p.readiness_level)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-pine">
                      {p.scholarship_readiness_score}
                    </td>
                    <td className="px-4 py-3">
                      {p.missing_count > 0 ? (
                        <span className="text-xs text-red-400">
                          {p.missing_count} missing
                        </span>
                      ) : (
                        <span className="text-xs text-pine/40">Complete</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/50">
                      {new Date(p.joined).toLocaleDateString()}
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
            Page {currentPage} of {totalPages} · {total} profiles
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
