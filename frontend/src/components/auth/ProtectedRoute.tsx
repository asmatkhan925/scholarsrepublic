"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
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
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, loading, pathname, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-skyglass px-4 text-sm font-medium text-ink/70">
        Loading your workspace...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-skyglass px-4 text-sm font-medium text-ink/70">
        Redirecting to login...
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="grid min-h-screen place-items-center bg-skyglass px-4">
        <section className="max-w-md rounded border border-ink/10 bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Access denied</h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            Your account does not have permission to open this area.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            Go to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
