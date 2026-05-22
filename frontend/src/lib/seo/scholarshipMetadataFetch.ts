import type { OpportunityDetail } from "@/types/opportunity";

const FETCH_TIMEOUT_MS = 8_000;
const DEFAULT_SITE_URL = "https://scholarsrepublic.org";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseUrlCandidates() {
  const siteUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL);
  const candidates = [
    process.env.SERVER_API_BASE_URL?.trim(),
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim(),
    `${siteUrl}/api`,
    `${DEFAULT_SITE_URL}/api`,
  ];

  if (process.env.NODE_ENV !== "production") {
    candidates.push("http://localhost:8000/api");
  }

  return Array.from(
    new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))),
  ).map(normalizeBaseUrl);
}

function buildScholarshipDetailUrl(apiBaseUrl: string, slug: string) {
  return `${apiBaseUrl}/scholarships/${encodeURIComponent(slug)}/`;
}

function logFetchWarning(slug: string, message: string) {
  console.warn(`[scholarship-og] Could not load scholarship for slug: ${slug}. ${message}`);
}

export async function fetchScholarshipForSocialPreview(slug: string) {
  const apiBaseUrls = getApiBaseUrlCandidates();

  for (const apiBaseUrl of apiBaseUrls) {
    const url = buildScholarshipDetailUrl(apiBaseUrl, slug);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.status === 404) {
        logFetchWarning(slug, `Backend returned 404 from ${url}`);
        continue;
      }

      if (!response.ok) {
        logFetchWarning(slug, `Backend returned ${response.status} from ${url}`);
        continue;
      }

      const data = (await response.json()) as OpportunityDetail;

      if (!data || typeof data !== "object") {
        logFetchWarning(slug, `Backend returned an invalid response from ${url}`);
        continue;
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown fetch error";
      logFetchWarning(slug, `${message} from ${url}`);
    }
  }

  logFetchWarning(slug, "All API base URL candidates failed");
  return null;
}
