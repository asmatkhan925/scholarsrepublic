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
          <section className="mb-5 rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-soft transition-colors dark:border-white/10 dark:bg-[#101c18] md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
              {mode === "admin" ? "Admin dashboard" : "Student dashboard"}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink dark:text-white md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/58">
              {description}
            </p>
          </section>
        ) : null}

        {children}
      </main>
    </div>
  );
}
