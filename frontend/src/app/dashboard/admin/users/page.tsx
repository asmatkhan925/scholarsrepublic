"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Search, CheckCircle, XCircle } from "lucide-react";
import {
  AdminUser,
  getAdminUsers,
  patchAdminUser,
} from "@/lib/api/admin/users";
import {
  AdminHero,
  AdminMetric,
  AdminLoading,
  AdminFilterButton,
} from "@/components/admin/AdminUI";

const PAGE_SIZE = 50;

type FilterKey = "all" | "student" | "admin" | "unverified" | "inactive";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "student", label: "Students" },
  { key: "admin", label: "Admins" },
  { key: "unverified", label: "Unverified" },
  { key: "inactive", label: "Inactive" },
];

function roleBadge(role: string) {
  return role === "admin" ? (
    <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">
      Admin
    </span>
  ) : (
    <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-xs font-semibold text-saffron-dark">
      Student
    </span>
  );
}

function verifiedBadge(v: boolean) {
  return v ? (
    <span className="inline-flex items-center gap-1 text-xs text-pine">
      <CheckCircle size={12} /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-red-400">
      <XCircle size={12} /> Unverified
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [offset, setOffset] = useState(0);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchUsers = useCallback(
    async (q: string, f: FilterKey, off: number) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: off,
        };
        if (q) params.search = q;
        if (f === "student") params.role = "student";
        if (f === "admin") params.role = "admin";
        if (f === "unverified") params.email_verified = "false";
        if (f === "inactive") params.is_active = "false";
        const res = await getAdminUsers(
          params as Parameters<typeof getAdminUsers>[0],
        );
        setUsers(res.results);
        setTotal(res.count);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search, filter, offset), 300);
    return () => clearTimeout(t);
  }, [search, filter, offset, fetchUsers]);

  async function toggleVerified(user: AdminUser) {
    setTogglingId(user.id);
    try {
      const updated = await patchAdminUser(user.id, {
        email_verified: !user.email_verified,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function toggleActive(user: AdminUser) {
    setTogglingId(user.id);
    try {
      const updated = await patchAdminUser(user.id, {
        is_active: !user.is_active,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
    } finally {
      setTogglingId(null);
    }
  }

  const unverifiedCount = users.filter((u) => !u.email_verified).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminHero
        eyebrow="User Management"
        title="All Users"
        description="View, verify, and manage every registered account on the platform."
        backHref="/dashboard/admin"
        icon={Users}
        metrics={
          <>
            <AdminMetric label="Total" value={total} />
            <AdminMetric label="Shown" value={users.length} />
            <AdminMetric
              label="Unverified"
              value={unverifiedCount}
              tone={unverifiedCount > 0 ? "warning" : "normal"}
            />
            <AdminMetric
              label="Inactive"
              value={inactiveCount}
              tone={inactiveCount > 0 ? "warning" : "normal"}
            />
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
          {FILTERS.map((f) => (
            <AdminFilterButton
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onClick={() => {
                setFilter(f.key);
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
            <AdminLoading label="Loading users…" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-pine/50">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pine/10 bg-pine/5 text-left">
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Name / Email
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">Role</th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Verified
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Profile
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Joined
                  </th>
                  <th className="px-4 py-3 font-medium text-pine/70">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pine/5">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-pine/[0.02] transition-colors ${!user.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-pine">
                        {user.full_name || "—"}
                      </div>
                      <div className="text-xs text-pine/50">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">{roleBadge(user.role)}</td>
                    <td className="px-4 py-3">
                      {verifiedBadge(user.email_verified)}
                    </td>
                    <td className="px-4 py-3">
                      {user.has_profile ? (
                        <span className="text-xs text-pine/70">
                          Has profile
                        </span>
                      ) : (
                        <span className="text-xs text-pine/30">
                          No profile
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-pine/50">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={togglingId === user.id}
                          onClick={() => toggleVerified(user)}
                          className="rounded-lg border border-pine/20 px-2.5 py-1 text-xs text-pine hover:bg-pine/5 disabled:opacity-50 transition-colors"
                        >
                          {user.email_verified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          disabled={togglingId === user.id}
                          onClick={() => toggleActive(user)}
                          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
                            user.is_active
                              ? "border-red-200 text-red-500 hover:bg-red-50"
                              : "border-pine/20 text-pine hover:bg-pine/5"
                          }`}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
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
            Page {currentPage} of {totalPages} · {total} users
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
