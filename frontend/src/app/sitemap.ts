import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scholarsrepublic.org";

const coreRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/scholarships", changeFrequency: "daily", priority: 0.9 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.85 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/services", changeFrequency: "monthly", priority: 0.65 },
  { path: "/verification-policy", changeFrequency: "monthly", priority: 0.65 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/disclaimer", changeFrequency: "yearly", priority: 0.5 },
  { path: "/login", changeFrequency: "yearly", priority: 0.4 },
  { path: "/register", changeFrequency: "yearly", priority: 0.4 },
] as const;

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

function absoluteUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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
  ];
}
