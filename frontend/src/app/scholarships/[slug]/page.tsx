import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import ScholarshipDetailPage from "@/features/scholarships/ScholarshipDetailPage";
import { getPublicScholarshipInitial } from "@/lib/serverApi";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const dynamic = "force-dynamic";

type ScholarshipRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ScholarshipRoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const scholarship = await getPublicScholarshipInitial(slug);

  if (!scholarship.data) {
    return {
      title: "Scholarship - Scholars Republic",
      description:
        "Review scholarship details, deadlines, source information, and application guidance on Scholars Republic.",
    };
  }

  return {
    title: `${scholarship.data.title} - Scholars Republic`,
    description:
      scholarship.data.short_description ||
      "Review scholarship details, deadlines, source information, and application guidance on Scholars Republic.",
    openGraph: {
      title: scholarship.data.title,
      description:
        scholarship.data.short_description ||
        "Review scholarship details, deadlines, source information, and application guidance on Scholars Republic.",
      type: "article",
      url: `/scholarships/${slug}`,
    },
  };
}

export default async function ScholarshipRoutePage({ params }: ScholarshipRoutePageProps) {
  const { slug } = await params;
  const initialScholarship = await getPublicScholarshipInitial(slug);

  if (initialScholarship.notFound) {
    notFound();
  }

  const scholarship = initialScholarship.data;
  const description =
    scholarship?.short_description ||
    scholarship?.description ||
    "Review scholarship details, deadlines, source information, and application guidance on Scholars Republic.";

  return (
    <>
      {scholarship ? (
        <JsonLd
          data={[
            createWebPageJsonLd({
              name: scholarship.title,
              description,
              path: `/scholarships/${slug}`,
            }),
            createBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Scholarships", path: "/scholarships" },
              { name: scholarship.title, path: `/scholarships/${slug}` },
            ]),
          ]}
        />
      ) : null}
      <ScholarshipDetailPage initialScholarship={scholarship} slug={slug} />
    </>
  );
}
