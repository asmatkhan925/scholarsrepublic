import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { GuideArticleJsonLd } from "@/components/seo/GuideArticleJsonLd";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "China Scholarships for Pakistani Students | Scholars Republic",
  description:
    "A practical guide to China scholarships for Pakistani students, including CSC, HEC route, university scholarships, documents, application steps, and tips for 2026 applicants.",
};

const scholarshipTypes = [
  {
    title: "Chinese Government Scholarship through HEC",
    body: "This is one of the most important official routes for Pakistani students. Applicants usually need to follow HEC instructions and also complete the Chinese scholarship system requirements.",
  },
  {
    title: "Chinese University Scholarships",
    body: "Many Chinese universities offer their own scholarships for international students. These may be full or partial scholarships depending on the university, degree level, and program.",
  },
  {
    title: "Provincial and municipal scholarships",
    body: "Some Chinese provinces and cities offer scholarships through selected universities. These can be useful alternatives if a student misses the main CSC route.",
  },
  {
    title: "Research or supervisor-supported opportunities",
    body: "For MS and PhD applicants, a strong research profile and professor communication can help. Some programs prefer applicants who already have research alignment or pre-admission support.",
  },
];

const documents = [
  "Valid passport",
  "Academic transcripts and degrees",
  "Scholarship CV",
  "Study plan or research proposal",
  "Statement of Purpose or motivation letter",
  "Recommendation letters",
  "English or Chinese language proof where required",
  "Physical examination form if required",
  "Police clearance certificate if required",
  "Pre-admission or supervisor acceptance if required",
];

const steps = [
  {
    title: "Start from official scholarship information",
    body: "Use official sources such as HEC, Campus China, and university websites. Avoid relying only on WhatsApp posts, YouTube comments, or unofficial agents.",
    href: "/scholarships",
    linkText: "Search scholarships",
  },
  {
    title: "Choose the right route",
    body: "Understand whether you are applying through the HEC/CSC route, directly through a university, or through another university-specific scholarship.",
    href: "/guides",
    linkText: "Read guides",
  },
  {
    title: "Shortlist realistic universities",
    body: "Do not select universities only because they are famous. Check program availability, language of instruction, supervisor fit, city, ranking, and admission requirements.",
    href: "/dashboard/profile",
    linkText: "Complete profile",
  },
  {
    title: "Prepare documents early",
    body: "China scholarship applications often require multiple documents. Prepare your CV, study plan, SOP, recommendation letters, passport, and academic records before the deadline period.",
    href: "/guides/scholarship-application-checklist",
    linkText: "Application checklist",
  },
];

const commonMistakes = [
  "Applying without reading the official HEC or university instructions",
  "Confusing CSC Type A and university/direct application routes",
  "Submitting a generic study plan copied from the internet",
  "Choosing universities without checking program language",
  "Waiting too long to request recommendation letters",
  "Ignoring pre-admission or supervisor requirements where applicable",
  "Submitting inconsistent information across HEC, CSC, and university portals",
];

