import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { GuideArticleJsonLd } from "@/components/seo/GuideArticleJsonLd";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  Mail,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "How to Email a Professor for Research Supervision | Scholars Republic",
  description:
    "Learn how to email a professor for MS, PhD, and research supervision, including subject lines, email structure, sample email, attachments, follow-up tips, and common mistakes.",
};

const whenToEmail = [
  "You are applying for a research-based MS or PhD program",
  "The scholarship or university requires supervisor acceptance",
  "You found a professor whose research matches your interests",
  "You have a clear research direction or project idea",
  "You want to ask whether the professor is accepting new students",
];

const emailStructure = [
  {
    title: "1. Clear subject line",
    body: "The subject should quickly tell the professor who you are and what you are asking for. Avoid vague subjects like “Hello” or “Need help.”",
  },
  {
    title: "2. Short respectful greeting",
    body: "Use a professional greeting such as “Dear Professor [Last Name]”. Do not use casual language.",
  },
  {
    title: "3. Brief introduction",
    body: "Mention your name, country, current degree or completed degree, field, and the degree level you want to apply for.",
  },
  {
    title: "4. Research connection",
    body: "Explain why you are contacting this specific professor. Mention one research area, paper, lab, or project that connects with your interests.",
  },
  {
    title: "5. Your fit and purpose",
    body: "Briefly explain your academic background, skills, research experience, or project work that makes you relevant to the professor&apos;s group.",
  },
  {
    title: "6. Clear request",
    body: "Ask politely whether the professor is accepting students or willing to consider you for research supervision.",
  },
  {
    title: "7. Attachments and closing",
    body: "Mention your attached CV, transcript, research proposal, or writing sample if available. End politely and thank the professor for their time.",
  },
];

const subjectLines = [
  "Prospective PhD Student Interested in Your Research on Machine Learning",
  "MS Research Supervision Inquiry - Computer Science Applicant from Pakistan",
  "Prospective Graduate Student Interested in Your Lab's Work on Public Health Data",
  "Research Supervision Inquiry for Fall 2026 Admission",
];

const attachments = [
  "Academic CV",
  "Transcript",
  "Research proposal or study plan if available",
  "Publication list or writing sample if available",
  "English proficiency proof if relevant",
  "Scholarship or university requirement if supervisor acceptance is needed",
];

const mistakes = [
  "Sending the same generic email to many professors",
  "Writing a very long email that no professor has time to read",
  "Using an unclear subject line",
  "Not reading the professor&apos;s research before emailing",
  "Asking for funding in the first sentence",
  "Attaching too many large files",
  "Writing with spelling mistakes and casual language",
  "Following up too aggressively",
];

const followUpTips = [
  "Wait 7 to 10 days before sending a follow-up",
  "Keep the follow-up short and polite",
  "Reply in the same email thread",
  "Do not send daily reminders",
  "If there is no response after one polite follow-up, move on",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function ProfessorEmailGuidePage() {
  return (
    <>
      <GuideArticleJsonLd
        title="How to Email a Professor for Research Supervision"
        description={metadata.description}
        path="/guides/how-to-email-professor-for-research-supervision"
      />
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                  Research Supervision Guide
                </p>

                <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                  How to Email a Professor for Research Supervision
                </h1>

                <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                  Emailing a professor can help MS and PhD applicants find research supervision,
                  understand lab opportunities, and strengthen a scholarship application. A good
                  email should be short, respectful, specific, and clearly connected to the
                  professor&apos;s research.
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
                <h2 className="mt-2 text-base font-bold text-ink">Do not send generic emails</h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  Professors receive many emails. Your message should show that you understand their
                  research and are contacting them for a specific academic reason.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="space-y-7">
            <Section title="When should you email a professor?">
              <p>
                You do not need to email professors for every scholarship. It is most useful when
                the program is research-based, when supervisor acceptance is required, or when your
                application will be stronger with clear research alignment.
              </p>

              <div className="mt-4 grid gap-3">
                {whenToEmail.map((item) => (
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

            <Section title="Best email structure">
              <div className="space-y-3">
                {emailStructure.map((item) => (
                  <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-ink/70">{item.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Good subject line examples">
              <p>
                The subject line should be specific enough for the professor to understand your
                purpose before opening the email.
              </p>

              <div className="mt-4 grid gap-3">
                {subjectLines.map((line) => (
                  <div
                    key={line}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <Mail size={17} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Sample professor email">
              <div className="rounded-xl border border-pine/20 bg-pine/5 p-5 text-sm leading-8 text-ink/75">
                <p>Dear Professor [Last Name],</p>

                <p className="mt-4">
                  My name is [Your Name], and I am a prospective [MS/PhD] applicant from Pakistan
                  with an academic background in [Your Field]. I am interested in applying for
                  research-based study in [Target Program/University], and I am writing to ask
                  whether you are currently accepting new students in your research group.
                </p>

                <p className="mt-4">
                  I read about your work on [Specific Research Topic/Paper/Lab Area], and I found it
                  closely related to my interest in [Your Research Interest]. My previous work
                  includes [one short relevant project, thesis, publication, or skill], which helped
                  me develop interest in this area.
                </p>

                <p className="mt-4">
                  I have attached my CV and transcript for your review. I would be grateful if you
                  could let me know whether my background may be a suitable fit for your group or if
                  there is any possibility of supervision.
                </p>

                <p className="mt-4">Thank you very much for your time and consideration.</p>

                <p className="mt-4">
                  Sincerely,
                  <br />
                  [Your Name]
                </p>
              </div>
            </Section>

            <Section id="attachments" title="What should you attach?">
              <p>
                Keep attachments relevant and professional. In the first email, do not overload the
                professor with too many files.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {attachments.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                  >
                    <FileText size={17} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="How to follow up politely">
              <p>
                Professors are busy, and many do not reply immediately. A polite follow-up is
                acceptable, but too many follow-ups can create a bad impression.
              </p>

              <div className="mt-4 grid gap-3">
                {followUpTips.map((tip) => (
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

            <Section title="Common mistakes to avoid">
              <div className="grid gap-3 md:grid-cols-2">
                {mistakes.map((mistake) => (
                  <div
                    key={mistake}
                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                  >
                    {mistake}
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
                    Do not claim fake publications, fake research experience, or fake professor
                    recommendations. Your email should be honest and supported by real documents.
                  </p>
                </div>
              </div>
            </Section>

            <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Scholars Republic tools
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                Prepare your research application step by step
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Use Scholars Republic to find scholarships, save opportunities, track applications,
                and prepare stronger SOPs, CVs, study plans, and professor emails.
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
                  href="/guides/how-to-write-sop-for-scholarship"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <BookOpen size={16} aria-hidden="true" />
                  Read SOP Guide
                </Link>
              </div>
            </section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">On this page</h2>
              <nav className="mt-4 grid gap-3 text-sm text-ink/70">
                <a href="#attachments" className="hover:text-pine">
                  Attachments
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
              <h2 className="mt-2 text-base font-bold text-ink">
                Find research-based opportunities
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Search for scholarships where professor supervision, research fit, or lab alignment
                can strengthen your application.
              </p>
              <Link
                href="/scholarships"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Open Scholarship Search
              </Link>
            </div>

            <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Need help with your SOP?</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Your professor email should match your SOP, CV, and study plan. Start with a clear
                SOP draft and align your documents.
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
