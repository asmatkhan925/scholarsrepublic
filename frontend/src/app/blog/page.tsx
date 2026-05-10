import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "Scholarship Blog | Scholars Republic",
  description:
    "Read practical scholarship guides, SOP writing advice, application tips, and study-abroad resources from Scholars Republic.",
};

const featuredArticles = [
  {
    title: "How to Write a Good SOP for Scholarship Applications",
    description:
      "Learn how to structure a scholarship Statement of Purpose, avoid common mistakes, use stronger examples, and prepare a final checklist before submission.",
    href: "/guides/how-to-write-sop-for-scholarship",
    category: "SOP Writing",
    readTime: "12 min read",
  },
];

const upcomingGuides = [
  {
    title: "How to Find Fully Funded Scholarships",
    description:
      "A practical guide for searching, filtering, and shortlisting scholarships that match your academic profile.",
    status: "Coming soon",
  },
  {
    title: "How to Prepare a Strong Scholarship CV",
    description:
      "Learn how to organize your education, projects, skills, achievements, and leadership experience for scholarship applications.",
    status: "Coming soon",
  },
  {
    title: "How to Write a Motivation Letter",
    description:
      "Understand the difference between an SOP and a motivation letter, with examples for international scholarships.",
    status: "Coming soon",
  },
];

const resourceLinks = [
  {
    title: "Search Scholarships",
    description: "Find scholarship opportunities that match your goals.",
    href: "/scholarships",
    icon: Search,
  },
  {
    title: "Complete Your Profile",
    description: "Improve your recommendations by updating your student profile.",
    href: "/dashboard/profile",
    icon: UserRoundCheck,
  },
  {
    title: "AI SOP Generator",
    description: "Create a first SOP draft using your profile and study goals.",
    href: "/dashboard/ai/sop",
    icon: Sparkles,
  },
];

export default function BlogPage() {
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
                  Scholarship guides and student tools
                </span>
              </span>
            </Link>

            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <Link
                href="/scholarships"
                className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink"
              >
                Search Scholarships
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl bg-pine px-4 py-2 text-white transition hover:bg-pine/90"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                Scholars Republic Blog
              </p>

              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-ink md:text-4xl">
                Practical scholarship guides for serious students
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 md:text-base">
                Learn how to find scholarships, prepare stronger documents, write
                better SOPs, and improve your international study applications.
                Our guides are written for students who want clear, practical,
                and honest application support.
              </p>
            </div>

            <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-pine">
                  <BookOpen size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Start with our SOP guide
                  </h2>
                  <p className="text-xs text-ink/55">
                    The most important document for many scholarships.
                  </p>
                </div>
              </div>

              <Link
                href="/guides/how-to-write-sop-for-scholarship"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Read SOP Guide
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-7">
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                  Featured guide
                </p>
                <h2 className="mt-1 text-xl font-bold text-ink">
                  Recommended for scholarship applicants
                </h2>
              </div>
            </div>

            <div className="grid gap-5">
              {featuredArticles.map((article) => (
                <Link
                  key={article.href}
                  href={article.href}
                  className="group overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-pine/30"
                >
                  <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="flex min-h-[180px] items-center justify-center bg-gradient-to-br from-pine/15 via-cream to-saffron/20 p-6">
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-5 text-center shadow-sm">
                        <FileText
                          size={42}
                          className="mx-auto text-pine"
                          aria-hidden="true"
                        />
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-pine">
                          SOP Guide
                        </p>
                      </div>
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/55">
                        <span className="rounded-full bg-pine/10 px-3 py-1 text-pine">
                          {article.category}
                        </span>
                        <span>{article.readTime}</span>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold leading-snug text-ink group-hover:text-pine">
                        {article.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-ink/70">
                        {article.description}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-pine">
                        Read the guide
                        <ArrowRight
                          size={16}
                          className="transition group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
              Coming next
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              More scholarship guides are being prepared
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              We are building a practical library of guides for scholarship
              search, CV writing, motivation letters, recommendation letters,
              interviews, and application planning.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {upcomingGuides.map((guide) => (
                <article
                  key={guide.title}
                  className="rounded-2xl border border-ink/10 bg-cream/40 p-4"
                >
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/50">
                    {guide.status}
                  </span>
                  <h3 className="mt-4 text-base font-bold leading-snug text-ink">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink/65">
                    {guide.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">Popular resources</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Use these tools with our guides to improve your scholarship
              application.
            </p>

            <div className="mt-5 grid gap-3">
              {resourceLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-xl border border-ink/10 bg-white p-4 transition hover:border-pine/30 hover:bg-pine/5"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine/10 text-pine">
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-ink group-hover:text-pine">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-ink/60">
                          {item.description}
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">
              New to Scholars Republic?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Create a free student profile to save opportunities, track
              applications, and use scholarship writing tools.
            </p>

            <Link
              href="/register"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Create Free Profile
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
