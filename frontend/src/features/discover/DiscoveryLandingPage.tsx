import { ArrowRight, BookOpenCheck, CheckCircle2, SearchCheck, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";

import type { DiscoveryLandingPage as DiscoveryLandingPageData } from "./discoveryLandingPages";

type DiscoveryLandingPageProps = {
  page: DiscoveryLandingPageData;
};

export default function DiscoveryLandingPage({ page }: DiscoveryLandingPageProps) {
  return (
    <main className="min-h-screen bg-cream/35 text-ink transition-colors dark:bg-[#0e1012] dark:text-white">
      <SiteHeader />

      <section className="border-b border-pine/10 bg-white dark:border-white/10 dark:bg-[#101214]">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <div className="max-w-4xl">
            <Badge tone="mint" className="mb-4">
              <SearchCheck size={14} aria-hidden="true" />
              {page.badge}
            </Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-ink/72 dark:text-white/62 md:text-lg">
              {page.description}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={page.searchHref}>
                {page.searchLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
              {page.secondaryHref && page.secondaryLabel ? (
                <ButtonLink href={page.secondaryHref} variant="outline">
                  {page.secondaryLabel}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="dark:border-white/10 dark:bg-[#181b1d]">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Scholarship search
            </p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              Search this category on Scholars Republic
            </h2>
            <div className="mt-5 grid gap-3">
              {page.filterSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40 dark:text-white/40">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink/75 dark:text-white/70">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <ButtonLink href={page.searchHref} className="mt-5 w-full sm:w-auto">
              {page.searchLabel}
            </ButtonLink>
            <p className="mt-3 text-xs leading-5 text-ink/55 dark:text-white/45">
              This link uses the existing scholarship search filters on Scholars Republic.
            </p>
          </CardContent>
        </Card>

        <Card className="dark:border-white/10 dark:bg-[#181b1d]">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Who it helps</p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              Who this page is for
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70 dark:text-white/60 md:text-base">
              {page.intentTitle}
            </p>
            <ul className="mt-5 grid gap-3">
              {page.intentBullets.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-7 text-ink/68 dark:text-white/58"
                >
                  <CheckCircle2 size={18} className="mt-1 shrink-0 text-pine" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-pine/10 bg-white py-10 dark:border-white/10 dark:bg-[#151719]">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Related guides</p>
          <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
            Prepare before you apply
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {page.relatedGuides.map((guide) => (
              <Card
                key={guide.href}
                className="group h-full dark:border-white/10 dark:bg-[#181b1d]"
              >
                <CardContent className="flex h-full flex-col p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-pine dark:bg-pine/15">
                    <BookOpenCheck size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold leading-snug text-ink transition group-hover:text-pine dark:text-white">
                    {guide.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-ink/68 dark:text-white/58">
                    {guide.description}
                  </p>
                  <ButtonLink href={guide.href} variant="ghost" className="mt-4 justify-start px-0">
                    Read guide
                    <ArrowRight size={15} aria-hidden="true" />
                  </ButtonLink>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="rounded-3xl border border-pine/15 bg-mint/35 p-6 dark:border-pine/20 dark:bg-pine/10 md:p-8">
          <div className="flex max-w-4xl gap-3">
            <ShieldCheck size={22} className="mt-1 shrink-0 text-pine" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold text-ink dark:text-white">Trust reminder</h2>
              <p className="mt-3 text-sm leading-7 text-ink/72 dark:text-white/62 md:text-base">
                Always confirm deadlines, eligibility, funding coverage, language requirements, and
                application instructions on the official scholarship provider&apos;s website before
                applying.
              </p>
              <ButtonLink href="/verification-policy" variant="ghost" className="mt-4 px-0">
                Read verification policy
                <ArrowRight size={15} aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">FAQ</p>
        <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">Quick answers</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {page.faq.map((item) => (
            <Card key={item.question} className="dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="p-5">
                <h3 className="text-base font-bold leading-snug text-ink dark:text-white">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-ink/68 dark:text-white/58">
                  {item.answer}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8 md:pb-16">
        <div className="rounded-3xl border border-pine/15 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#181b1d] md:p-8">
          <h2 className="text-2xl font-bold text-ink dark:text-white">
            Ready to search serious opportunities?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/68 dark:text-white/58 md:text-base">
            Browse scholarships, save relevant opportunities, and use Scholars Republic guides to
            prepare stronger applications.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={page.searchHref}>Browse Scholarships</ButtonLink>
            <ButtonLink href="/guides" variant="outline">
              Explore All Guides
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
