import Link from "next/link";
import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

import { DashboardLogoutButton } from "@/components/dashboard-logout-button";

type DashboardShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  mode?: "student" | "admin";
};

export function DashboardShell({
  title,
  description,
  children,
  mode = "student",
}: DashboardShellProps) {
  const navItems =
    mode === "admin"
      ? [
          { label: "Scholarships", href: "/admin" },
          { label: "Users", href: "/admin" },
          { label: "Service Requests", href: "/admin" },
          { label: "Blog", href: "/admin" },
        ]
      : [
          { label: "Profile", href: "/dashboard/profile" },
          { label: "Recommendations", href: "/dashboard" },
          { label: "Saved", href: "/dashboard" },
          { label: "Applications", href: "/dashboard" },
          { label: "Documents", href: "/dashboard" },
        ];

  return (
    <div className="min-h-screen bg-skyglass">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-ink/10 bg-white p-4 lg:border-b-0 lg:border-r">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-pine text-white">
              <GraduationCap size={20} aria-hidden="true" />
            </span>
            Scholars Republic
          </Link>
          <nav className="mt-8 grid gap-1 text-sm font-medium text-ink/75">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded px-3 py-2 hover:bg-mint"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <DashboardLogoutButton />
        </aside>
        <main className="p-4 sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-pine">
              {mode === "admin" ? "Admin" : "Student"} dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
            <p className="mt-2 max-w-2xl text-ink/70">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
