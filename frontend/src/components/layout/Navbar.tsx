"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { GraduationCap, Menu, Sparkles, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button, ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";

const publicLinks = [
  { label: "Scholarships", href: "/scholarships" },
  { label: "Services", href: "/services" },
  { label: "Blog", href: "/blog" },
];

const studentLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "AI SOP", href: "/dashboard/ai/sop" },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setMobileOpen(false);
    router.push("/");
  }

  const authLinks = user?.role === "admin" ? adminLinks : studentLinks;
  const navLinks = isAuthenticated ? authLinks : publicLinks;
  const primaryHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const primaryLabel = user?.role === "admin" ? "Admin" : "Dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-pine/10 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 font-bold text-ink"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine text-white shadow-sm transition group-hover:bg-ink">
            <GraduationCap size={23} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-base sm:text-lg">Scholars Republic</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-pine/70 sm:block">
              Scholarship Platform
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navLinks.map((item) => {
            const active = isActiveLink(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                  active ? "bg-mint text-pine" : "text-ink/70 hover:bg-pine/5 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <span className="rounded-2xl border border-pine/10 bg-white px-4 py-2 text-sm font-semibold text-ink/60">
              Loading
            </span>
          ) : isAuthenticated ? (
            <>
              <ButtonLink href={primaryHref} variant="outline">
                {primaryLabel}
              </ButtonLink>
              <Button onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="outline">
                Login
              </ButtonLink>
              <ButtonLink href="/register">
                <Sparkles size={16} aria-hidden="true" />
                Create Free Profile
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-pine/10 bg-white text-ink shadow-sm transition hover:bg-mint md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-pine/10 bg-white px-5 py-4 shadow-soft md:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {navLinks.map((item) => {
              const active = isActiveLink(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active ? "bg-mint text-pine" : "bg-ink/5 text-ink/75 hover:bg-mint",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid gap-2 border-t border-pine/10 pt-4">
            {loading ? (
              <span className="rounded-2xl border border-pine/10 px-4 py-3 text-sm font-semibold text-ink/60">
                Loading
              </span>
            ) : isAuthenticated ? (
              <>
                <ButtonLink
                  href={primaryHref}
                  variant="outline"
                  onClick={() => setMobileOpen(false)}
                >
                  {primaryLabel}
                </ButtonLink>
                <Button onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="outline" onClick={() => setMobileOpen(false)}>
                  Login
                </ButtonLink>
                <ButtonLink href="/register" onClick={() => setMobileOpen(false)}>
                  Create Free Profile
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
