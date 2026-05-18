"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType, ReactNode } from "react";

import {
  BookOpenCheck,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Sun,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";

import { DashboardLogoutButton } from "@/components/dashboard-logout-button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

type DashboardShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  mode?: "student" | "admin";
  hideHeader?: boolean;
};

type NavIcon = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

type DashboardNavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  exact?: boolean;
  badge?: string;
  disabled?: boolean;
};

type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

const studentNavGroups: DashboardNavGroup[] = [
  {
    title: "Workspace",
    items: [
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
    ],
  },
  {
    title: "Opportunities",
    items: [
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
    ],
  },
];

const preparationTools: DashboardNavItem[] = [
  {
    label: "SOP Generator",
    href: "/dashboard/ai/sop",
    icon: Sparkles,
    badge: "AI",
  },
  {
    label: "CV Builder",
    href: "/dashboard/tools/cv",
    icon: FileText,
    badge: "Soon",
    disabled: true,
  },
  {
    label: "Study Plan",
    href: "/dashboard/tools/study-plan",
    icon: BookOpenCheck,
    badge: "Soon",
    disabled: true,
  },
  {
    label: "Professor Email",
    href: "/dashboard/tools/professor-email",
    icon: FileText,
    badge: "Soon",
    disabled: true,
  },
];

const adminNavGroups: DashboardNavGroup[] = [
  {
    title: "Admin",
    items: [
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
    ],
  },
];

