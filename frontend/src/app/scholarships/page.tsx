import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import ScholarshipsPage from "@/features/scholarships/ScholarshipsPage";
import { getPublicScholarshipsInitial } from "@/lib/serverApi";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scholarships for Pakistani Students - Scholars Republic",
  description:
    "Search verified scholarship opportunities by country, funding, deadline, IELTS requirements, and application fees on Scholars Republic.",
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
    </>
  );
}
