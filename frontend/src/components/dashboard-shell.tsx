"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

import {
  BookOpenCheck,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  Wrench,
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
}: {
  item: DashboardNavItem;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = isActiveLink(pathname, item);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink/35",
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

function MobileDashboardNav({
  groups,
  showTools,
}: {
  groups: DashboardNavGroup[];
  showTools: boolean;
}) {
  const pathname = usePathname();
  const toolsActive = isToolSectionActive(pathname);

  return (
    <div className="lg:hidden">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
        {groups.flatMap((group) =>
          group.items.map((item) => {
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
              </Link>
            );
          }),
        )}

        {showTools ? (
          <Link
            href="/dashboard/ai/sop"
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition",
              toolsActive
                ? "border-pine/20 bg-mint text-pine"
                : "border-pine/10 bg-white text-ink/65 hover:bg-pine/5 hover:text-ink",
            )}
          >
            <Wrench size={16} aria-hidden />
            Tools
            <span className="rounded-full bg-saffron px-1.5 py-0.5 text-[10px] font-bold text-ink">
              AI
            </span>
          </Link>
        ) : null}
      </div>

      {showTools ? (
        <details className="rounded-2xl border border-pine/10 bg-mint/35 p-2">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-pine [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Wrench size={16} aria-hidden />
              Tools and preparation
            </span>
            <ChevronDown size={16} aria-hidden />
          </summary>

          <div className="mt-2 grid gap-2">
            {preparationTools.map((item) => (
              <DashboardNavLink key={item.href} compact item={item} />
            ))}

            <DashboardNavLink
              compact
              item={{
                label: "Guides",
                href: "/blog",
                icon: BookOpenCheck,
              }}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function LogoutPanel() {
  return (
    <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-3">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">Account</p>
        <p className="mt-1 text-xs leading-5 text-ink/55">Sign out when you are done.</p>
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

            <div className="mt-5 border-t border-pine/10 pt-4">
              <LogoutPanel />
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

              <div className="shrink-0">
                <DashboardLogoutButton />
              </div>
            </div>

            <MobileDashboardNav groups={navGroups} showTools={showTools} />
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
