import type { Metadata } from "next";

import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  FileText,
  GraduationCap,
  Landmark,
  MailCheck,
  MapPinned,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import { discoveryLandingPages } from "@/features/discover/discoveryLandingPages";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Scholarship Guides for Pakistani Students - Scholars Republic",
  description:
    "Read practical scholarship guides for Pakistani students, including SOP writing, CV format, study plans, professor emails, application checklists, fully funded scholarships, and scholarships without IELTS.",
  openGraph: {
    title: "Scholarship Guides for Pakistani Students - Scholars Republic",
    description:
      "Read practical scholarship guides for Pakistani students, including SOP writing, CV format, study plans, professor emails, application checklists, fully funded scholarships, and scholarships without IELTS.",
    url: "/guides",
    type: "website",
  },
  alternates: {
    canonical: "/guides",
  },
};

type Guide = {
  title: string;
  description: string;
  href: string;
  category: string;
  badge?: "Popular" | "Recommended";
  icon: typeof GraduationCap;
};

const guides: Guide[] = [
  {
    title: "Fully Funded Scholarships for Pakistani Students in 2026",
    description:
      "Where to search, what to prepare, and how to verify fully funded scholarship opportunities.",
    href: "/guides/fully-funded-scholarships-for-pakistani-students-2026",
    category: "Scholarship Search",
    badge: "Popular",
    icon: GraduationCap,
  },
  {
    title: "Scholarships Without IELTS for Pakistani Students",
    description:
      "Understand accepted alternatives, official requirements, risks, and documents for no-IELTS options.",
    href: "/guides/scholarships-without-ielts-for-pakistani-students",
    category: "Scholarship Search",
    badge: "Popular",
    icon: ShieldCheck,
  },
  {
    title: "Scholarship Application Checklist for Pakistani Students",
    description:
      "A practical checklist for eligibility, documents, deadlines, submission review, and common mistakes.",
    href: "/guides/scholarship-application-checklist",
    category: "Application Planning",
    badge: "Recommended",
    icon: CalendarCheck,
  },
  {
    title: "China Scholarships for Pakistani Students",
    description:
      "CSC, HEC routes, university scholarships, documents, application steps, and planning tips.",
    href: "/guides/china-scholarships-for-pakistani-students",
    category: "Country Guides",
    icon: MapPinned,
  },
  {
    title: "DAAD Scholarships for Pakistani Students",
    description:
      "Scholarship types, eligibility, documents, language requirements, EPOS, and research grants.",
    href: "/guides/daad-scholarships-for-pakistani-students",
    category: "Country Guides",
    icon: Landmark,
  },
  {
    title: "Türkiye Burslari Guide for Pakistani Students",
    description:
      "Eligibility, benefits, documents, application steps, interview preparation, and common mistakes.",
    href: "/guides/turkiye-burslari-guide-for-pakistani-students",
    category: "Country Guides",
    icon: Landmark,
  },
  {
    title: "How to Write SOP for Scholarship",
    description:
      "Structure a clear statement of purpose with stronger motivation, goals, fit, and scholarship relevance.",
    href: "/guides/how-to-write-sop-for-scholarship",
    category: "Application Documents",
    badge: "Recommended",
    icon: FileText,
  },
  {
    title: "How to Write Study Plan for Scholarship",
    description:
      "Build a focused study plan for master's, PhD, exchange, and research-based applications.",
    href: "/guides/how-to-write-study-plan-for-scholarship",
    category: "Application Documents",
    icon: BookOpenCheck,
  },
  {
    title: "Scholarship CV Format for Pakistani Students",
    description:
      "Improve CV structure, sections, academic clarity, achievements, skills, and scholarship relevance.",
    href: "/guides/scholarship-cv-format-for-pakistani-students",
    category: "Application Documents",
    badge: "Recommended",
    icon: FileText,
  },
  {
    title: "How to Email a Professor for Research Supervision",
    description:
      "Write concise emails for supervisors, labs, and research groups with better subject lines and attachments.",
    href: "/guides/how-to-email-professor-for-research-supervision",
    category: "Research Supervision",
    icon: MailCheck,
  },
];

