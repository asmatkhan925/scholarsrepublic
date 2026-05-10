import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  Landmark,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "DAAD Scholarships for Pakistani Students | Scholars Republic",
  description:
    "A practical guide to DAAD scholarships for Pakistani students, including scholarship types, eligibility, documents, language requirements, EPOS, research grants, and application tips.",
};

const scholarshipTypes = [
  {
    title: "Development-Related Postgraduate Courses, EPOS",
    body:
      "EPOS is one of the best-known DAAD routes for development-focused postgraduate study. It is usually suitable for applicants with relevant academic background and professional experience.",
  },
  {
    title: "Master’s scholarships",
    body:
      "Some DAAD programmes support postgraduate study in Germany. Requirements vary by subject, university, scholarship type, and language of instruction.",
  },
  {
    title: "PhD and research grants",
    body:
      "Research grants may support doctoral research, short-term research stays, or structured doctoral opportunities. These are especially important for research-focused applicants.",
  },
  {
    title: "Subject-specific scholarships",
    body:
      "DAAD also offers scholarships for specific fields or academic tracks. Students should use the official DAAD database to find the right programme.",
  },
];

const suitableFor = [
  "Pakistani students interested in Germany-based master’s or PhD study",
  "Applicants with a strong academic record and clear study goals",
  "Professionals applying for development-related postgraduate courses",
  "Students who can prepare strong motivation letters and academic documents",
  "Research applicants who can clearly explain their research direction",
];

const documents = [
  "Valid passport",
  "Academic transcripts and degree certificates",
  "Scholarship CV in a clear academic format",
  "Motivation letter or statement of purpose",
  "Study plan or research proposal where required",
  "Recommendation letters",
  "Employment certificate for programmes requiring work experience",
  "Language proof for English or German, depending on the programme",
  "University admission documents if required by the specific scholarship",
  "Additional documents listed in the DAAD scholarship database",
];

const applicationSteps = [
  {
    title: "Search the official DAAD scholarship database",
    body:
      "Start from the DAAD database and filter by country, degree level, subject, and scholarship type. Do not rely only on social media posts.",
    href: "/scholarships",
    linkText: "Search scholarships",
  },
  {
    title: "Choose a programme that matches your profile",
    body:
      "Check whether your degree, grades, work experience, language level, and field match the scholarship requirements before investing time in the application.",
    href: "/dashboard/profile",
    linkText: "Complete profile",
  },
  {
    title: "Prepare documents according to the official call",
    body:
      "DAAD applications are document-heavy. Follow the exact checklist given on the official scholarship page and the university programme page.",
    href: "/guides/scholarship-application-checklist",
    linkText: "Application checklist",
  },
  {
    title: "Write a focused motivation letter",
    body:
      "Your motivation letter should explain why Germany, why this programme, why your field, and how your study plan connects to your future contribution.",
    href: "/guides/how-to-write-sop-for-scholarship",
    linkText: "Read SOP guide",
  },
];

const timeline = [
  {
    title: "Early preparation",
    body:
      "Shortlist DAAD programmes, check eligibility, update your CV, and identify required language tests or certificates.",
  },
  {
    title: "Document preparation",
    body:
      "Prepare motivation letter, research proposal or study plan, recommendation letters, academic records, and work certificates if needed.",
  },
  {
    title: "Final submission",
    body:
      "Upload documents carefully, check file names and formats, submit before the deadline, and save confirmation records.",
  },
];

