import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import ScholarshipDetailPage from "@/features/scholarships/ScholarshipDetailPage";
import { getPublicScholarshipInitial } from "@/lib/serverApi";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";
import { fetchScholarshipForSocialPreview } from "@/lib/seo/scholarshipMetadataFetch";
import { getScholarshipSocialMetadata } from "@/lib/seo/scholarshipSocial";

export const dynamic = "force-dynamic";

type ScholarshipRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ScholarshipRoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const scholarship = await fetchScholarshipForSocialPreview(slug);
  const social = getScholarshipSocialMetadata(scholarship, slug);

  if (!scholarship) {
    return {
      title: social.title,
      description: social.description,
      alternates: {
        canonical: social.canonicalUrl,
      },
      openGraph: {
        title: social.title,
        description: social.description,
        type: "article",
        url: social.canonicalUrl,
        siteName: "Scholars Republic",
        images: [
          {
            url: social.ogImageUrl,
            width: 1200,
            height: 630,
            alt: social.imageAlt,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: social.title,
        description: social.description,
        images: [social.ogImageUrl],
      },
    };
  }

  return {
    title: social.title,
    description: social.description,
    alternates: {
      canonical: social.canonicalUrl,
    },
    openGraph: {
      title: social.title,
      description: social.description,
      type: "article",
      url: social.canonicalUrl,
      siteName: "Scholars Republic",
      images: [
        {
          url: social.ogImageUrl,
          width: 1200,
          height: 630,
          alt: social.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: social.title,
      description: social.description,
      images: [social.ogImageUrl],
    },
  };
}

export default async function ScholarshipRoutePage({ params }: ScholarshipRoutePageProps) {
  const { slug } = await params;
  const initialScholarship = await getPublicScholarshipInitial(slug).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    console.warn(
      `[scholarship-og] Could not load initial scholarship for slug: ${slug}. ${message}`,
    );

    return {
      data: null,
      notFound: false,
    };
  });

  if (initialScholarship.notFound) {
    notFound();
  }

  const scholarship = initialScholarship.data ?? (await fetchScholarshipForSocialPreview(slug));
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
