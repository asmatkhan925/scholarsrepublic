"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { GraduationCap, Menu, Moon, Sparkles, Sun, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/theme-provider";
import { Button, ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";

type NavLink = {
  label: string;
  href: string;
  exact?: boolean;
  activePrefixes?: string[];
};

const publicLinks: NavLink[] = [
  { label: "Scholarships", href: "/scholarships" },
  { label: "Guides", href: "/blog", activePrefixes: ["/blog", "/guides"] },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
];

const studentLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", exact: true },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Applications", href: "/dashboard/applications" },
  { label: "Saved", href: "/dashboard/saved" },
  { label: "Guides", href: "/blog", activePrefixes: ["/blog", "/guides"] },
];

const adminLinks: NavLink[] = [
  { label: "Admin", href: "/admin" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Guides", href: "/blog", activePrefixes: ["/blog", "/guides"] },
];

function isActiveLink(pathname: string, item: NavLink) {
  if (item.exact) {
    return pathname === item.href;
  }

  if (
    item.activePrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type NavbarProps = {
  variant?: "default" | "auth";
};

function NavbarThemeToggle({ compact = false }: { compact?: boolean }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={
        compact
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-pine/10 bg-white px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          : "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-pine/10 bg-white text-ink shadow-sm transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      }
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      {compact ? <span>{isDark ? "Light" : "Dark"}</span> : null}
    </button>
  );
}

export function Navbar({ variant = "default" }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
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

  if (variant === "auth") {
    return (
      <header className="border-b border-slate-200 bg-white transition-colors dark:border-white/10 dark:bg-[#101214]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link href="/" className="group flex items-center gap-3 font-bold text-ink dark:text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine text-white shadow-sm transition group-hover:bg-ink dark:group-hover:bg-white/10">
              <GraduationCap size={23} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-base sm:text-lg">Scholars Republic</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-pine/70 sm:block">
                Let&apos;s grow together
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <NavbarThemeToggle />
            <Link
              href="/scholarships"
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-pine/30 hover:bg-mint/40 hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Browse scholarships
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-pine/10 bg-white/95 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#101214]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 font-bold text-ink dark:text-white"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine text-white shadow-sm transition group-hover:bg-ink dark:group-hover:bg-white/10">
            <GraduationCap size={23} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-base sm:text-lg">Scholars Republic</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-pine/70 sm:block">
              Let&apos;s grow together
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navLinks.map((item) => {
            const active = isActiveLink(pathname, item);

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-mint text-pine dark:bg-pine/15 dark:text-pine"
                    : "text-ink/70 hover:bg-pine/5 hover:text-ink dark:text-white/65 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <NavbarThemeToggle />
          {isAuthenticated ? (
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-pine/10 bg-white text-ink shadow-sm transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-pine/10 bg-white px-5 py-4 shadow-soft dark:border-white/10 dark:bg-[#101214] md:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {navLinks.map((item) => {
              const active = isActiveLink(pathname, item);

              return (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-mint text-pine dark:bg-pine/15 dark:text-pine"
                      : "bg-ink/5 text-ink/75 hover:bg-mint dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid gap-2 border-t border-pine/10 pt-4 dark:border-white/10">
            <NavbarThemeToggle compact />
            {isAuthenticated ? (
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
