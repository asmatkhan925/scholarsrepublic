"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import {
  AdminUserDetail,
  AdminApplication,
  getAdminUser,
  patchAdminUser,
  getAdminApplications,
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
  result_waiting: "Awaiting Result",
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
    return <span className={`${base} bg-pine/10 text-pine`}>{STATUS_LABELS[s] ?? s}</span>;
  if (negative.includes(s))
    return <span className={`${base} bg-red-50 text-red-400`}>{STATUS_LABELS[s] ?? s}</span>;
  if (active.includes(s))
    return <span className={`${base} bg-saffron/15 text-saffron-dark`}>{STATUS_LABELS[s] ?? s}</span>;
  return <span className={`${base} bg-pine/5 text-pine/60`}>{STATUS_LABELS[s] ?? s}</span>;
}

function CompletionBar({ pct }: { pct: number }) {
  const fill = pct >= 70 ? "bg-pine" : pct >= 40 ? "bg-saffron" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-pine/10">
        <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-pine">{pct}%</span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string>("");
  const didFetch = useRef(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [u, a] = await Promise.all([
        getAdminUser(userId),
        getAdminApplications({ user_id: userId, limit: 50 }),
      ]);
      setUser(u);
      setPendingRole(u.role);
      setApps(a.results);
    } catch {
      setError("Failed to load user. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void load();
  }, [userId]);

  async function handleToggle(field: "email_verified" | "is_active") {
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await patchAdminUser(userId, { [field]: !user[field] });
      setUser((prev) => prev ? { ...prev, ...updated } : prev);
      setSaveMsg("Saved.");
    } catch {
      setSaveMsg("Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  }

  async function handleRoleChange() {
    if (!user || pendingRole === user.role) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await patchAdminUser(userId, { role: pendingRole });
      setUser((prev) => prev ? { ...prev, ...updated } : prev);
      setSaveMsg("Role updated.");
    } catch {
      setSaveMsg("Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <AdminLoading label="Loading user…" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-4">
        <AdminNotice tone="danger">{error ?? "User not found."}</AdminNotice>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-xl border border-pine/20 px-3 py-1.5 text-sm text-pine hover:bg-pine/5"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const hasProfile = user.has_profile && user.profile?.completion_percentage !== undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <AdminHero
        eyebrow="User Detail"
        title={user.full_name || user.email}
        description={user.email}
        backHref="/dashboard/admin/users"
        backLabel="All Users"
        icon={Users}
        metrics={
          <>
            <AdminMetric
              label="Role"
              value={user.role === "admin" ? "Admin" : "Student"}
              tone={user.role === "admin" ? "success" : "normal"}
            />
            <AdminMetric
              label="Verified"
              value={user.email_verified ? "Yes" : "No"}
              tone={user.email_verified ? "success" : "warning"}
            />
            <AdminMetric
              label="Active"
              value={user.is_active ? "Yes" : "No"}
              tone={user.is_active ? "success" : "danger"}
            />
            <AdminMetric
              label="Applications"
              value={apps.length}
            />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: actions + profile */}
        <div className="space-y-5 lg:col-span-1">

          {/* Account actions */}
          <section className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pine/50">
              Account Actions
            </h2>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-pine/70">Role</label>
              <div className="flex gap-2">
                <select
                  value={pendingRole}
                  onChange={(e) => setPendingRole(e.target.value)}
                  className="flex-1 rounded-xl border border-pine/20 bg-white py-2 pl-3 pr-8 text-sm text-pine focus:outline-none focus:ring-2 focus:ring-pine/30"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  disabled={saving || pendingRole === user.role}
                  onClick={handleRoleChange}
                  className="rounded-xl border border-pine/20 px-3 py-2 text-sm font-medium text-pine hover:bg-pine/5 disabled:opacity-40 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Verified toggle */}
            <div className="flex items-center justify-between rounded-xl bg-pine/5 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-pine">
                <CheckCircle size={15} className={user.email_verified ? "text-pine" : "text-pine/30"} />
                Email verified
              </div>
              <button
                disabled={saving}
                onClick={() => handleToggle("email_verified")}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  user.email_verified
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-pine/20 text-pine hover:bg-pine/5"
                }`}
              >
                {user.email_verified ? "Unverify" : "Verify"}
              </button>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-xl bg-pine/5 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-pine">
                <ShieldCheck size={15} className={user.is_active ? "text-pine" : "text-pine/30"} />
                Account active
              </div>
              <button
                disabled={saving}
                onClick={() => handleToggle("is_active")}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  user.is_active
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-pine/20 text-pine hover:bg-pine/5"
                }`}
              >
                {user.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>

            {saveMsg && (
              <p className={`text-xs font-medium ${saveMsg.startsWith("F") ? "text-red-400" : "text-pine"}`}>
                {saveMsg}
              </p>
            )}

            <div className="border-t border-pine/10 pt-3 space-y-1 text-xs text-pine/50">
              <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(user.updated_at).toLocaleDateString()}</p>
            </div>
          </section>

          {/* Profile stats */}
          {hasProfile ? (
            <section className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-pine/50">
                <GraduationCap size={13} /> Profile
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-pine/60">
                  <span>Completion</span>
                  <span>{user.profile.completion_percentage}%</span>
                </div>
                <CompletionBar pct={user.profile.completion_percentage!} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <AdminMetric
                  label="Readiness Score"
                  value={user.profile.scholarship_readiness_score ?? "—"}
                />
                <AdminMetric
                  label="Level"
                  value={user.profile.readiness_level ?? "—"}
                  tone={
                    user.profile.readiness_level === "High"
                      ? "success"
                      : user.profile.readiness_level === "Medium"
                      ? "warning"
                      : "danger"
                  }
                />
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-pine/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-pine/50">
                <GraduationCap size={13} /> Profile
              </h2>
              <p className="mt-3 text-sm text-pine/40">No profile created yet.</p>
            </section>
          )}
        </div>

        {/* Right column: applications */}
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-pine/10 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-pine/10 px-5 py-3">
              <ClipboardList size={15} className="text-pine/50" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-pine/50">
                Applications ({apps.length})
              </h2>
            </div>
            {apps.length === 0 ? (
              <div className="py-12 text-center text-sm text-pine/40">
                No applications yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pine/10 bg-pine/5 text-left">
                      <th className="px-4 py-3 font-medium text-pine/70">Scholarship</th>
                      <th className="px-4 py-3 font-medium text-pine/70">Country</th>
                      <th className="px-4 py-3 font-medium text-pine/70">Deadline</th>
                      <th className="px-4 py-3 font-medium text-pine/70">Status</th>
                      <th className="px-4 py-3 font-medium text-pine/70">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pine/5">
                    {apps.map((app) => (
                      <tr key={app.id} className="hover:bg-pine/[0.02] transition-colors">
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="line-clamp-2 text-xs text-pine/80">{app.opportunity_title}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-pine/60">{app.country || "—"}</td>
                        <td className="px-4 py-3 text-xs text-pine/60">
                          {app.opportunity_deadline
                            ? new Date(app.opportunity_deadline).toLocaleDateString()
                            : "Rolling"}
                        </td>
                        <td className="px-4 py-3">{statusBadge(app.status)}</td>
                        <td className="px-4 py-3 text-xs text-pine/50">
                          {new Date(app.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
