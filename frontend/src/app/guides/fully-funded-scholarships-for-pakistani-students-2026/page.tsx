import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "Fully Funded Scholarships for Pakistani Students in 2026 | Scholars Republic",
  description:
    "A practical guide for Pakistani students looking for fully funded scholarships in 2026, including where to search, what documents to prepare, and how Scholars Republic can help.",
};

const scholarshipTypes = [
  {
    title: "Government-funded scholarships",
    body:
      "These are offered by foreign governments or national education bodies. They often cover tuition, living allowance, accommodation support, health insurance, or travel support depending on the program.",
  },
  {
    title: "University scholarships",
    body:
      "Many universities offer full or partial funding for strong international students. These may be merit-based, research-based, or department-specific.",
  },
  {
    title: "Research-based funding",
    body:
      "For MS and PhD applicants, supervisors, labs, and research projects may provide funding. A strong CV, research direction, and professor email are important.",
  },
  {
    title: "International mobility scholarships",
    body:
      "Some programs allow students to study in more than one country or university. These are usually competitive and require strong documents.",
  },
];

const countries = [
  "China",
  "Turkey",
  "Germany",
  "European Union",
  "South Korea",
  "Japan",
  "Hungary",
  "United Kingdom",
  "Australia",
];

const documents = [
  "Academic transcripts and degrees",
  "Passport or national identity documents",
  "Scholarship CV",
  "Statement of Purpose or motivation letter",
  "Study plan or research proposal",
  "Recommendation letters",
  "English proficiency proof or IELTS/TOEFL if required",
  "Experience certificates, publications, or awards if available",
];

const steps = [
  {
    title: "Create or complete your Scholars Republic profile",
    body:
      "Add your education, field, target degree, country preferences, and scholarship interests so your search becomes more focused.",
    href: "/dashboard/profile",
    linkText: "Complete profile",
  },
  {
    title: "Search scholarships by country and degree",
    body:
      "Do not apply randomly. Start with scholarships that match your degree level, field, nationality, and document readiness.",
    href: "/scholarships",
    linkText: "Search scholarships",
  },
  {
    title: "Check official eligibility carefully",
    body:
      "Always confirm nationality, age limit, degree requirement, language requirement, deadline, and required documents from the official page.",
    href: "/blog",
    linkText: "Read guides",
  },
  {
    title: "Prepare strong documents",
    body:
      "A fully funded scholarship is competitive. Your SOP, CV, study plan, recommendation letters, and professor emails should be clear and personalized.",
    href: "/guides/how-to-write-sop-for-scholarship",
    linkText: "Read SOP guide",
  },
];

const mistakes = [
  "Applying without checking eligibility",
  "Using the same SOP for every scholarship",
  "Waiting until the deadline week",
  "Submitting weak or generic documents",
  "Ignoring official application instructions",
  "Applying only to famous countries and missing realistic options",
];

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
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

export default function FullyFundedScholarshipsGuidePage() {
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
                Scholarship Search Guide
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                Fully Funded Scholarships for Pakistani Students in 2026
              </h1>

              <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                Fully funded scholarships can help Pakistani students study
                abroad without carrying the full financial burden of tuition,
                living costs, and academic expenses. This guide explains where to
                start, what to prepare, and how to use Scholars Republic to make
                your search more organized.
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
                Start here
              </p>
              <h2 className="mt-2 text-base font-bold text-ink">
                Build a focused scholarship list
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Instead of applying randomly, use Scholars Republic to search,
                save, and track scholarships that match your profile.
              </p>
              <Link
                href="/scholarships"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Find Opportunities
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-7">
          <Section title="What does fully funded usually mean?">
            <p>
              A fully funded scholarship usually means the scholarship covers the
              major cost of study. Depending on the program, this may include
              tuition fees, monthly stipend, accommodation, health insurance,
              travel allowance, or research support.
            </p>
            <p className="mt-4">
              However, “fully funded” does not always mean every single expense
              is covered. Some programs may not cover visa fees, document
              attestation, application fees, medical tests, or local travel. This
              is why students should always check the official scholarship page
              before applying.
            </p>
          </Section>

          <Section title="Best scholarship categories for Pakistani students">
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

          <Section title="Countries Pakistani students often consider">
            <p>
              Pakistani students commonly search for fully funded opportunities
              in countries where government scholarships, university funding, and
              research-based support are available.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {countries.map((country) => (
                <span
                  key={country}
                  className="rounded-full border border-pine/15 bg-pine/5 px-3 py-1 text-sm font-semibold text-pine"
                >
                  {country}
                </span>
              ))}
            </div>

            <p className="mt-4">
              The best country for you depends on your field, degree level,
              language requirement, academic record, and whether your profile is
              stronger for coursework-based or research-based admission.
            </p>
          </Section>

          <Section title="How Scholars Republic can help you search better">
            <div className="grid gap-4">
              {steps.map((step, index) => (
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

          <Section id="documents" title="Documents you should prepare early">
            <p>
              Most fully funded scholarships require a strong document package.
              Preparing these early saves time and helps you apply before
              deadlines.
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

          <Section title="Simple 2026 application timeline">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                <CalendarCheck size={22} className="text-pine" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-ink">
                  3–6 months before deadline
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Shortlist scholarships, check eligibility, prepare documents,
                  and contact professors if needed.
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                <FileText size={22} className="text-pine" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-ink">
                  1–2 months before deadline
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Finalize SOP, CV, study plan, recommendation letters, and
                  official forms.
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                <CheckCircle2 size={22} className="text-pine" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-ink">
                  Final week
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Review instructions, upload documents carefully, submit early,
                  and save proof of submission.
                </p>
              </div>
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
          </Section>

          <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Scholars Republic tools
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Turn your scholarship search into a plan
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use Scholars Republic to search opportunities, complete your
              profile, save scholarships, track applications, and prepare better
              documents with our writing guides and AI tools.
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
              Search scholarships now
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Find opportunities, save the relevant ones, and return later to
              prepare your documents.
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
              Need help with your SOP?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Read our SOP guide or use the AI SOP Generator to create a first
              draft. Always edit and personalize it before submission.
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
