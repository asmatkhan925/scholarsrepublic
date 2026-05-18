import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  FileText,
  GraduationCap,
  Landmark,
  Mail,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Scholarship Help Center | Scholars Republic",
  description:
    "Read practical scholarship guides for Pakistani students, including fully funded scholarships, no IELTS options, SOP writing, study plans, CVs, recommendation letters, and application checklists.",
};

const guides = [
  {
    title: "Fully Funded Scholarships for Pakistani Students in 2026",
    description:
      "A practical guide for Pakistani students looking for fully funded scholarships in 2026, including where to search, what documents to prepare, and how Scholars Republic can help.",
    href: "/guides/fully-funded-scholarships-for-pakistani-students-2026",
    category: "Scholarship Search",
    status: "Published",
    icon: GraduationCap,
  },
  {
    title: "Scholarships Without IELTS for Pakistani Students",
    description:
      "A practical guide for Pakistani students searching for scholarships without IELTS, including accepted alternatives, documents, risks, and how to verify official requirements.",
    href: "/guides/scholarships-without-ielts-for-pakistani-students",
    category: "No IELTS",
    status: "Published",
    icon: ShieldCheck,
  },
  {
    title: "China Scholarships for Pakistani Students",
    description:
      "A practical guide to China scholarships for Pakistani students, including CSC, HEC route, university scholarships, documents, application steps, and tips for 2026 applicants.",
    href: "/guides/china-scholarships-for-pakistani-students",
    category: "Country Guide",
    status: "Published",
    icon: MapPinned,
  },
  {
    title: "Türkiye Burslari Guide for Pakistani Students",
    description:
      "A practical Türkiye Burslari guide for Pakistani students, covering eligibility, benefits, documents, application steps, interview preparation, and common mistakes.",
    href: "/guides/turkiye-burslari-guide-for-pakistani-students",
    category: "Country Guide",
    status: "Published",
    icon: Landmark,
  },
  {
    title: "DAAD Scholarships for Pakistani Students",
    description:
      "A practical guide to DAAD scholarships for Pakistani students, including scholarship types, eligibility, documents, language requirements, EPOS, research grants, and application tips.",
    href: "/guides/daad-scholarships-for-pakistani-students",
    category: "Country Guide",
    status: "Published",
    icon: Landmark,
  },
  {
    title: "How to Write a Scholarship SOP",
    description:
      "A complete guide to writing a strong Statement of Purpose for scholarship applications, with structure, examples, mistakes, and checklist.",
    href: "/guides/how-to-write-sop-for-scholarship",
    category: "Documents",
    status: "Published",
    icon: FileText,
  },
  {
    title: "How to Write a Study Plan for Scholarship Applications",
    description:
      "Learn how to write a strong study plan for scholarship applications, including structure, examples, research goals, timeline, mistakes to avoid, and document tips.",
    href: "/guides/how-to-write-study-plan-for-scholarship",
    category: "Documents",
    status: "Published",
    icon: BookOpen,
  },
  {
    title: "How to Email a Professor for Research Supervision",
    description:
      "Learn how to email a professor for MS, PhD, and research supervision, including subject lines, email structure, sample email, attachments, follow-up tips, and common mistakes.",
    href: "/guides/how-to-email-professor-for-research-supervision",
    category: "Research Supervision",
    status: "Published",
    icon: Mail,
  },
  {
    title: "Scholarship CV Format for Pakistani Students",
    description:
      "Learn how to write a strong scholarship CV for Pakistani students, including format, sections, examples, common mistakes, and application tips.",
    href: "/guides/scholarship-cv-format-for-pakistani-students",
    category: "Documents",
    status: "Published",
    icon: FileText,
  },
  {
    title: "Scholarship Application Checklist",
    description:
      "A complete scholarship application checklist for Pakistani students, including eligibility, documents, deadlines, SOP, CV, recommendations, submission review, and common mistakes.",
    href: "/guides/scholarship-application-checklist",
    category: "Application Planning",
    status: "Published",
    icon: CalendarCheck,
  },
];

