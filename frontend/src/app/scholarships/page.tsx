import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import ScholarshipsPage from "@/features/scholarships/ScholarshipsPage";
import { getPublicScholarshipsInitial } from "@/lib/serverApi";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scholarships for Pakistani Students - Scholars Republic",
  description:
    "Search verified scholarship opportunities by country, funding, deadline, IELTS requirements, and application fees on Scholars Republic.",
  // The filters on this page are applied client-side, so ?country=…&funding=…
  // permutations all render the same server HTML. Canonicalize every variant to
  // the bare /scholarships URL so search engines consolidate them here instead
  // of indexing parameter URLs with mismatched default results. Topic-specific
  // organic pages live under /discover/* and stay independently indexable.
  alternates: {
    canonical: "/scholarships",
  },
  openGraph: {
    title: "Scholarships for Pakistani Students - Scholars Republic",
    description:
      "Search verified scholarship opportunities by country, funding, deadline, IELTS requirements, and application fees on Scholars Republic.",
    type: "website",
    url: "/scholarships",
  },
};

export default async function ScholarshipsRoutePage() {
  const initialScholarships = await getPublicScholarshipsInitial();

  return (
    <>
      <JsonLd
        data={[
          createWebPageJsonLd({
            name: "Scholarships",
            description:
              "Browse scholarship opportunities, filter by country, degree level, funding type, deadline, and application requirements.",
            path: "/scholarships",
            type: "CollectionPage",
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Scholarships", path: "/scholarships" },
          ]),
        ]}
      />
      <ScholarshipsPage initialData={initialScholarships.data} />
      {/*
        Crawlable entry point into the paginated scholarship index. The filtered
        list above is client-rendered, so this link is what lets search engines
        reach every scholarship detail page.
      */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <Link
          className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
          href="/scholarships/browse"
        >
          Browse all scholarships A–Z
        </Link>
      </div>
    </>
  );
}
