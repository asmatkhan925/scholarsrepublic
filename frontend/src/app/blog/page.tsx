import Link from "next/link";

export const metadata = {
  title: "Scholarship Blog | Scholars Republic",
  description:
    "Read practical guides about scholarships, SOP writing, applications, and studying abroad.",
};

const articles = [
  {
    title: "How to Write the Best SOP for Scholarship Applications",
    description:
      "Learn SOP structure, examples, common mistakes, writing formula, and a complete checklist for fully funded scholarships.",
    href: "/guides/how-to-write-sop-for-scholarship",
    tag: "SOP Guide",
    readTime: "12 min read",
  },
];

export default function BlogPage() {
  return (
    <main className="bg-cream/40">
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-saffron">
            Scholars Republic Blog
          </p>
          <h1 className="mt-3 text-4xl font-bold text-ink md:text-5xl">
            Scholarship guides and application advice
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-ink/70">
            Practical articles to help students find scholarships, prepare
            stronger applications, and write better documents.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group rounded-2xl border border-ink/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-pine/30"
            >
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-pine">
                <span>{article.tag}</span>
                <span className="h-1 w-1 rounded-full bg-ink/30" />
                <span>{article.readTime}</span>
              </div>

              <h2 className="mt-4 text-2xl font-bold text-ink group-hover:text-pine">
                {article.title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-ink/70">
                {article.description}
              </p>

              <span className="mt-5 inline-flex text-sm font-semibold text-pine">
                Read guide →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-pine/20 bg-pine/5 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-ink">
            Want to create your SOP draft faster?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/70">
            Complete your profile and use the Scholars Republic AI SOP Generator
            to create a first draft. You can then improve it using our writing
            guides.
          </p>
          <Link
            href="/dashboard/ai/sop"
            className="mt-5 inline-flex rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
          >
            Open SOP Generator
          </Link>
        </div>
      </section>
    </main>
  );
}
