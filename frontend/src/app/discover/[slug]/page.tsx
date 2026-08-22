import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import DiscoveryLandingPage from "@/features/discover/DiscoveryLandingPage";
import {
  discoveryLandingPageSlugs,
  getDiscoveryLandingPage,
} from "@/features/discover/discoveryLandingPages";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

type DiscoveryRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * These landing pages are rendered from a shared template with only a small
 * amount of per-slug copy, so they are kept out of the search index while
 * still passing link equity through to /scholarships and /guides.
 */
const DISCOVERY_ROBOTS = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
} as const;

export function generateStaticParams() {
  return discoveryLandingPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: DiscoveryRoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getDiscoveryLandingPage(slug);

  if (!page) {
    return {
      title: "Scholarship Search - Scholars Republic",
      description:
        "Explore popular scholarship search paths and browse matching opportunities on Scholars Republic.",
      robots: DISCOVERY_ROBOTS,
    };
  }

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: "website",
      url: `/discover/${page.slug}`,
    },
    alternates: {
      canonical: `/discover/${page.slug}`,
    },
    robots: DISCOVERY_ROBOTS,
  };
}

export default async function DiscoveryRoutePage({ params }: DiscoveryRoutePageProps) {
  const { slug } = await params;
  const page = getDiscoveryLandingPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={[
          createWebPageJsonLd({
            name: page.title,
            description: page.description,
            path: `/discover/${page.slug}`,
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Discover", path: "/discover" },
            { name: page.title, path: `/discover/${page.slug}` },
          ]),
        ]}
      />
      <DiscoveryLandingPage page={page} />
    </>
  );
}