const mistakes = [
  "Applying without reading the full DAAD scholarship announcement",
  "Ignoring programme-specific language requirements",
  "Using a generic motivation letter for every programme",
  "Applying for EPOS without checking work experience requirements",
  "Confusing university admission requirements with DAAD scholarship requirements",
  "Waiting too long to request recommendation letters",
  "Submitting unclear scans or incomplete documents",
];

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6"
    >
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function DAADScholarshipsGuidePage() {
  return (
    <main className="min-h-screen bg-cream/40">
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3 text-ink">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-white">
                <GraduationCap size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-bold">
                  Scholars Republic
                </span>
                <span className="text-xs text-ink/55">
                  Scholarship guides and student support
                </span>
              </span>
            </Link>

            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <Link
                href="/blog"
                className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink"
              >
                Blog
              </Link>
              <Link
                href="/scholarships"
                className="rounded-xl bg-pine px-4 py-2 text-white transition hover:bg-pine/90"
              >
                Search Scholarships
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                Germany Scholarship Guide
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                DAAD Scholarships for Pakistani Students
              </h1>

              <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                DAAD scholarships are among the most respected funding
                opportunities for students who want to study or conduct research
                in Germany. For Pakistani students, DAAD can be a strong option,
                but the application must be planned carefully because each
                programme has its own eligibility, documents, deadlines, and
                language requirements.
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
              <h2 className="mt-2 text-base font-bold text-ink">
                Match your profile before applying
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                DAAD applications are competitive. Start by checking whether
                your academic background, experience, and language proof match
                the scholarship.
              </p>
              <Link
                href="/dashboard/profile"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Complete Your Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-7">
          <Section title="What is DAAD?">
            <p>
              DAAD stands for the German Academic Exchange Service. It supports
              international academic exchange, study, and research opportunities
              connected to Germany. For Pakistani students, DAAD is especially
              important because it provides scholarship options for postgraduate
              study, research stays, doctoral work, and development-related
              programmes.
            </p>
            <p className="mt-4">
              The important thing to understand is that DAAD is not one single
              scholarship with one fixed rule. It is a scholarship system with
              different programmes. Each programme may have different eligibility
              criteria, documents, selection process, and deadlines.
            </p>
          </Section>

          <Section title="Main DAAD scholarship types Pakistani students should know">
            <div className="grid gap-4 md:grid-cols-2">
              {scholarshipTypes.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-4"
                >
                  <h3 className="text-sm font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Who should consider applying for DAAD?">
            <p>
              DAAD scholarships are usually suitable for students who can show a
              clear academic direction, strong preparation, and a realistic plan
              for how studying in Germany will support their future goals.
            </p>

            <div className="mt-4 grid gap-3">
              {suitableFor.map((item) => (
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

          <Section title="DAAD language requirements: English or German?">
            <p>
              DAAD language requirements depend on the scholarship and the
              language of instruction of the chosen programme. Some programmes
              are taught in English, some in German, and some may require proof
              of both depending on the university and subject.
            </p>
            <p className="mt-4">
              Do not assume that DAAD always requires German or always accepts
              English only. Check the official DAAD scholarship page and the
              target university programme page. If a programme asks for IELTS,
              TOEFL, German certificate, or another language proof, prepare it
              early.
            </p>

            <div className="mt-5 rounded-xl border border-saffron/30 bg-saffron/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-saffron"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-ink/75">
                  Language rules are programme-specific. Always verify them from
                  the official scholarship call before submitting your
                  application.
                </p>
              </div>
            </div>
          </Section>

          <Section title="How to apply in an organized way">
            <div className="grid gap-4">
              {applicationSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-ink/10 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-pine">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-ink/70">
                        {step.body}
                      </p>
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

          <Section id="documents" title="Documents usually needed for DAAD scholarships">
            <p>
              Exact requirements vary by DAAD programme. Still, Pakistani
              students should usually start preparing these documents early:
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {documents.map((document) => (
                <div
                  key={document}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <FileText
                    size={17}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <span>{document}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Simple DAAD preparation timeline">
            <div className="grid gap-4 md:grid-cols-3">
              {timeline.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-4"
                >
                  <CalendarCheck
                    size={22}
                    className="text-pine"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-sm font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Common mistakes Pakistani students should avoid">
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
          </Section>

          <Section title="Useful official DAAD sources">
            <p>
              Before applying, use official DAAD sources to verify deadlines,
              eligibility, programme details, language requirements, and document
              checklists.
            </p>

            <div className="mt-4 grid gap-3">
              <a
                href="https://www.daad.pk/en/find-funding/scholarship-database/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 font-semibold text-pine hover:bg-pine/5"
              >
                DAAD Pakistan Scholarship Database
              </a>
              <a
                href="https://www.daad.pk/en/find-funding/daad-scholarship-programmes-for-pakistan/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 font-semibold text-pine hover:bg-pine/5"
              >
                DAAD Scholarship Programmes for Pakistan
              </a>
            </div>
          </Section>

          <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Scholars Republic tools
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Prepare your DAAD application with a clear document plan
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use Scholars Republic to search scholarships, save relevant
              opportunities, track your applications, and prepare stronger SOPs,
              study plans, CVs, and motivation letters.
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
            <h2 className="mt-2 text-base font-bold text-ink">
              Search Germany scholarships
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Find opportunities, save the relevant ones, and prepare your
              documents before the deadline period.
            </p>
            <Link
              href="/scholarships"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              Open Scholarship Search
            </Link>
          </div>

          <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">
              Need help with your motivation letter?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Start with a clear SOP-style draft, then adapt it to the specific
              DAAD programme and university requirements.
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
  );
}
