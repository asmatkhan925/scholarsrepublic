import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Disclaimer | Scholars Republic",
  description:
    "Read the Scholars Republic disclaimer about scholarship information, official source verification, provider affiliation, guarantees, and AI/content tools.",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-cream/35">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">Disclaimer</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink md:text-4xl">
          Disclaimer
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 md:text-base">
          Scholars Republic publishes scholarship information and student resources to help
          applicants research opportunities more efficiently. This page explains important limits.
        </p>

        <article className="mt-10 space-y-9 text-sm leading-7 text-ink/72 md:text-base">
          <section>
            <h2 className="text-xl font-bold text-ink">Scholarship Details May Change</h2>
            <p className="mt-3">
              Deadlines, eligibility rules, benefits, required documents, application methods, and
              provider policies may change after information is published or updated on Scholars
              Republic.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Verify Official Sources</h2>
            <p className="mt-3">
              Always verify the deadline, eligibility, benefits, application requirements, and
              submission process on the official scholarship or provider website before applying.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">No Provider Affiliation</h2>
            <p className="mt-3">
              Scholars Republic is not affiliated with universities, governments, scholarship
              providers, or funding organizations unless that relationship is clearly stated.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">No Guarantee</h2>
            <p className="mt-3">
              Scholars Republic does not guarantee scholarship awards, admission, funding, visa
              approval, acceptance, interview calls, or any other application outcome.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">AI and Content Tools</h2>
            <p className="mt-3">
              AI tools, guides, and other content on Scholars Republic are educational and drafting
              support only. They are not official scholarship, university, legal, immigration, or
              financial advice. Students should review and verify all final application materials.
            </p>
          </section>
        </article>
      </section>
    </main>
  );
}
