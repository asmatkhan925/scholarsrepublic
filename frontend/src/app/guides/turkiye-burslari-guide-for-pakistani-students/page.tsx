import Link from "next/link";

import {
  SiteHeader } from "@/components/site-header";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Landmark,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "Türkiye Burslari Guide for Pakistani Students | Scholars Republic",
  description:
    "A practical Türkiye Burslari guide for Pakistani students, covering eligibility, benefits, documents, application steps, interview preparation, and common mistakes.",
};

const scholarshipBenefits = [
  {
    title: "University placement",
    body: "Türkiye Scholarships is not only financial support. It also includes placement into eligible Turkish universities and programs through the scholarship process.",
  },
  {
    title: "Tuition support",
    body: "The scholarship generally supports tuition costs for selected students, depending on the scholarship type and program level.",
  },
  {
    title: "Monthly stipend",
    body: "Selected students usually receive a monthly allowance. The amount may vary by degree level and official scholarship rules.",
  },
  {
    title: "Accommodation and health support",
    body: "The scholarship may include accommodation and health insurance support according to official program rules.",
  },
];

const applicantLevels = [
  "Undergraduate applicants",
  "Master's applicants",
  "PhD applicants",
  "Research-focused applicants",
  "Students applying in social sciences, engineering, health sciences, arts, business, and other eligible fields",
];

const documents = [
  "Valid passport or national identity document",
  "Recent photograph",
  "Academic transcripts",
  "Degree certificate or expected graduation certificate",
  "National or international exam results if required",
  "Language test result if required by the selected program",
  "Statement of Purpose, letter of intent, or motivation answers",
  "Recommendation letters if requested",
  "Research proposal or written academic work for research-based applications if required",
  "Certificates, awards, publications, or activities if available",
];

const applicationSteps = [
  {
    title: "Create an account on the official Türkiye Scholarships system",
    body: "Applications should be submitted through the official Türkiye Scholarships online system. Do not pay agents or share your login details with others.",
    href: "/scholarships",
    linkText: "Search scholarships",
  },
  {
    title: "Complete your personal and academic information carefully",
    body: "Enter your education history, grades, documents, activities, and program preferences correctly. Inconsistent information can weaken your application.",
    href: "/dashboard/profile",
    linkText: "Complete profile",
  },
  {
    title: "Choose programs that match your background",
    body: "Select programs that fit your previous education, academic performance, language ability, and future goals. Do not choose only famous universities.",
    href: "/guides",
    linkText: "Read guides",
  },
  {
    title: "Write focused motivation answers",
    body: "Türkiye Burslari applications often depend strongly on written answers. Explain your academic direction, leadership, goals, and why Türkiye fits your plan.",
    href: "/guides/how-to-write-sop-for-scholarship",
    linkText: "Read SOP guide",
  },
];

const interviewTips = [
  "Know your selected field and why you chose it",
  "Be ready to explain why you want to study in Türkiye",
  "Understand your future goals clearly",
  "Review your application before the interview",
  "Speak honestly and avoid memorized fake answers",
  "Prepare examples from your academic and personal background",
];

