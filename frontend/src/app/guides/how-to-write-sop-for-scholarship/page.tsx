import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { GuideArticleJsonLd } from "@/components/seo/GuideArticleJsonLd";
import type { ReactNode } from "react";

export const metadata = {
  title: "How to Write a Good SOP for Scholarships | Scholars Republic",
  description:
    "A practical guide to writing a strong scholarship Statement of Purpose, with structure, examples, common mistakes, and a final checklist.",
};

const structure = [
  {
    title: "1. Opening: field, motivation, and purpose",
    body: "Start by introducing your academic field, the problem you care about, and the purpose behind your application. Avoid generic openings such as “Since childhood” unless the story is specific and meaningful.",
  },
  {
    title: "2. Academic background",
    body: "Explain your degree, relevant subjects, academic strengths, and how your education prepared you for the scholarship or program.",
  },
  {
    title: "3. Relevant experience",
    body: "Mention projects, research, internships, work, volunteering, competitions, or leadership experience. Do not simply list them; explain what they taught you.",
  },
  {
    title: "4. Program and university fit",
    body: "Show that you researched the program. Mention relevant courses, labs, professors, research areas, practical training, or academic opportunities.",
  },
  {
    title: "5. Scholarship fit",
    body: "Explain why this scholarship is important for your academic path and how it will help you create meaningful impact.",
  },
  {
    title: "6. Future goals and impact",
    body: "Describe your short-term and long-term goals. Explain how your education will benefit your country, community, field, or profession.",
  },
  {
    title: "7. Conclusion",
    body: "End with confidence and purpose. Your conclusion should show that you are ready to use the opportunity responsibly.",
  },
];

const mistakes = [
  "Starting with a generic childhood story",
  "Repeating your CV without explaining meaning",
  "Praising the university with empty words",
  "Making the SOP only about financial need",
  "Using robotic or generic AI-style language",
  "Writing without a clear future plan",
  "Ignoring the official word limit or prompt",
];

const checklist = [
  "Have I answered the exact scholarship prompt?",
  "Is my opening specific and relevant?",
  "Have I explained why I chose this field?",
  "Have I shown academic preparation?",
  "Have I included relevant experience?",
  "Have I explained why this program fits me?",
  "Have I explained why this scholarship matters?",
  "Are my future goals clear and realistic?",
  "Have I shown potential impact?",
  "Have I avoided copying my CV?",
  "Have I removed generic praise?",
  "Have I checked grammar and spelling?",
  "Have I followed the word limit?",
];

const weakStrongExamples = [
  {
    weak: "I am passionate about education.",
    strong:
      "My interest in education policy developed while volunteering with students who lacked access to trained science teachers.",
  },
  {
    weak: "I want to study abroad for better opportunities.",
    strong:
      "I want to pursue this program because it offers advanced training in public health data analysis, which aligns with my goal of improving maternal health monitoring systems.",
  },
  {
    weak: "Your university is famous.",
    strong:
      "The program’s course on sustainable energy systems directly supports my goal of designing affordable solar solutions for off-grid communities.",
  },
  {
    weak: "I need financial support.",
    strong:
      "This scholarship will allow me to access specialized training and apply it to community-focused development work after graduation.",
  },
];

