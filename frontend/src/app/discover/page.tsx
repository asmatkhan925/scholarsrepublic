import type { Metadata } from "next";
import { ArrowRight, SearchCheck } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import { discoveryLandingPages } from "@/features/discover/discoveryLandingPages";

export const metadata: Metadata = {
  title: "Popular Scholarship Searches - Scholars Republic",
  description:
    "Explore popular scholarship search pages for fully funded scholarships, scholarships without IELTS, no application fee scholarships, PhD scholarships, and master's scholarships.",
  openGraph: {
    title: "Popular Scholarship Searches - Scholars Republic",
    description:
      "Explore popular scholarship search pages for fully funded scholarships, scholarships without IELTS, no application fee scholarships, PhD scholarships, and master's scholarships.",
    type: "website",
    url: "/discover",
  },
  alternates: {
    canonical: "/discover",
  },
};

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-cream/35 text-ink transition-colors dark:bg-[#0e1012] dark:text-white">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-4xl">
          <Badge tone="mint" className="mb-4">
            <SearchCheck size={14} aria-hidden="true" />
            Discovery
          </Badge>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Popular Scholarship Searches
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/72 dark:text-white/62 md:text-lg">
            Start with common scholarship search paths and then browse matching opportunities on
            Scholars Republic.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/scholarships">Explore all scholarships</ButtonLink>
            <ButtonLink href="/guides" variant="outline">
              Explore guides
            </ButtonLink>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {discoveryLandingPages.map((page) => (
            <Card key={page.slug} className="group h-full dark:border-white/10 dark:bg-[#181b1d]">
              <CardContent className="flex h-full flex-col p-5">
                <Badge tone="neutral" className="w-fit">
                  {page.badge}
                </Badge>
                <h2 className="mt-4 text-lg font-bold leading-snug text-ink transition group-hover:text-pine dark:text-white">
                  {page.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-7 text-ink/68 dark:text-white/58">
                  {page.description}
                </p>
                <ButtonLink
                  href={`/discover/${page.slug}`}
                  variant="ghost"
                  className="mt-4 justify-start px-0"
                >
                  Open search page
                  <ArrowRight size={15} aria-hidden="true" />
                </ButtonLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
