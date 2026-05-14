import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

type LegalPageShellProps = {
  label: string;
  title: string;
  intro: ReactNode;
  updated?: string;
  children: ReactNode;
};

export function LegalPageShell({ label, title, intro, updated, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-cream/35">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">{label}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink md:text-4xl">{title}</h1>
        <div className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 md:text-base">{intro}</div>
        {updated ? <p className="mt-3 text-sm font-medium text-ink/55">{updated}</p> : null}

        <article className="mt-10 grid gap-5">{children}</article>
      </section>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-pine/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-ink/72 md:text-base">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalContactBox({
  title = "Questions?",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-pine/20 bg-mint/35 p-5 shadow-soft md:p-6">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-2 text-sm leading-7 text-ink/70 md:text-base">
        {children ?? (
          <p>
            Contact Scholars Republic through the{" "}
            <Link href="/contact" className="font-semibold text-pine hover:text-pine/80">
              contact page
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
