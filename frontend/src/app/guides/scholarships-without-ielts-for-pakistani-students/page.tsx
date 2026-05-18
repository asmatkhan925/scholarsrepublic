import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "Scholarships Without IELTS for Pakistani Students | Scholars Republic",
  description:
    "A practical guide for Pakistani students searching for scholarships without IELTS, including accepted alternatives, documents, risks, and how to verify official requirements.",
};

const alternatives = [
  {
    title: "English Proficiency Certificate",
    body: "Many students request this from their previous university if their degree was taught in English. It should be official, signed, stamped, and written clearly.",
  },
  {
    title: "Previous English-medium education",
    body: "Some universities may waive IELTS if your previous degree was completed in English. This depends on the university and program policy.",
  },
  {
    title: "University interview",
    body: "Some programs may evaluate English ability through an interview instead of a formal test. This is not guaranteed and must be confirmed officially.",
  },
  {
    title: "Other accepted tests",
    body: "Some programs may accept TOEFL, PTE Academic, Duolingo, Cambridge English, or other proof instead of IELTS. Always check the specific program page.",
  },
];

const searchTargets = [
  "China university scholarships",
  "Chinese Government Scholarship where applicable",
  "Türkiye Burslari and Turkish universities",
  "Some Korean university scholarships",
  "Some Malaysian university scholarships",
  "Some European university programs with alternative proof",
  "Research-based MS or PhD positions",
];

const documents = [
  "English Proficiency Certificate from your previous university",
  "Transcript showing medium of instruction if available",
  "Degree certificate",
  "Passport",
  "Scholarship CV",
  "Statement of Purpose or motivation letter",
  "Study plan or research proposal",
  "Recommendation letters",
  "Official program language requirement screenshot or PDF",
];

const steps = [
  {
    title: "Search scholarships first",
    body: "Start with opportunities that match your degree level, field, nationality, and target country. Do not filter only by IELTS at the beginning.",
    href: "/scholarships",
    linkText: "Search scholarships",
  },
  {
    title: "Open the official scholarship page",
    body: "Never rely only on social media posts. Check the official university or scholarship page and read the language requirement carefully.",
    href: "/blog",
    linkText: "Read guides",
  },
  {
    title: "Check whether alternatives are accepted",
    body: "Look for phrases such as English-medium instruction, English proficiency certificate, language waiver, or equivalent proof.",
    href: "/dashboard/profile",
    linkText: "Complete profile",
  },
  {
    title: "Prepare your documents early",
    body: "If your university can issue an English Proficiency Certificate, request it early. Make sure it is signed, stamped, and matches your academic record.",
    href: "/guides/scholarship-application-checklist",
    linkText: "Application checklist",
  },
];

const mistakes = [
  "Assuming every scholarship can be applied to without IELTS",
  "Submitting only a self-written English certificate",
  "Ignoring university-level language requirements",
  "Trusting WhatsApp or Facebook posts without checking official pages",
  "Waiting until the deadline to request an English Proficiency Certificate",
  "Applying to English-taught programs without proving English ability",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function ScholarshipsWithoutIELTSGuidePage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                No IELTS Scholarship Guide
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                Scholarships Without IELTS for Pakistani Students
              </h1>

              <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                Many Pakistani students search for scholarships without IELTS because IELTS can be
                expensive, time-consuming, or unavailable in some situations. The good news is that
                some universities and scholarships may accept alternative proof of English ability.
                The important point is to verify the official requirement before you apply.
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

            <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
              <div className="flex gap-3">
                <AlertTriangle
                  size={22}
                  className="mt-0.5 shrink-0 text-saffron"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-base font-bold text-ink">Important warning</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    “No IELTS” does not mean “no English proof.” Most programs still require some
                    evidence that you can study in English.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-7">
          <Section title="What does “without IELTS” actually mean?">
            <p>
              A scholarship without IELTS usually means that IELTS is not the only accepted proof of
              English language ability. The university or scholarship body may accept another
              document, such as an English Proficiency Certificate, previous English-medium
              education, another test score, or an interview.
            </p>
            <p className="mt-4">
              This is why students should avoid a common mistake: do not assume that “no IELTS”
              means no language requirement. The requirement may still exist, but IELTS may not be
              mandatory.
            </p>
          </Section>

          <Section title="Common alternatives to IELTS">
            <div className="grid gap-4 md:grid-cols-2">
              {alternatives.map((item) => (
                <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Where Pakistani students can search first">
            <p>
              Students should search broadly first, then confirm language rules from each official
              scholarship or university page. The following areas are commonly searched by Pakistani
              students who want IELTS alternatives:
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {searchTargets.map((target) => (
                <div
                  key={target}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <ShieldCheck size={17} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
                  <span>{target}</span>
                </div>
              ))}
            </div>

            <p className="mt-4">
              For China, some master’s and PhD programs are available in English, while some
              programs require Chinese-language preparation or HSK depending on level and program.
              Always read the current official requirements before applying.
            </p>
          </Section>

          <Section title="How to verify if IELTS is required">
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

          <Section id="documents" title="Documents to prepare if applying without IELTS">
            <p>
              If you plan to apply without IELTS, prepare your language-related documents early.
              Weak or unofficial documents can damage your application.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {documents.map((document) => (
                <div
                  key={document}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <span>{document}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Common mistakes to avoid">
            <div className="grid gap-3 md:grid-cols-2">
              {mistakes.map((mistake) => (
                <div key={mistake} className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  {mistake}
                </div>
              ))}
            </div>
          </Section>

          <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Scholars Republic tools
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Search smarter before spending money on tests
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use Scholars Republic to search scholarships, save relevant opportunities, and prepare
              your documents. If a scholarship requires IELTS, you can still keep it in your plan;
              if it accepts alternatives, you can prepare those documents early.
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
              Start with matching opportunities, then check whether IELTS or an alternative proof is
              required.
            </p>
            <Link
              href="/scholarships"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              Open Scholarship Search
            </Link>
          </div>

          <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">Preparing your SOP too?</h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Read our SOP guide or use the AI SOP Generator to create a first draft. Always edit
              and personalize it before submission.
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