const quickLinks = [
  {
    title: "Search Scholarships",
    description: "Find scholarship opportunities and shortlist programs.",
    href: "/scholarships",
    icon: Search,
  },
  {
    title: "Complete Your Profile",
    description: "Improve recommendations by adding your academic details.",
    href: "/dashboard/profile",
    icon: GraduationCap,
  },
  {
    title: "AI SOP Generator",
    description: "Create a first SOP draft and then personalize it.",
    href: "/dashboard/ai/sop",
    icon: Sparkles,
  },
];

const categories = [
  "Scholarship Search",
  "Country Guides",
  "No IELTS",
  "Documents",
  "Research Supervision",
  "Application Planning",
];

export default function BlogPage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-cream/40 transition-colors dark:bg-[#0e1012]">
      <section className="border-b border-ink/10 bg-white transition-colors dark:border-white/10 dark:bg-[#101214]">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                Scholarship Help Center
              </p>

              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-ink dark:text-white md:text-4xl">
                Practical guides for finding scholarships and preparing stronger applications
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 dark:text-white/60 md:text-base">
                Explore clear, student-focused guides on fully funded scholarships, no IELTS
                options, country-specific programs, application documents, professor emails, CVs,
                SOPs, and scholarship planning.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-ink/10 bg-cream/60 px-3 py-1 text-xs font-semibold text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft dark:border-pine/20 dark:bg-pine/10">
              <h2 className="text-base font-bold text-ink dark:text-white">Build your scholarship plan</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/60">
                Start by searching opportunities, completing your profile, and reading the document
                guides before submitting applications.
              </p>

              <Link
                href="/scholarships"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Search Scholarships
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-7">
          <section>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Guides Library
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink dark:text-white">
                Scholarship articles and application resources
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                We are building this section step by step. Published guides are available now;
                planned guides will be expanded into full articles.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {guides.map((guide) => {
                const Icon = guide.icon;

                return (
                  <Link
                    key={guide.href}
                    href={guide.href}
                    className="group rounded-2xl border border-ink/10 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-pine/30 dark:border-white/10 dark:bg-[#181b1d] dark:hover:border-pine/35 dark:hover:bg-white/5"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pine/10 text-pine">
                        <Icon size={21} aria-hidden="true" />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink/55 dark:bg-white/5 dark:text-white/50">
                            {guide.category}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              guide.status === "Published"
                                ? "bg-pine/10 text-pine"
                                : "bg-saffron/15 text-ink/60"
                            }`}
                          >
                            {guide.status}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold leading-snug text-ink group-hover:text-pine dark:text-white dark:group-hover:text-pine">
                          {guide.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-ink/68 dark:text-white/58">{guide.description}</p>

                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-pine">
                          {guide.status === "Published" ? "Read guide" : "Preview outline"}
                          <ArrowRight
                            size={15}
                            className="transition group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
            <h2 className="text-base font-bold text-ink dark:text-white">Quick actions</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/58">
              Use these tools while preparing your scholarship application.
            </p>

            <div className="mt-5 grid gap-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-xl border border-ink/10 bg-white p-4 transition hover:border-pine/30 hover:bg-pine/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-pine/35 dark:hover:bg-pine/10"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine/10 text-pine">
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-ink group-hover:text-pine dark:text-white dark:group-hover:text-pine">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-ink/60 dark:text-white/55">
                          {item.description}
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft dark:border-saffron/25 dark:bg-saffron/10">
            <h2 className="text-base font-bold text-ink dark:text-white">Suggested reading order</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink/70 dark:text-white/60">
              <li>Search for suitable scholarships.</li>
              <li>Check IELTS or no-IELTS requirements.</li>
              <li>Prepare your CV and documents.</li>
              <li>Write SOP, study plan, and emails.</li>
              <li>Review everything before submission.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
            <h2 className="text-base font-bold text-ink dark:text-white">New to Scholars Republic?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/60">
              Create a free student profile to save opportunities, track applications, and use
              scholarship writing tools.
            </p>

            <Link
              href="/register"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Create Free Profile
            </Link>
          </div>
        </aside>
      </section>
      </main>
    </>
  );
}
