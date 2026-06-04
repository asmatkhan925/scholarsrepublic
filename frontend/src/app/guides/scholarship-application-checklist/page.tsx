import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { GuideArticleJsonLd } from "@/components/seo/GuideArticleJsonLd";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "Scholarship Application Checklist for Pakistani Students | Scholars Republic",
  description:
    "A complete scholarship application checklist for Pakistani students, including eligibility, documents, deadlines, SOP, CV, recommendations, submission review, and common mistakes.",
};

const eligibilityChecklist = [
  "Nationality requirement matches Pakistani applicants",
  "Degree level matches your target program",
  "Previous degree field is accepted",
  "Minimum CGPA, percentage, or grade requirement is met",
  "Age limit is checked if applicable",
  "Language requirement is understood",
  "Work experience requirement is checked if applicable",
  "Deadline and application route are confirmed from the official source",
];

const documentChecklist = [
  "Passport or national identity document",
  "Academic transcripts",
  "Degree certificate or hope certificate",
  "Scholarship CV",
  "Statement of Purpose or motivation letter",
  "Study plan or research proposal",
  "Recommendation letters",
  "Language proof such as IELTS, TOEFL, HSK, German certificate, or English proficiency certificate if accepted",
  "Experience certificate if required",
  "Publications, awards, or certificates if relevant",
];

const writingChecklist = [
  {
    title: "Statement of Purpose",
    body: "Your SOP should explain your background, motivation, target field, program fit, scholarship fit, and future goals.",
    href: "/guides/how-to-write-sop-for-scholarship",
    linkText: "Read SOP guide",
  },
  {
    title: "Study Plan",
    body: "Your study plan should explain what you will study, how you will organize your learning, and how it supports your future goals.",
    href: "/guides/how-to-write-study-plan-for-scholarship",
    linkText: "Read study plan guide",
  },
  {
    title: "Scholarship CV",
    body: "Your CV should highlight education, projects, research, skills, achievements, and leadership in a clean academic format.",
    href: "/guides/scholarship-cv-format-for-pakistani-students",
    linkText: "Read CV guide",
  },
  {
    title: "Professor Email",
    body: "For research-based programs, your professor email should be short, specific, respectful, and connected to the professor research area.",
    href: "/guides/how-to-email-professor-for-research-supervision",
    linkText: "Read email guide",
  },
];

const timelineSteps = [
  {
    title: "3 to 6 months before deadline",
    body: "Search scholarships, check eligibility, prepare passport, request transcripts, shortlist universities, and plan language tests if needed.",
  },
  {
    title: "1 to 2 months before deadline",
    body: "Finalize SOP, CV, study plan, recommendation letters, professor emails, and official application forms.",
  },
  {
    title: "2 weeks before deadline",
    body: "Review document names, file formats, portal requirements, signatures, stamps, and consistency across all forms.",
  },
  {
    title: "Final 48 hours",
    body: "Submit early, save confirmation screenshots or emails, and avoid last-minute uploads whenever possible.",
  },
];

const finalReview = [
  "My name is written consistently across all documents",
  "Dates and degree titles are consistent",
  "All PDFs open correctly",
  "Scans are clear and readable",
  "File names are professional",
  "Recommendation letters are signed if required",
  "The SOP is specific to this scholarship",
  "The CV is updated and formatted clearly",
  "The application portal shows all required sections complete",
  "I saved proof of submission",
];

const mistakes = [
  "Applying without checking official eligibility",
  "Submitting the same SOP to every scholarship",
  "Waiting until the final day to upload documents",
  "Using unclear scans or wrong file formats",
  "Forgetting recommendation letters",
  "Ignoring language requirements",
  "Entering inconsistent information across portals",
  "Trusting unofficial agents instead of official instructions",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function ScholarshipApplicationChecklistPage() {
  return (
    <>
      <GuideArticleJsonLd
        title="Scholarship Application Checklist for Pakistani Students"
        description={metadata.description}
        path="/guides/scholarship-application-checklist"
      />
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                  Application Planning Guide
                </p>

                <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                  Scholarship Application Checklist for Pakistani Students
                </h1>

                <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                  A strong scholarship application is not only about good grades. It is also about
                  eligibility, documents, deadlines, writing quality, consistency, and careful
                  submission. This checklist helps Pakistani students prepare applications step by
                  step without missing important details.
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
                  Main advice
                </p>
                <h2 className="mt-2 text-base font-bold text-ink">
                  Start before the deadline month
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  Most scholarship mistakes happen because students wait too long. Prepare your
                  documents early and submit before the final day.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="space-y-7">
            <Section title="Why a checklist matters">
              <p>
                Scholarships are competitive because many students apply for the same funding. A
                checklist helps you avoid small mistakes that can damage an otherwise strong
                application, such as missing documents, unclear scans, weak SOPs, incorrect file
                names, or late submission.
              </p>
              <p className="mt-4">
                Use this checklist before every scholarship application. Do not assume that two
                scholarships require the same documents or the same application process.
              </p>
            </Section>

            <Section title="Eligibility checklist">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {eligibilityChecklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-pine"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="documents" title="Core document checklist">
              <p>
                Exact requirements vary by scholarship, country, and university. Still, most
                international scholarship applications require several of the following documents:
              </p>

              <ul className="mt-4 grid list-none gap-3 p-0 md:grid-cols-2">
                {documentChecklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <FileText size={17} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Writing document checklist">
              <div className="space-y-4">
                {writingChecklist.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-ink">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-ink/70">{item.body}</p>
                      </div>

                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-pine/20 px-4 py-2 text-sm font-semibold text-pine transition hover:bg-pine/5"
                      >
                        {item.linkText}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Simple application timeline">
              <ol className="grid list-none gap-4 p-0 md:grid-cols-2">
                {timelineSteps.map((item) => (
                  <li key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <CalendarCheck size={22} className="text-pine" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-bold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{item.body}</p>
                  </li>
                ))}
              </ol>
            </Section>

            <Section id="final-review" title="Final review before submission">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {finalReview.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-pine"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Common mistakes to avoid">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {mistakes.map((mistake) => (
                  <li
                    key={mistake}
                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                  >
                    {mistake}
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-xl border border-saffron/30 bg-saffron/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-saffron"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-6 text-ink/75">
                    Always follow the official scholarship instructions. This checklist is a
                    planning tool, not a replacement for official requirements.
                  </p>
                </div>
              </div>
            </Section>

            <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Scholars Republic tools
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                Manage your scholarship applications in one place
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Use Scholars Republic to search scholarships, complete your profile, save
                opportunities, track applications, and prepare stronger SOPs, CVs, study plans, and
                professor emails.
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
                  href="/dashboard/applications"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <CalendarCheck size={16} aria-hidden="true" />
                  Track Applications
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
                <a href="#final-review" className="hover:text-pine">
                  Final review
                </a>
                <Link href="/scholarships" className="hover:text-pine">
                  Search scholarships
                </Link>
                <Link href="/dashboard/profile" className="hover:text-pine">
                  Complete profile
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
              <h2 className="mt-2 text-base font-bold text-ink">Search and save opportunities</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Find scholarships that match your profile, then save them before preparing
                documents.
              </p>
              <Link
                href="/scholarships"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Open Scholarship Search
              </Link>
            </div>

            <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Preparing your SOP?</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Your SOP, CV, study plan, and application form should tell one consistent story.
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
