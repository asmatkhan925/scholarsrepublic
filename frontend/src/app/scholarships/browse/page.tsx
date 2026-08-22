import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { SCHOLARSHIP_INDEX_PAGE_SIZE, getPublicScholarshipsPage } from "@/lib/serverApi";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const revalidate = 3600;

type BrowseRoutePageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ searchParams }: BrowseRoutePageProps): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  const suffix = page > 1 ? ` - Page ${page}` : "";

  return {
    title: `Browse All Scholarships${suffix} - Scholars Republic`,
    description:
      "Browse the full list of scholarships on Scholars Republic, page by page, with deadlines, funding type, host country, and degree level for each opportunity.",
    alternates: {
      canonical: page > 1 ? `/scholarships/browse?page=${page}` : "/scholarships/browse",
    },
    openGraph: {
      title: `Browse All Scholarships${suffix} - Scholars Republic`,
      description:
        "Browse every scholarship listed on Scholars Republic with deadlines, funding, and eligibility at a glance.",
      type: "website",
      url: page > 1 ? `/scholarships/browse?page=${page}` : "/scholarships/browse",
    },
  };
}

function formatDeadline(deadline: string | null, isRolling: boolean) {
  if (isRolling) {
    return "Rolling deadline";
  }
  if (!deadline) {
    return "Deadline not specified";
  }
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return "Deadline not specified";
  }
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ScholarshipsBrowsePage({ searchParams }: BrowseRoutePageProps) {
  const page = parsePage((await searchParams).page);
  const response = await getPublicScholarshipsPage(page);
  const data = response.data;

  if (!data || (page > 1 && data.results.length === 0)) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(data.count / SCHOLARSHIP_INDEX_PAGE_SIZE));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const pageHref = (target: number) =>
    target <= 1 ? "/scholarships/browse" : `/scholarships/browse?page=${target}`;

  return (
    <>
      <JsonLd
        data={[
          createWebPageJsonLd({
            name: "Browse All Scholarships",
            description:
              "A complete, page-by-page index of every scholarship listed on Scholars Republic.",
            path: page > 1 ? `/scholarships/browse?page=${page}` : "/scholarships/browse",
            type: "CollectionPage",
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Scholarships", path: "/scholarships" },
            { name: "Browse All", path: "/scholarships/browse" },
          ]),
        ]}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
          <Link className="hover:text-slate-900" href="/">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link className="hover:text-slate-900" href="/scholarships">
            Scholarships
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">Browse All</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Browse All Scholarships
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Every scholarship listed on Scholars Republic, including closed opportunities kept as an
            archive so you can plan ahead for the next intake. Showing page {page} of {totalPages} (
            {data.count} scholarships in total).
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Looking for something specific?{" "}
            <Link className="font-medium text-slate-900 underline" href="/scholarships">
              Use the scholarship search and filters
            </Link>
            .
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.results.map((scholarship) => (
            <li
              key={scholarship.slug}
              className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="text-base font-semibold leading-snug text-slate-900">
                <Link
                  className="hover:underline"
                  href={`/scholarships/${scholarship.slug}`}
                >
                  {scholarship.title}
                </Link>
              </h2>

              <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                {scholarship.short_description}
              </p>

              <dl className="mt-4 space-y-1 text-xs text-slate-500">
                {scholarship.university_name || scholarship.provider_name ? (
                  <div>
                    <dt className="sr-only">Provider</dt>
                    <dd>{scholarship.university_name || scholarship.provider_name}</dd>
                  </div>
                ) : null}
                {scholarship.country ? (
                  <div>
                    <dt className="sr-only">Country</dt>
                    <dd>{scholarship.country}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="sr-only">Deadline</dt>
                  <dd>
                    {formatDeadline(scholarship.deadline, scholarship.is_rolling_deadline)}
                    {scholarship.is_expired ? (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        Closed
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <nav
          aria-label="Scholarship pages"
          className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6"
        >
          {hasPrevious ? (
            <Link
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              href={pageHref(page - 1)}
              rel="prev"
            >
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>

          {hasNext ? (
            <Link
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              href={pageHref(page + 1)}
              rel="next"
            >
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <ol className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) => (
            <li key={target}>
              <Link
                aria-current={target === page ? "page" : undefined}
                className={
                  target === page
                    ? "inline-block rounded border border-slate-900 bg-slate-900 px-3 py-1 font-medium text-white"
                    : "inline-block rounded border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-400"
                }
                href={pageHref(target)}
              >
                {target}
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
