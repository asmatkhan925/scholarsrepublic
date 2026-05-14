import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms of Use | Scholars Republic",
  description:
    "Review the Scholars Republic terms for scholarship discovery, student tools, account use, AI drafting assistance, and responsibility for applications.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream/35">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">Terms of Use</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink md:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 md:text-base">
          These terms explain how Scholars Republic should be used. By using the site, you agree to
          use scholarship information and student tools responsibly.
        </p>
        <p className="mt-3 text-sm text-ink/55">Last updated: May 14, 2026</p>

        <article className="mt-10 space-y-9 text-sm leading-7 text-ink/72 md:text-base">
          <section>
            <h2 className="text-xl font-bold text-ink">Our Service</h2>
            <p className="mt-3">
              Scholars Republic provides scholarship discovery, student profile tools, saved
              opportunities, application tracking, and educational resources for scholarship
              applicants.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Scholarship Information</h2>
            <p className="mt-3">
              Scholarship details can change without notice. Users must verify deadlines,
              eligibility, benefits, required documents, and application instructions on the
              official scholarship or provider website before applying.
            </p>
            <p className="mt-3">
              Scholars Republic does not guarantee scholarship, admission, funding, visa approval,
              acceptance, or any application result.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">User Responsibilities</h2>
            <p className="mt-3">
              Users are responsible for their applications, documents, submissions, decisions, and
              communications with scholarship providers. Account users agree to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Provide accurate information.</li>
              <li>Keep passwords and account access secure.</li>
              <li>Use the site lawfully and avoid misuse, scraping, spam, or harmful activity.</li>
            </ul>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">AI Tools</h2>
            <p className="mt-3">
              AI-generated content on Scholars Republic is drafting assistance only. Users must
              review, edit, personalize, and verify all AI-assisted content before using it in an
              application. Users must ensure that final documents are accurate and do not include
              invented achievements, grades, awards, research, work experience, or personal stories.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Limitation of Liability</h2>
            <p className="mt-3">
              Scholars Republic is provided for information and student support. To the maximum
              extent permitted by law, Scholars Republic is not responsible for losses, missed
              deadlines, application decisions, provider changes, technical issues, or reliance on
              information without checking official sources.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Contact</h2>
            <p className="mt-3">
              Questions about these terms can be sent through the{" "}
              <Link href="/contact" className="font-semibold text-pine hover:text-pine/80">
                contact page
              </Link>
              .
            </p>
          </section>
        </article>
      </section>
    </main>
  );
}