const recommendedProfiles = [
  "Students applying for BS, MS, or PhD programs in China",
  "Students interested in engineering, computer science, medicine, business, agriculture, or social sciences",
  "Students who can prepare documents early and follow official instructions carefully",
  "MS and PhD applicants who can write a clear study plan or research proposal",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function ChinaScholarshipsGuidePage() {
  return (
    <>
      <GuideArticleJsonLd
        title="China Scholarships for Pakistani Students"
        description={metadata.description}
        path="/guides/china-scholarships-for-pakistani-students"
        datePublished="2026-05-10"
        dateModified="2026-06-21"
      />
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                  China Scholarship Guide
                </p>

                <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                  China Scholarships for Pakistani Students
                </h1>

                <p className="mt-2 text-xs text-ink/50 dark:text-white/40">Published May 2026 · Updated June 2026</p>

                <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                  China is one of the most popular study destinations for Pakistani students because
                  it offers government scholarships, university scholarships, research
                  opportunities, and programs in many fields. This guide explains the main
                  scholarship routes and how to apply in a focused, organized way.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/scholarships"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                  >
                    <Search size={16} aria-hidden="true" />
                    Search Scholarships
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                  >
                    <UserRoundCheck size={16} aria-hidden="true" />
                    Complete Profile
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                  Best first step
                </p>
                <h2 className="mt-2 text-base font-bold text-ink">Search China opportunities</h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  Use Scholars Republic to save China-related opportunities, track deadlines, and
                  prepare your documents step by step.
                </p>
                <Link
                  href="/scholarships"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  Find China Scholarships
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="space-y-7">
            <Section title="Why China is popular among Pakistani students">
              <p>
                China has become a major destination for Pakistani students because of its growing
                universities, wide range of degree programs, strong engineering and technology
                fields, medical education options, and government-supported scholarship routes.
              </p>
              <p className="mt-4">
                For Pakistani applicants, the most important advantage is that China offers several
                scholarship pathways. However, students should not apply randomly. A successful
                application usually requires careful university selection, strong documents, and
                strict attention to official instructions.
              </p>
            </Section>

            <Section title="Main types of China scholarships">
              <div className="grid gap-4 md:grid-cols-2">
                {scholarshipTypes.map((item) => (
                  <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{item.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="CSC and HEC route: what students should understand">
              <p>
                The Chinese Government Scholarship is commonly known as CSC. For Pakistani students,
                one major route is through the Higher Education Commission of Pakistan. This route
                may have its own eligibility, testing, document, nomination, and deadline
                requirements.
              </p>
              <p className="mt-4">
                Students should carefully read both sides of the process: the HEC instructions and
                the Chinese scholarship system instructions. If the same information is required in
                more than one portal, make sure your name, degree level, university choices, and
                documents are consistent everywhere.
              </p>

              <div className="mt-5 rounded-xl border border-saffron/30 bg-saffron/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-saffron"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-6 text-ink/75">
                    Scholarship rules can change every year. Always check the latest HEC, Campus
                    China, and university pages before making a final decision.
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Who should consider applying for China scholarships?">
              <div className="grid gap-3">
                {recommendedProfiles.map((profile) => (
                  <div
                    key={profile}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-pine"
                      aria-hidden="true"
                    />
                    <span>{profile}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="How to apply in an organized way">
              <div className="grid gap-4">
                {steps.map((step, index) => (
                  <div key={step.title} className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-pine">Step {index + 1}</p>
                        <h3 className="mt-1 text-base font-bold text-ink">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-ink/70">{step.body}</p>
                      </div>

                      <Link
                        href={step.href}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-pine/20 px-4 py-2 text-sm font-semibold text-pine transition hover:bg-pine/5"
                      >
                        {step.linkText}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="documents" title="Documents usually needed for China scholarships">
              <p>
                Exact document requirements depend on the scholarship route, university, degree
                level, and program language. Still, Pakistani students should start preparing the
                following documents early:
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {documents.map((document) => (
                  <div
                    key={document}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <FileText size={17} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                    <span>{document}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Common mistakes Pakistani students should avoid">
              <div className="grid gap-3 md:grid-cols-2">
                {commonMistakes.map((mistake) => (
                  <div
                    key={mistake}
                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                  >
                    {mistake}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Useful official sources to check">
              <p>
                Before applying, use official sources to verify deadlines, degree levels,
                eligibility, language requirements, and required documents.
              </p>

              <div className="mt-4 grid gap-3">
                <a
                  href="https://www.hec.gov.pk/english/scholarshipsgrants/lao/CGSP/Pages/default.aspx"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 font-semibold text-pine hover:bg-pine/5"
                >
                  HEC Chinese Government Scholarship page
                </a>
                <a
                  href="https://www.campuschina.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 font-semibold text-pine hover:bg-pine/5"
                >
                  Campus China official portal
                </a>
              </div>
            </Section>

            <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Scholars Republic tools
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                Prepare your China scholarship application with a clear plan
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Use Scholars Republic to search scholarships, save relevant opportunities, track
                your applications, and prepare stronger SOPs, study plans, CVs, and professor
                emails.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/scholarships"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  <Search size={16} aria-hidden="true" />
                  Search Scholarships
                </Link>
                <Link
                  href="/dashboard/ai/sop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  SOP Generator
                </Link>
              </div>
            </section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">On this page</h2>
              <nav className="mt-4 grid gap-3 text-sm text-ink/70">
                <a href="#documents" className="hover:text-pine">
                  Documents
                </a>
                <Link href="/scholarships" className="hover:text-pine">
                  Search scholarships
                </Link>
                <Link href="/dashboard/profile" className="hover:text-pine">
                  Complete profile
                </Link>
                <Link href="/dashboard/saved" className="hover:text-pine">
                  Saved opportunities
                </Link>
                <Link href="/dashboard/applications" className="hover:text-pine">
                  Application tracker
                </Link>
              </nav>
            </div>

            <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Recommended first step
              </p>
              <h2 className="mt-2 text-base font-bold text-ink">Search China scholarships</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Find opportunities, save the relevant ones, and prepare documents before the
                deadline period.
              </p>
              <Link
                href="/scholarships"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Open Scholarship Search
              </Link>
            </div>

            <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Need help with documents?</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Start with your SOP and study plan. These documents often explain your academic
                direction, research goals, and future contribution.
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/guides/how-to-write-sop-for-scholarship"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <BookOpen size={16} aria-hidden="true" />
                  Read SOP Guide
                </Link>
                <Link
                  href="/dashboard/ai/sop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  Open SOP Generator
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
