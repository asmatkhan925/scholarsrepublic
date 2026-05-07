"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

const publicLinks = [
  { label: "Scholarships", href: "/scholarships" },
  { label: "Services", href: "/services" },
  { label: "Blog", href: "/blog" },
];

export function Navbar() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const authLinks =
    user?.role === "admin"
      ? [
          { label: "Admin", href: "/admin" },
          { label: "Scholarships", href: "/scholarships" },
        ]
      : [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile", href: "/dashboard/profile" },
          { label: "Scholarships", href: "/scholarships" },
        ];
  const primaryHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const primaryLabel = user?.role === "admin" ? "Admin" : "Dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-pine text-white">
            <GraduationCap size={20} aria-hidden="true" />
          </span>
          <span>Scholars Republic</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink/75 md:flex">
          {(isAuthenticated ? authLinks : publicLinks).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "text-pine" : "hover:text-pine"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm font-semibold">
          {loading ? (
            <span className="rounded px-3 py-2 text-ink/50">Loading</span>
          ) : isAuthenticated ? (
            <>
              <Link
                href={primaryHref}
                className="hidden rounded px-3 py-2 text-ink hover:bg-ink/5 sm:inline-flex"
              >
                {primaryLabel}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded bg-pine px-4 py-2 text-white hover:bg-pine/90"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded px-3 py-2 text-ink hover:bg-ink/5 sm:inline-flex"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded bg-pine px-4 py-2 text-white hover:bg-pine/90"
              >
                Create Free Profile
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