const categories = [
  {
    title: "Scholarship Search",
    description:
      "Start with search strategy, funding fit, no-IELTS options, and application readiness.",
    items: [
      "/guides/fully-funded-scholarships-for-pakistani-students-2026",
      "/guides/scholarships-without-ielts-for-pakistani-students",
      "/guides/scholarship-application-checklist",
    ],
  },
  {
    title: "Country Guides",
    description:
      "Plan around country-specific routes, documents, funding systems, and provider rules.",
    items: [
      "/guides/china-scholarships-for-pakistani-students",
      "/guides/daad-scholarships-for-pakistani-students",
      "/guides/turkiye-burslari-guide-for-pakistani-students",
    ],
  },
  {
    title: "Application Documents",
    description: "Prepare stronger SOPs, study plans, CVs, and supporting documents.",
    items: [
      "/guides/how-to-write-sop-for-scholarship",
      "/guides/how-to-write-study-plan-for-scholarship",
      "/guides/scholarship-cv-format-for-pakistani-students",
    ],
  },
  {
    title: "Research Supervision",
    description: "Contact supervisors and research groups with concise, respectful emails.",
    items: ["/guides/how-to-email-professor-for-research-supervision"],
  },
  {
    title: "Application Planning",
    description: "Use deadlines, document lists, and review steps to avoid last-minute mistakes.",
    items: ["/guides/scholarship-application-checklist"],
  },
];

const featuredGuideHrefs = [
  "/guides/scholarship-application-checklist",
  "/guides/how-to-write-sop-for-scholarship",
  "/guides/scholarship-cv-format-for-pakistani-students",
];

const intentCards = [
  {
    title: "Finding scholarships",
    description:
      "Search active opportunities and read guides for fully funded and no-IELTS options.",
    href: "/scholarships",
    linkLabel: "Browse scholarships",
    icon: SearchCheck,
  },
  {
    title: "Preparing documents",
    description: "Use SOP, CV, and study plan guides before submitting applications.",
    href: "/guides/how-to-write-sop-for-scholarship",
    linkLabel: "Start with SOP guide",
    icon: FileText,
  },
  {
    title: "Applying before deadline",
    description: "Review required documents, eligibility, deadlines, and final submission checks.",
    href: "/guides/scholarship-application-checklist",
    linkLabel: "Open checklist",
    icon: CalendarCheck,
  },
  {
    title: "Contacting professors",
    description: "Write clearer emails for research supervision, labs, and graduate programs.",
    href: "/guides/how-to-email-professor-for-research-supervision",
    linkLabel: "Read email guide",
    icon: MailCheck,
  },
];

const popularSearchPages = discoveryLandingPages.map((page) => ({
  title: page.title,
  href: `/discover/${page.slug}`,
}));

function getGuide(href: string) {
  return guides.find((guide) => guide.href === href);
}

function GuideCard({ guide }: { guide: Guide }) {
  const Icon = guide.icon;

  return (
    <Card className="group h-full dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine dark:bg-pine/15">
            <Icon size={20} aria-hidden="true" />
          </span>
          {guide.badge ? <Badge tone="saffron">{guide.badge}</Badge> : null}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-pine">
          {guide.category}
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug text-ink transition group-hover:text-pine dark:text-white">
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
  );
}

