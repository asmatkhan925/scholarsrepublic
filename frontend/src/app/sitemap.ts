import type { MetadataRoute } from "next";

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
  { path: "/scholarships/browse", changeFrequency: "daily", priority: 0.85 },
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
  "/guides/uk-chevening-commonwealth-scholarships-for-pakistani-students",
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

// NOTE: /discover/<slug> landing pages are intentionally excluded from the
// sitemap. They are generated from a shared template and carry little unique
// content, so they are served with `noindex, follow` instead. They remain
// available to users and still pass link equity to /scholarships and /guides.

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

const SITEMAP_PAGE_SIZE = 200;
const SITEMAP_MAX_PAGES = 25;

async function getScholarshipSitemapRoutes(): Promise<MetadataRoute.Sitemap> {
  if (!apiBaseUrl) {
    return [];
  }

  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  try {
    for (let page = 1; page <= SITEMAP_MAX_PAGES; page += 1) {
      const url = new URL(`${normalizeApiBaseUrl(apiBaseUrl)}/scholarships/`);
      url.searchParams.set("ordering", "-updated_at");
      url.searchParams.set("page_size", String(SITEMAP_PAGE_SIZE));
      url.searchParams.set("page", String(page));
      // Expired scholarships stay indexable as archive pages: the detail route
      // still renders them, and they rank for recurring annual searches.
      url.searchParams.set("include_expired", "true");

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        break;
      }

      const data = (await response.json()) as OpportunityListResponse;
      const results = data.results ?? [];

      for (const scholarship of results) {
        if (!scholarship.slug || scholarship.status !== "published") {
          continue;
        }
        if (seen.has(scholarship.slug)) {
          continue;
        }
        seen.add(scholarship.slug);
        entries.push({
          url: absoluteUrl(`/scholarships/${scholarship.slug}`),
          lastModified: scholarship.updated_at ? new Date(scholarship.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: scholarship.featured ? 0.8 : 0.7,
        });
      }

      if (!data.next || results.length === 0) {
        break;
      }
    }

    return entries;
  } catch {
    // Return whatever was collected before the failure rather than dropping
    // every scholarship URL from the sitemap.
    return entries;
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
    ...scholarshipRoutes,
  ];
}
