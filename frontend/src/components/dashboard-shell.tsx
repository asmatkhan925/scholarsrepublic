"use client";

import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

type DashboardShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  mode?: "student" | "admin";
  hideHeader?: boolean;
};

export function DashboardShell({
  title,
  description,
  children,
  mode = "student",
  hideHeader = false,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#f7faf8] text-ink transition-colors dark:bg-[#08110f] dark:text-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-5 md:px-8 md:py-6">
        {!hideHeader ? (
          <section className="mb-4 rounded-[1.25rem] border border-pine/10 bg-white px-4 py-3 shadow-sm transition-colors dark:border-white/10 dark:bg-[#101c18] md:px-5 md:py-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">
                  {mode === "admin" ? "Admin dashboard" : "Student dashboard"}
                </p>
                <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
                  {title}
                </h1>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-ink/60 dark:text-white/55 md:text-right">
                {description}
              </p>
            </div>
          </section>
        ) : null}

        {children}
      </main>
    </div>
  );
}