function isActiveLink(pathname: string, item: DashboardNavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isToolSectionActive(pathname: string) {
  return preparationTools.some((item) => !item.disabled && isActiveLink(pathname, item));
}

function DashboardNavLink({
  item,
  compact = false,
  onNavigate,
}: {
  item: DashboardNavItem;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActiveLink(pathname, item);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink/35 dark:text-white/35",
          compact ? "bg-white/70" : "",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/30">
            <Icon size={18} aria-hidden />
          </span>
          <span className="truncate">{item.label}</span>
        </span>

        {item.badge ? (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">
            {item.badge}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
        active ? "bg-mint text-pine" : "text-ink/65 hover:bg-pine/5 hover:text-ink",
        compact ? "bg-white/80" : "",
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

function DesktopToolsMenu() {
  const pathname = usePathname();
  const active = isToolSectionActive(pathname);

  return (
    <details className="group/tools" open={active}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition [&::-webkit-details-marker]:hidden",
          active ? "bg-mint text-pine" : "text-ink/65 hover:bg-pine/5 hover:text-ink",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
              active ? "bg-white text-pine shadow-sm" : "bg-ink/5 text-ink/55",
            )}
          >
            <Wrench size={18} aria-hidden />
          </span>
          <span>Tools</span>
        </span>
        <ChevronDown size={16} aria-hidden className="transition group-open/tools:rotate-180" />
      </summary>

      <div className="mt-2 grid gap-1 border-l border-pine/10 pl-3">
        {preparationTools.map((item) => (
          <DashboardNavLink key={item.href} item={item} />
        ))}
      </div>
    </details>
  );
}

function MobileMenuPanel({
  groups,
  showTools,
  onNavigate,
}: {
  groups: DashboardNavGroup[];
  showTools: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const toolsActive = isToolSectionActive(pathname);

  return (
    <div className="mt-4 border-t border-pine/10 pt-4">
      <nav className="grid gap-5" aria-label="Mobile dashboard navigation">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/35">
              {group.title}
            </p>
            <div className="grid gap-2">
              {group.items.map((item) => (
                <DashboardNavLink key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}

        {showTools ? (
          <div>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/35">
              Preparation
            </p>

            <details
              className="rounded-2xl border border-pine/10 bg-mint/35 p-2"
              open={toolsActive}
            >
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-sm font-bold [&::-webkit-details-marker]:hidden",
                  toolsActive ? "text-pine" : "text-ink/75",
                )}
              >
                <span className="flex items-center gap-2">
                  <Wrench size={16} aria-hidden />
                  Tools and preparation
                </span>
                <ChevronDown size={16} aria-hidden />
              </summary>

              <div className="mt-2 grid gap-2">
                {preparationTools.map((item) => (
                  <DashboardNavLink
                    key={item.href}
                    compact
                    item={item}
                    onNavigate={item.disabled ? undefined : onNavigate}
                  />
                ))}

                <DashboardNavLink
                  compact
                  item={{
                    label: "Guides",
                    href: "/blog",
                    icon: BookOpenCheck,
                  }}
                  onNavigate={onNavigate}
                />
              </div>
            </details>
          </div>
        ) : null}
      </nav>

      <div className="mt-5 space-y-3 rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine dark:text-mint">Account</p>
        <ThemeToggle />
        <DashboardLogoutButton />
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-pine/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/30 dark:text-mint">
          {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </span>
        {isDark ? "Light theme" : "Dark theme"}
      </span>
      <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45 dark:bg-white/10 dark:text-white/55">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}

function LogoutPanel() {
  return (
    <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">Account</p>
        <p className="mt-1 text-xs leading-5 text-ink/55 dark:text-white/55">Sign out when you are done.</p>
      </div>
      <DashboardLogoutButton />
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
  const navGroups = mode === "admin" ? adminNavGroups : studentNavGroups;
  const showTools = mode === "student";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7faf8] text-ink transition-colors dark:bg-[#08110f] dark:text-white">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-5 md:px-8 lg:grid-cols-[17rem_1fr] lg:py-6">
        <aside className="hidden lg:block">
          <div className="sticky top-5 rounded-[1.75rem] border border-pine/10 bg-white p-4 shadow-soft transition-colors dark:border-white/10 dark:bg-[#101c18]">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-pine/5 dark:hover:bg-white/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine text-white">
                <GraduationCap size={23} aria-hidden />
              </span>
              <span>
                <span className="block text-base font-bold text-ink dark:text-white">Scholars Republic</span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-pine/70">
                  Let&apos;s grow together
                </span>
              </span>
            </Link>

            <nav className="mt-4 grid gap-4" aria-label="Dashboard navigation">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/35">
                    {group.title}
                  </p>
                  <div className="grid gap-1">
                    {group.items.map((item) => (
                      <DashboardNavLink key={item.href} item={item} />
                    ))}
                  </div>
                </div>
              ))}

              {showTools ? (
                <div>
                  <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/35">
                    Preparation
                  </p>
                  <div className="grid gap-1">
                    <DesktopToolsMenu />
                    <DashboardNavLink
                      item={{
                        label: "Guides",
                        href: "/blog",
                        icon: BookOpenCheck,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </nav>

            <div className="mt-5 space-y-3 border-t border-pine/10 pt-4 dark:border-white/10">
              <ThemeToggle />
              <LogoutPanel />
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-[#101c18] lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pine text-white">
                  <GraduationCap size={21} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink dark:text-white">
                    Scholars Republic
                  </span>
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-pine/70">
                    Let&apos;s grow together
                  </span>
                </span>
              </Link>

              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-pine/10 bg-white text-ink shadow-sm transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label={mobileOpen ? "Close dashboard menu" : "Open dashboard menu"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((value) => !value)}
              >
                {mobileOpen ? <X size={19} aria-hidden /> : <Menu size={19} aria-hidden />}
              </button>
            </div>

            {mobileOpen ? (
              <MobileMenuPanel
                groups={navGroups}
                showTools={showTools}
                onNavigate={() => setMobileOpen(false)}
              />
            ) : null}
          </div>

          {!hideHeader ? (
            <section className="mb-5 rounded-[1.75rem] border border-pine/10 bg-white p-5 shadow-soft transition-colors dark:border-white/10 dark:bg-[#101c18] md:p-7">
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
