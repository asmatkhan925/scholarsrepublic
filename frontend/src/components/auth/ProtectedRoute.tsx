"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getSafeNextPath } from "@/lib/redirects";
import type { UserRole } from "@/types/auth";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      const nextPath = getSafeNextPath(`${pathname}${currentSearch}`);
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [isAuthenticated, loading, pathname, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-20 text-center text-slate-600">
        Loading your workspace...
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-20 text-center text-slate-600">
        Redirecting to login...
      </main>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-20">
        <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Access denied</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your account does not have permission to open this area.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Go to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
