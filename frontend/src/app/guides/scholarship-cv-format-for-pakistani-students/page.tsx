import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { GuideArticleJsonLd } from "@/components/seo/GuideArticleJsonLd";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ListChecks,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "Scholarship CV Format for Pakistani Students | Scholars Republic",
  description:
    "Learn how to write a strong scholarship CV for Pakistani students, including format, sections, examples, common mistakes, and application tips.",
};

const cvSections = [
  {
    title: "1. Personal information",
    body: "Include your full name, email, phone number, city/country, LinkedIn or portfolio if relevant. Avoid unnecessary personal details such as CNIC number, religion, or full home address unless required.",
  },
  {
    title: "2. Education",
    body: "List your most recent degree first. Include institution name, degree title, field, dates, CGPA or percentage if strong, and relevant academic distinctions.",
  },
  {
    title: "3. Research or final year project",
    body: "For MS and PhD scholarships, research direction matters. Mention your thesis, final year project, supervisor if appropriate, methods, tools, and outcomes.",
  },
  {
    title: "4. Publications and academic work",
    body: "Add publications, conference papers, preprints, posters, or academic writing only if they are real and verifiable.",
  },
  {
    title: "5. Experience",
    body: "Include internships, jobs, teaching assistantships, research assistantships, volunteering, or leadership roles relevant to your application.",
  },
  {
    title: "6. Skills",
    body: "Add technical, research, language, and software skills. Keep this section specific and avoid vague claims such as “excellent communication skills” without evidence.",
  },
  {
    title: "7. Awards and achievements",
    body: "Mention scholarships, medals, competitions, certificates, leadership achievements, or academic honors. Keep them concise and factual.",
  },
];

const cvRules = [
  "Use reverse chronological order",
  "Keep formatting clean and consistent",
  "Use bullet points instead of long paragraphs",
  "Prioritize academic and scholarship-relevant details",
  "Use action verbs and measurable outcomes where possible",
  "Do not add fake skills, fake certificates, or exaggerated achievements",
];

const weakStrongBullets = [
  {
    weak: "Worked on machine learning project.",
    strong:
      "Developed a machine learning model for student performance prediction using Python and evaluated it using accuracy and F1-score.",
  },
  {
    weak: "Good communication skills.",
    strong:
      "Presented final year project findings to a faculty panel and prepared a written technical report.",
  },
  {
    weak: "Helped in university society.",
    strong:
      "Coordinated a team of 12 volunteers for academic mentoring sessions for first-year students.",
  },
  {
    weak: "Know Python and MS Office.",
    strong:
      "Used Python, pandas, and scikit-learn for data cleaning, model training, and basic evaluation in academic projects.",
  },
];

const commonMistakes = [
  "Using a job CV instead of an academic scholarship CV",
  "Writing long paragraphs instead of clear bullet points",
  "Adding irrelevant personal information",
  "Using the same CV for every scholarship",
  "Listing skills without evidence",
  "Adding fake publications or certificates",
  "Using messy formatting, too many colors, or decorative templates",
  "Forgetting to update contact details",
];

const checklist = [
  "Is my CV updated for this scholarship?",
  "Is my education section clear?",
  "Have I included relevant projects or research?",
  "Are my achievements factual and verifiable?",
  "Have I used clean bullet points?",
  "Is my formatting consistent?",
  "Have I removed unnecessary personal details?",
  "Have I checked spelling and grammar?",
  "Is the CV saved as a clean PDF?",
];

