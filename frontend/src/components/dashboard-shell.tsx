"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

import {
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";

import { DashboardLogoutButton } from "@/components/dashboard-logout-button";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

type DashboardShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  mode?: "student" | "admin";
  hideHeader?: boolean;
};

type DashboardNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  exact?: boolean;
  badge?: string;
};

const studentNavItems: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: UserRoundCheck,
  },
  {
    label: "Scholarships",
    href: "/scholarships",
    icon: Search,
  },
  {
    label: "Recommendations",
    href: "/dashboard/recommendations",
    icon: Star,
  },
  {
    label: "Saved",
    href: "/dashboard/saved",
    icon: ShieldCheck,
  },
  {
    label: "Applications",
    href: "/dashboard/applications",
    icon: ClipboardCheck,
  },
  {
    label: "SOP Tool",
    href: "/dashboard/ai/sop",
    icon: Sparkles,
    badge: "AI",
  },
  {
    label: "Guides",
    href: "/blog",
    icon: BookOpenCheck,
  },
];

const adminNavItems: DashboardNavItem[] = [
  {
    label: "Admin Overview",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Scholarships",
    href: "/scholarships",
    icon: Search,
  },
  {
    label: "Guides",
    href: "/blog",
    icon: BookOpenCheck,
  },
];

function isActiveLink(pathname: string, item: DashboardNavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function DashboardNavLink({ item }: { item: DashboardNavItem }) {
  const pathname = usePathname();
  const active = isActiveLink(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
        active ? "bg-mint text-pine" : "text-ink/65 hover:bg-pine/5 hover:text-ink",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
            active
              ? "bg-white text-pine shadow-sm"
              : "bg-ink/5 text-ink/55 group-hover:bg-mint group-hover:text-pine",
          )}
        >
          <Icon size={18} aria-hidden />
        </span>
        <span className="truncate">{item.label}</span>
      </span>

      {item.badge ? (
        <span className="rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileDashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
        {items.map((item) => {
          const active = isActiveLink(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                active
                  ? "border-pine/20 bg-mint text-pine"
                  : "border-pine/10 bg-white text-ink/65 hover:bg-pine/5 hover:text-ink",
              )}
            >
              <Icon size={16} aria-hidden />
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-saffron px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardShell({
  title,
  description,
  children,
  mode = "student",
  hideHeader = false,
}: DashboardShellProps) {
  const navItems = mode === "admin" ? adminNavItems : studentNavItems;

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-5 md:px-8 lg:grid-cols-[17rem_1fr] lg:py-6">
        <aside className="hidden lg:block">
          <div className="sticky top-5 rounded-[1.75rem] border border-pine/10 bg-white p-4 shadow-soft">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-pine/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine text-white">
                <GraduationCap size={23} aria-hidden />
              </span>
              <span>
                <span className="block text-base font-bold text-ink">Scholars Republic</span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-pine/70">
                  Let&apos;s grow together
                </span>
              </span>
            </Link>

            <div className="mt-4 rounded-2xl bg-mint/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                  {mode === "admin" ? "Admin" : "Student"}
                </p>
                <Badge tone={mode === "admin" ? "saffron" : "mint"}>
                  {mode === "admin" ? "Admin" : "Workspace"}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/60">
                {mode === "admin"
                  ? "Manage platform content and operations."
                  : "Search, save, track, and prepare applications."}
              </p>
            </div>

            <nav className="mt-4 grid gap-1" aria-label="Dashboard navigation">
              {navItems.map((item) => (
                <DashboardNavLink key={item.href} item={item} />
              ))}
            </nav>

            <div className="mt-5 border-t border-pine/10 pt-4">
              <DashboardLogoutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-sm lg:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pine text-white">
                  <GraduationCap size={21} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">Scholars Republic</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-pine/70">
                    Let&apos;s grow together
                  </span>
                </span>
              </Link>
              <DashboardLogoutButton />
            </div>

            <MobileDashboardNav items={navItems} />
          </div>

          {!hideHeader ? (
            <section className="mb-5 rounded-[1.75rem] border border-pine/10 bg-white p-5 shadow-soft md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
                {mode === "admin" ? "Admin dashboard" : "Student dashboard"}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
            </section>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}
