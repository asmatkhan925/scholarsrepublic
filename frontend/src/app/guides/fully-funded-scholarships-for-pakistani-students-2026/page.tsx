import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Search, Sparkles } from "lucide-react";

export const metadata = {
  title: "Fully Funded Scholarships for Pakistani Students in 2026 | Scholars Republic",
  description: "A practical guide to fully funded scholarship options, eligibility, documents, deadlines, and planning strategy for Pakistani students.",
};

const sections = [
  "What fully funded scholarships usually cover",
  "Major scholarship categories for Pakistani students",
  "Eligibility factors students should check first",
  "Core documents required for most applications",
  "How to shortlist realistic scholarship options",
  "Common mistakes Pakistani students should avoid"
];

export default function GuidePage() {
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
                <span className="block text-base font-bold">Scholars Republic</span>
                <span className="text-xs text-ink/55">Scholarship guides and student support</span>
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
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
              Scholarship Guide
            </p>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
              Fully Funded Scholarships for Pakistani Students in 2026
            </h1>
            <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
              A practical guide to fully funded scholarship options, eligibility, documents, deadlines, and planning strategy for Pakistani students. This article page has been created as part
              of the Scholars Republic guide library. The detailed article will
              be expanded soon.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-6">
          <section className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
              Article status
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Full guide coming soon
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              We have prepared the page structure for this guide. The full
              article will be written in detail with examples, steps, and
              practical advice for students.
            </p>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
            <h2 className="text-xl font-bold text-ink">Planned sections</h2>
            <div className="mt-4 grid gap-3">
              {sections.map((section, index) => (
                <div
                  key={section}
                  className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 text-sm leading-6 text-ink/75"
                >
                  <span className="font-semibold text-pine">
                    {String(index + 1).padStart(2, "0")}.
                  </span> 
                  {section}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-pine/20 bg-white p-5 shadow-soft md:p-6">
            <h2 className="text-xl font-bold text-ink">
              What to do while this guide is being prepared
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              You can start by searching scholarships, completing your profile,
              and preparing your core documents. If you are working on your SOP,
              you can also use our SOP writing guide and AI SOP tool.
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
            <h2 className="text-base font-bold text-ink">Useful links</h2>
            <nav className="mt-4 grid gap-3 text-sm text-ink/70">
              <Link href="/blog" className="hover:text-pine">Blog home</Link>
              <Link href="/scholarships" className="hover:text-pine">Search scholarships</Link>
              <Link href="/dashboard/profile" className="hover:text-pine">Complete profile</Link>
              <Link href="/dashboard" className="hover:text-pine">Student dashboard</Link>
            </nav>
          </div>

          <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Writing tool
            </p>
            <h2 className="mt-2 text-base font-bold text-ink">
              Need help with your SOP?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Use our AI SOP Generator to create a first draft, then edit it
              carefully before submission.
            </p>
            <Link
              href="/dashboard/ai/sop"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              <Sparkles size={16} aria-hidden="true" />
              Open SOP Generator
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
