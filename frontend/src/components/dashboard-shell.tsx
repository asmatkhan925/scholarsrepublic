"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

import { DashboardLogoutButton } from "@/components/dashboard-logout-button";

type DashboardShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  mode?: "student" | "admin";
};

type DashboardNavItem =
  | {
      label: string;
      href: string;
      disabled?: false;
    }
  | {
      label: string;
      disabled: true;
    };

const studentNavItems: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Recommendations", href: "/dashboard/recommendations" },
  { label: "Saved", href: "/dashboard/saved" },
  { label: "Applications", href: "/dashboard/applications" },
  { label: "AI SOP", href: "/dashboard/ai/sop" },
  { label: "Blog", href: "/blog" },
  { label: "SOP Guide", href: "/guides/how-to-write-sop-for-scholarship" },
  { label: "Documents", disabled: true },
];

const adminNavItems: DashboardNavItem[] = [
  { label: "Admin Overview", href: "/admin" },
  { label: "Scholarships", disabled: true },
  { label: "Users", disabled: true },
  { label: "Service Requests", disabled: true },
  { label: "Blog", href: "/blog" },
  { label: "SOP Guide", href: "/guides/how-to-write-sop-for-scholarship" },
];

function isActiveLink(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  title,
  description,
  children,
  mode = "student",
}: DashboardShellProps) {
  const pathname = usePathname();
  const navItems = mode === "admin" ? adminNavItems : studentNavItems;

  return (
    <main className="min-h-screen bg-cream/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft lg:sticky lg:top-6 lg:self-start">
          <Link href="/" className="flex items-center gap-3 text-ink">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pine text-white">
              <GraduationCap size={24} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-bold">Scholars Republic</span>
              <span className="text-xs font-medium text-ink/55">
                {mode === "admin" ? "Admin" : "Student"} dashboard
              </span>
            </span>
          </Link>

          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => {
              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-ink/35"
                  >
                    {item.label}
                  </span>
                );
              }

              const active = isActiveLink(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-pine/10 text-pine"
                      : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-ink/10 pt-5">
            <DashboardLogoutButton />
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-wide text-saffron">
              {mode === "admin" ? "Admin" : "Student"} dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/65">
              {description}
            </p>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
