import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DiscoveryLandingPage from "@/features/discover/DiscoveryLandingPage";
import {
  discoveryLandingPageSlugs,
  getDiscoveryLandingPage,
} from "@/features/discover/discoveryLandingPages";

type DiscoveryRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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
  };
}

export default async function DiscoveryRoutePage({ params }: DiscoveryRoutePageProps) {
  const { slug } = await params;
  const page = getDiscoveryLandingPage(slug);

  if (!page) {
    notFound();
  }

  return <DiscoveryLandingPage page={page} />;
}
