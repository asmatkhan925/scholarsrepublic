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

const studentLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Blog", href: "/blog" },
];

const adminLinks = [
  { label: "Admin", href: "/admin" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Blog", href: "/blog" },
];

function isActiveLink(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const authLinks = user?.role === "admin" ? adminLinks : studentLinks;
  const navLinks = isAuthenticated ? authLinks : publicLinks;

  const primaryHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const primaryLabel = user?.role === "admin" ? "Admin" : "Dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-white">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <span className="hidden text-lg sm:inline">Scholars Republic</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => {
            const active = isActiveLink(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-pine/10 text-pine" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="rounded-xl border border-ink/10 px-4 py-2 text-sm text-ink/60">
              Loading
            </span>
          ) : isAuthenticated ? (
            <>
              <Link
                href={primaryHref}
                className="hidden rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink/5 sm:inline-flex"
              >
                {primaryLabel}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Create Free Profile
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-ink/10 px-5 py-3 md:hidden">
        <nav className="flex gap-2 overflow-x-auto">
          {navLinks.map((item) => {
            const active = isActiveLink(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active ? "bg-pine/10 text-pine" : "bg-ink/5 text-ink/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
