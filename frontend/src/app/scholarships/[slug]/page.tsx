import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ScholarshipDetailPage from "@/features/scholarships/ScholarshipDetailPage";
import { getPublicScholarshipInitial } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

type ScholarshipRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ScholarshipRoutePageProps): Promise<Metadata> {
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
  };
}

export default async function ScholarshipRoutePage({ params }: ScholarshipRoutePageProps) {
  const { slug } = await params;
  const initialScholarship = await getPublicScholarshipInitial(slug);

  if (initialScholarship.notFound) {
    notFound();
  }

  return <ScholarshipDetailPage initialScholarship={initialScholarship.data} slug={slug} />;
}