export default function GuidesPage() {
  const featuredGuides = featuredGuideHrefs
    .map(getGuide)
    .filter((guide): guide is Guide => Boolean(guide));

  return (
    <>
      <JsonLd
        data={[
          createWebPageJsonLd({
            name: "Scholarship Guides for Pakistani Students",
            description:
              "Read practical scholarship guides for Pakistani students, including SOP writing, CV format, study plans, professor emails, application checklists, fully funded scholarships, and scholarships without IELTS.",
            path: "/guides",
            type: "CollectionPage",
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
          ]),
        ]}
      />
      <main className="min-h-screen bg-cream/35 text-ink transition-colors dark:bg-[#0e1012] dark:text-white">
        <SiteHeader />

        <section className="border-b border-pine/10 bg-white dark:border-white/10 dark:bg-[#101214]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                Scholarship guide hub
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
                Scholarship Guides for Pakistani Students
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-ink/72 dark:text-white/62 md:text-lg">
                Find practical guides for scholarship search, SOP writing, CV preparation, study
                plans, professor emails, application checklists, and country-specific scholarship
                planning.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/scholarships">Explore Scholarships</ButtonLink>
                <ButtonLink href="/guides/scholarship-application-checklist" variant="outline">
                  Start Application Checklist
                </ButtonLink>
              </div>
            </div>

            <Card className="border-pine/15 bg-mint/35 dark:border-pine/20 dark:bg-pine/10">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-ink dark:text-white">
                  Use guides with action
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink/70 dark:text-white/60">
                  Read the guide, check the official source, save serious opportunities, and track
                  your application steps before deadlines.
                </p>
                <p className="mt-4 rounded-2xl border border-pine/15 bg-white p-3 text-xs font-semibold leading-6 text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
                  Always confirm deadlines, eligibility, funding coverage, and application
                  requirements on the official scholarship provider website before applying.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Start here</p>
              <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">Featured guides</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-ink/62 dark:text-white/52">
              These guides help students organize documents, improve writing, and avoid common
              application mistakes.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featuredGuides.map((guide) => (
              <GuideCard key={guide.href} guide={guide} />
            ))}
          </div>
        </section>

        <section className="border-y border-pine/10 bg-white py-12 dark:border-white/10 dark:bg-[#151719]">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Choose a path</p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              What do you need help with?
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {intentCards.map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.title} className="dark:border-white/10 dark:bg-[#181b1d]">
                    <CardContent className="p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-pine dark:bg-pine/15">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-ink dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-ink/68 dark:text-white/58">
                        {item.description}
                      </p>
                      <ButtonLink
                        href={item.href}
                        variant="ghost"
                        className="mt-4 justify-start px-0"
                      >
                        {item.linkLabel}
                      </ButtonLink>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="grid gap-8">
            {categories.map((category) => {
              const categoryGuides = category.items
                .map(getGuide)
                .filter((guide): guide is Guide => Boolean(guide));

              return (
                <section key={category.title}>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-ink dark:text-white">
                      {category.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/62 dark:text-white/52">
                      {category.description}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {categoryGuides.map((guide) => (
                      <GuideCard key={`${category.title}-${guide.href}`} guide={guide} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="border-y border-pine/10 bg-white py-10 dark:border-white/10 dark:bg-[#151719]">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                  Popular searches
                </p>
                <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
                  Popular scholarship searches
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-ink/62 dark:text-white/52">
                Start from common scholarship search paths, then use filters to refine opportunities
                by country, degree level, funding, and application requirements.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {popularSearchPages.map((page) => (
                <ButtonLink
                  key={page.href}
                  href={page.href}
                  variant="outline"
                  className="h-auto justify-between rounded-2xl px-4 py-3 text-left"
                >
                  <span>{page.title}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </ButtonLink>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8 md:pb-16">
          <div className="rounded-3xl border border-pine/15 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#181b1d] md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Next step</p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              Ready to move from reading to applying?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/68 dark:text-white/58 md:text-base">
              Use Scholars Republic to search scholarships, save serious opportunities, track
              deadlines, and prepare stronger applications.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/scholarships">Browse Scholarships</ButtonLink>
              <ButtonLink href="/register" variant="outline">
                Create Student Profile
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                Contact Scholars Republic
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