const actionWords = [
  "developed",
  "researched",
  "analyzed",
  "designed",
  "implemented",
  "contributed",
  "investigated",
  "collaborated",
  "improved",
  "led",
  "mentored",
  "evaluated",
  "strengthened",
  "applied",
  "proposed",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function SOPGuidePage() {
  return (
    <>
      <GuideArticleJsonLd
        title="How to Write a Good SOP for Scholarship Applications"
        description={metadata.description}
        path="/guides/how-to-write-sop-for-scholarship"
        datePublished="2026-05-10"
        dateModified="2026-06-21"
      />
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                Scholarship Writing Guide
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                How to Write a Good SOP for Scholarship Applications
              </h1>

              <p className="mt-4 text-sm leading-7 text-ink/70">
                A Statement of Purpose is one of the most important documents in a scholarship
                application. This guide explains how to write a clear, specific, and convincing SOP
                with structure, examples, mistakes to avoid, and a final checklist.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="space-y-7">
            <Section title="Why your SOP matters">
              <p>
                Your transcripts show your grades. Your CV shows your activities. Your
                recommendation letters show what others think about you. But your SOP explains why
                you are applying, what you want to achieve, why you deserve funding, and how the
                scholarship will help you create impact.
              </p>
              <p className="mt-4">
                For scholarship applications, the committee is not only asking, “Can this student
                study here?” They are also asking, “Should we invest in this person?” A strong SOP
                answers that question clearly.
              </p>
            </Section>

            <Section title="What is an SOP for scholarship?">
              <p>
                An SOP for scholarship is a focused essay that explains who you are academically and
                professionally, what field you want to study, why you chose that field, why you
                chose the university or scholarship, what experience has prepared you, what your
                future goals are, and how you will use the opportunity to create impact.
              </p>
              <p className="mt-4">
                A scholarship SOP is different from a normal admission SOP because it must also show
                purpose, financial justification, leadership potential, and future contribution.
              </p>
            </Section>

            <Section title="SOP vs motivation letter vs personal statement">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-cream/60 text-ink">
                      <th className="px-4 py-3 font-semibold">Document</th>
                      <th className="px-4 py-3 font-semibold">Main focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-ink/10">
                      <td className="px-4 py-3 font-semibold text-ink">Statement of Purpose</td>
                      <td className="px-4 py-3">
                        Academic goals, research interests, program fit, career plan
                      </td>
                    </tr>
                    <tr className="border-b border-ink/10">
                      <td className="px-4 py-3 font-semibold text-ink">Motivation Letter</td>
                      <td className="px-4 py-3">
                        Motivation, scholarship fit, country or program choice
                      </td>
                    </tr>
                    <tr className="border-b border-ink/10">
                      <td className="px-4 py-3 font-semibold text-ink">Personal Statement</td>
                      <td className="px-4 py-3">
                        Personal background, challenges, values, and life story
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-ink">Grant Purpose Statement</td>
                      <td className="px-4 py-3">
                        Project plan, feasibility, relevance, and impact
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="What scholarship committees look for">
              <p>
                Committees are not looking for fancy English. They are looking for clarity,
                evidence, direction, and fit. A strong SOP usually proves that you have a clear
                academic direction, are prepared for the program, understand why the program fits
                you, have realistic future goals, and can communicate clearly.
              </p>
            </Section>

            <Section title="The best SOP structure">
              <div className="space-y-3">
                {structure.map((item) => (
                  <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-ink/70">{item.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Best SOP formula: Past, Present, Future, Fit, Impact">
              <div className="grid gap-3 sm:grid-cols-5">
                {["Past", "Present", "Future", "Fit", "Impact"].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-center text-sm font-semibold text-ink"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-4">
                If your SOP covers these five areas with evidence, it will already be stronger than
                most generic applications.
              </p>
            </Section>

            <Section title="Common SOP mistakes to avoid">
              <ul className="grid list-none gap-3 p-0">
                {mistakes.map((mistake) => (
                  <li
                    key={mistake}
                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                  >
                    {mistake}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Strong words to use in an SOP">
              <p>Use action words that show clarity, evidence, and purpose.</p>
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

            <Section title="Weak vs strong SOP sentences">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-cream/60 text-ink">
                      <th className="px-4 py-3 font-semibold">Weak sentence</th>
                      <th className="px-4 py-3 font-semibold">Strong sentence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weakStrongExamples.map((item) => (
                      <tr key={item.weak} className="border-b border-ink/10">
                        <td className="px-4 py-3 text-red-700">{item.weak}</td>
                        <td className="px-4 py-3 text-ink/75">{item.strong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Sample SOP paragraph">
              <blockquote className="rounded-xl border-l-4 border-pine bg-pine/5 p-5 text-sm leading-8 text-ink/75">
                My interest in public health developed during my volunteer work at a rural health
                camp in Sindh, where I observed that many women delayed treatment because they
                lacked access to reliable health information and affordable clinical services. This
                experience helped me understand that healthcare challenges are not only medical but
                also social, economic, and administrative. During my undergraduate studies in
                Biotechnology, I built a strong foundation in disease mechanisms, epidemiology, and
                laboratory methods. However, I now want to expand my knowledge beyond the laboratory
                and study how public health systems can prevent disease, improve awareness, and
                support vulnerable communities.
              </blockquote>
            </Section>

            <Section id="sop-checklist" title="SOP checklist before submission">
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
                {checklist.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 text-sm leading-6 text-ink/75"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Recommended SOP length">
              <ul className="space-y-3">
                <li>
                  <strong>Undergraduate scholarships:</strong> 500–800 words.
                </li>
                <li>
                  <strong>Master’s scholarships:</strong> 800–1,000 words.
                </li>
                <li>
                  <strong>PhD scholarships:</strong> 1,000–1,200 words.
                </li>
                <li>
                  <strong>If no requirement is given:</strong> one to two pages is usually
                  reasonable.
                </li>
              </ul>
            </Section>

            <Section title="Final tips">
              <p>
                A winning SOP is not the one with the most difficult English. It is the one with the
                clearest purpose. The best SOPs are specific, honest, focused, evidence-based,
                personal, realistic, connected to the scholarship’s mission, and clear about future
                impact.
              </p>
              <p className="mt-4">
                Your SOP should leave the committee thinking: this applicant knows who they are,
                knows what they want to study, understands why this scholarship matters, and has a
                realistic plan to use this opportunity for meaningful impact.
              </p>
            </Section>

            <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Scholars Republic AI Tool
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">Ready to create your SOP draft?</h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                After reading this guide, use the Scholars Republic SOP Generator to create a first
                draft from your profile, target scholarship, field of study, and future goals. Use
                it as a starting point, then personalize and verify every detail before submission.
              </p>
              <Link
                href="/dashboard/ai/sop"
                className="mt-4 inline-flex rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Open SOP Generator
              </Link>
            </section>

            <Section title="Further reading">
              <ul className="space-y-3">
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://gradschool.cornell.edu/admissions/application-steps/statements-of-purpose/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cornell Graduate School: Academic Statement of Purpose
                  </a>
                </li>
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://owl.purdue.edu/owl/general_writing/graduate_school_applications/graduate_school_applications_statements_of_purpose/statements_of_purpose_drafting_your_statement.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Purdue OWL: Drafting Your Statement of Purpose
                  </a>
                </li>
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://gradschool.duke.edu/admissions/application-instructions/statement-purpose/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Duke Graduate School: Statement of Purpose
                  </a>
                </li>
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://graduate.universityofcalifornia.edu/applying/statement-of-purpose.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    University of California: Statement of Purpose
                  </a>
                </li>
              </ul>
            </Section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                AI SOP Generator
              </p>
              <h2 className="mt-2 text-base font-bold text-ink">Create a first draft</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Use your profile and study goals to generate a structured SOP draft, then improve it
                using this guide.
              </p>
              <Link
                href="/dashboard/ai/sop"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Try SOP Generator
              </Link>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Useful links</h2>
              <nav className="mt-4 grid gap-3 text-sm text-ink/70">
                <a href="#sop-checklist" className="hover:text-pine">
                  SOP checklist
                </a>
                <Link href="/scholarships" className="hover:text-pine">
                  Search scholarships
                </Link>
                <Link href="/dashboard/profile" className="hover:text-pine">
                  Complete your profile
                </Link>
                <Link href="/dashboard" className="hover:text-pine">
                  Student dashboard
                </Link>
                <Link href="/guides" className="hover:text-pine">
                  Blog
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