const mistakes = [
  "Applying on the last day and facing portal or upload issues",
  "Choosing programs without checking language and eligibility",
  "Writing generic motivation answers copied from the internet",
  "Uploading unclear or incomplete documents",
  "Ignoring the interview stage",
  "Depending on agents instead of official instructions",
  "Using exaggerated achievements that cannot be supported",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function TurkiyeBurslariGuidePage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                Türkiye Burslari Guide
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                Türkiye Burslari Guide for Pakistani Students
              </h1>

              <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                Türkiye Burslari is one of the most popular government-funded scholarship programs
                for international students. For Pakistani students, it can be a strong option
                because it supports multiple degree levels and many fields. This guide explains how
                to prepare a focused application without overwhelming yourself.
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
              <h2 className="mt-2 text-base font-bold text-ink">Build your application plan</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Use Scholars Republic to organize your scholarship search, prepare your documents,
                and track your application steps.
              </p>
              <Link
                href="/scholarships"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Find Scholarships
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-7">
          <Section title="What is Türkiye Burslari?">
            <p>
              Türkiye Burslari, also known as Türkiye Scholarships, is a government-funded
              scholarship program for international students who want to study in Türkiye. It
              supports full-time degree programs and some short-term or special programs depending
              on the official call.
            </p>
            <p className="mt-4">
              Unlike many scholarships that only provide funding, Türkiye Burslari is known for
              combining scholarship support with university placement. This makes it attractive, but
              also competitive.
            </p>
          </Section>

          <Section title="What does the scholarship usually cover?">
            <div className="grid gap-4 md:grid-cols-2">
              {scholarshipBenefits.map((item) => (
                <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-saffron/30 bg-saffron/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-saffron"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-ink/75">
                  Benefits and amounts can change. Always verify the current scholarship benefits
                  from the official Türkiye Scholarships website before applying.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Who should apply?">
            <p>
              Türkiye Burslari can be a good option for Pakistani students who have a clear academic
              goal, strong documents, and enough time to prepare a careful application.
            </p>

            <div className="mt-4 grid gap-3">
              {applicantLevels.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Application timeline for 2026">
            <p>
              For 2026, Türkiye Scholarships announced one main application period from 10 January
              to 20 February 2026. Students should still check the official website because dates
              and program calls can change.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                <CalendarCheck size={22} className="text-pine" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-ink">Before applications open</h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Prepare documents, update your CV, write draft answers, and review program
                  options.
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                <FileText size={22} className="text-pine" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-ink">During application period</h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Complete the online application carefully and submit before the deadline, not in
                  the final hours.
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                <Landmark size={22} className="text-pine" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-ink">After submission</h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Watch your email and portal status. If shortlisted, prepare for the interview
                  stage.
                </p>
              </div>
            </div>
          </Section>

          <Section title="How to apply in an organized way">
            <div className="grid gap-4">
              {applicationSteps.map((step, index) => (
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

          <Section id="documents" title="Documents usually needed">
            <p>
              Exact document requirements depend on your selected degree level, program, and
              official application rules. Still, Pakistani students should prepare the following
              items early:
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

          <Section title="Interview preparation tips">
            <p>
              Shortlisted applicants may be invited for an interview. The interview is your chance
              to show that your application is real, focused, and consistent.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {interviewTips.map((tip) => (
                <div
                  key={tip}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Common mistakes Pakistani students should avoid">
            <div className="grid gap-3 md:grid-cols-2">
              {mistakes.map((mistake) => (
                <div key={mistake} className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  {mistake}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Useful official sources to check">
            <p>
              Always verify application dates, eligible countries, age limits, degree levels, and
              program rules from the official Türkiye Scholarships website before applying.
            </p>

            <div className="mt-4 grid gap-3">
              <a
                href="https://www.turkiyeburslari.gov.tr/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 font-semibold text-pine hover:bg-pine/5"
              >
                Türkiye Scholarships official website
              </a>
              <a
                href="https://www.turkiyeburslari.gov.tr/announcements/turkiye-scholarships-2026-applications-121"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 font-semibold text-pine hover:bg-pine/5"
              >
                Türkiye Scholarships 2026 announcement
              </a>
            </div>
          </Section>

          <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Scholars Republic tools
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Prepare your Türkiye Burslari application with a clear plan
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use Scholars Republic to search scholarships, save relevant opportunities, track
              applications, and prepare stronger SOPs, study plans, CVs, and motivation answers.
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
            <h2 className="mt-2 text-base font-bold text-ink">Search scholarships now</h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Find opportunities, save relevant ones, and prepare your documents before the deadline
              period.
            </p>
            <Link
              href="/scholarships"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              Open Scholarship Search
            </Link>
          </div>

          <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">Need help with motivation answers?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Start with a clear SOP-style draft, then adapt it to Türkiye Burslari application
              questions.
            </p>
            <div className="mt-4 grid gap-2">
              <Link
                href="/guides/how-to-write-sop-for-scholarship"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
              >
                <BookOpen size={16} aria-hidden="true" />
                Read SOP Guide
              </Link>
              <Link
                href="/dashboard/ai/sop"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 dark:bg-pine dark:text-[#0e1012] dark:hover:bg-pine/90"
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