const actionWords = [
  "developed",
  "designed",
  "analyzed",
  "implemented",
  "researched",
  "coordinated",
  "organized",
  "presented",
  "evaluated",
  "published",
  "assisted",
  "led",
  "trained",
  "improved",
  "documented",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function ScholarshipCVGuidePage() {
  return (
    <>
      <GuideArticleJsonLd
        title="Scholarship CV Format for Pakistani Students"
        description={metadata.description}
        path="/guides/scholarship-cv-format-for-pakistani-students"
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
                  Scholarship Document Guide
                </p>

                <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                  Scholarship CV Format for Pakistani Students
                </h1>

                <p className="mt-2 text-xs text-ink/50 dark:text-white/40">Published May 2026 · Updated June 2026</p>

                <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                  A scholarship CV is different from a job CV. It should show your academic
                  background, research potential, projects, achievements, skills, and leadership in
                  a clean and focused way. This guide explains how Pakistani students can prepare a
                  professional CV for international scholarship applications.
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
                <p className="text-xs font-semibold uppercase tracking-wide text-pine">Main rule</p>
                <h2 className="mt-2 text-base font-bold text-ink">Keep it academic and honest</h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  Scholarship committees want clear evidence of preparation, not a decorative
                  resume. Keep your CV factual, readable, and relevant.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="space-y-7">
            <Section title="What is a scholarship CV?">
              <p>
                A scholarship CV is an academic document that summarizes your education,
                achievements, projects, research experience, skills, leadership, and relevant
                activities. Its purpose is to help the scholarship committee quickly understand your
                profile.
              </p>
              <p className="mt-4">
                A good scholarship CV does not need to be fancy. It should be clear, organized, and
                easy to scan. The committee should quickly see what you studied, what you have done,
                and why your background fits the scholarship.
              </p>
            </Section>

            <Section title="Scholarship CV vs job CV">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-cream/60 text-ink">
                      <th className="px-4 py-3 font-semibold">CV type</th>
                      <th className="px-4 py-3 font-semibold">Main focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-ink/10">
                      <td className="px-4 py-3 font-semibold text-ink">Scholarship CV</td>
                      <td className="px-4 py-3 text-ink/75">
                        Education, research, projects, academic achievements, publications, awards,
                        leadership, and future potential.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-ink">Job CV</td>
                      <td className="px-4 py-3 text-ink/75">
                        Employment history, workplace skills, industry experience, and professional
                        results for a specific job role.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Best scholarship CV structure">
              <div className="space-y-3">
                {cvSections.map((item) => (
                  <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-ink/70">{item.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Golden rules for a professional scholarship CV">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {cvRules.map((rule) => (
                  <li
                    key={rule}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-pine"
                      aria-hidden="true"
                    />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Weak vs strong CV bullet points">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-cream/60 text-ink">
                      <th className="px-4 py-3 font-semibold">Weak bullet</th>
                      <th className="px-4 py-3 font-semibold">Stronger bullet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weakStrongBullets.map((item) => (
                      <tr key={item.weak} className="border-b border-ink/10">
                        <td className="px-4 py-3 text-red-700">{item.weak}</td>
                        <td className="px-4 py-3 text-ink/75">{item.strong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Action words for scholarship CVs">
              <p>
                Use action words to make your experience clearer. Do not overuse them, and make sure
                every point is supported by real experience.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {actionWords.map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-pine/15 bg-pine/5 px-3 py-1 text-sm font-medium text-pine"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </Section>

            <Section id="checklist" title="Scholarship CV checklist before submission">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {checklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <ListChecks
                      size={17}
                      className="mt-0.5 shrink-0 text-pine"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Common CV mistakes to avoid">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {commonMistakes.map((mistake) => (
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
                    Never add fake publications, fake experience, or fake certificates. Scholarship
                    committees may verify your documents.
                  </p>
                </div>
              </div>
            </Section>

            <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Scholars Republic tools
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                Build your scholarship profile step by step
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Use Scholars Republic to complete your profile, search scholarships, save
                opportunities, track applications, and prepare your SOP, study plan, professor
                emails, and scholarship CV.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  <UserRoundCheck size={16} aria-hidden="true" />
                  Complete Profile
                </Link>
                <Link
                  href="/scholarships"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <Search size={16} aria-hidden="true" />
                  Search Scholarships
                </Link>
              </div>
            </section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">On this page</h2>
              <nav className="mt-4 grid gap-3 text-sm text-ink/70">
                <a href="#checklist" className="hover:text-pine">
                  CV checklist
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
              <h2 className="mt-2 text-base font-bold text-ink">Complete your profile</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Your profile helps organize your education, skills, field, and goals before
                preparing scholarship documents.
              </p>
              <Link
                href="/dashboard/profile"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Open Profile
              </Link>
            </div>

            <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Preparing your SOP too?</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Your CV and SOP should support each other. Keep both documents honest, consistent,
                and focused.
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
