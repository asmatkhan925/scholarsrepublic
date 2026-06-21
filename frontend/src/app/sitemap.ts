import type { MetadataRoute } from "next";

import { discoveryLandingPageSlugs } from "@/features/discover/discoveryLandingPages";
import type { OpportunityListResponse } from "@/types/opportunity";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scholarsrepublic.org";
const apiBaseUrl =
  process.env.SERVER_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

type SitemapChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
type SitemapRoute = {
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

const coreRoutes: SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/scholarships", changeFrequency: "daily", priority: 0.9 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.85 },
  { path: "/discover", changeFrequency: "weekly", priority: 0.75 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/services", changeFrequency: "monthly", priority: 0.65 },
  { path: "/verification-policy", changeFrequency: "monthly", priority: 0.65 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/disclaimer", changeFrequency: "yearly", priority: 0.5 },
] as const satisfies SitemapRoute[];

const guideRoutes = [
  "/guides/fully-funded-scholarships-for-pakistani-students-2026",
  "/guides/scholarships-without-ielts-for-pakistani-students",
  "/guides/china-scholarships-for-pakistani-students",
  "/guides/daad-scholarships-for-pakistani-students",
  "/guides/turkiye-burslari-guide-for-pakistani-students",
  "/guides/how-to-write-sop-for-scholarship",
  "/guides/how-to-write-study-plan-for-scholarship",
  "/guides/how-to-email-professor-for-research-supervision",
  "/guides/scholarship-cv-format-for-pakistani-students",
  "/guides/scholarship-application-checklist",
] as const;

const discoveryRoutes = discoveryLandingPageSlugs.map((slug) => `/discover/${slug}`);

function absoluteUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, "");

  if (/\/api$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

async function getScholarshipSitemapRoutes(): Promise<MetadataRoute.Sitemap> {
  if (!apiBaseUrl) {
    return [];
  }

  try {
    const url = new URL(`${normalizeApiBaseUrl(apiBaseUrl)}/scholarships/`);
    url.searchParams.set("ordering", "-updated_at");
    url.searchParams.set("page_size", "200");

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OpportunityListResponse;

    return data.results
      .filter((scholarship) => scholarship.slug && scholarship.status === "published")
      .map((scholarship) => ({
        url: absoluteUrl(`/scholarships/${scholarship.slug}`),
        lastModified: scholarship.updated_at ? new Date(scholarship.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: scholarship.featured ? 0.8 : 0.7,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const scholarshipRoutes = await getScholarshipSitemapRoutes();

  return [
    ...coreRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...guideRoutes.map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...discoveryRoutes.map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...scholarshipRoutes,
  ];
}
