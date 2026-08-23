const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://scholarsrepublic.org").replace(
  /\/+$/,
  "",
);

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();
}

export function createOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Scholars Republic",
    url: SITE_URL,
    description:
      "Scholarship discovery and application preparation platform for Pakistani students.",
  };
}

export function createWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Scholars Republic",
    url: SITE_URL,
    description:
      "Find scholarships, save opportunities, track applications, and prepare stronger scholarship documents.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/scholarships?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function createBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const itemListElement = items
    .filter((item) => item.name && item.path)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

export function createWebPageJsonLd(options: {
  name: string;
  description: string;
  path: string;
  type?: "WebPage" | "AboutPage" | "CollectionPage" | "SearchResultsPage";
}) {
  return {
    "@context": "https://schema.org",
    "@type": options.type || "WebPage",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    isPartOf: {
      "@type": "WebSite",
      name: "Scholars Republic",
      url: SITE_URL,
    },
  };
}

/**
 * Structured data for a single scholarship.
 *
 * Modelled as a schema.org MonetaryGrant (the closest standard type for a
 * scholarship award of money), enriched with the provider, deadline, host
 * country, and degree levels when that data is present. Every optional field is
 * only emitted when it has a value, so pages never ship empty or misleading
 * properties.
 */
export function createScholarshipJsonLd(options: {
  name: string;
  description: string;
  path: string;
  providerName?: string | null;
  providerUrl?: string | null;
  fundingType?: string | null;
  country?: string | null;
  deadline?: string | null;
  degreeLevels?: string[] | null;
  officialLink?: string | null;
}) {
  const funder = options.providerName
    ? {
        "@type": "Organization",
        name: options.providerName,
        ...(options.providerUrl ? { url: options.providerUrl } : {}),
      }
    : undefined;

  const eligibleRegion = options.country
    ? { "@type": "Place", name: options.country }
    : undefined;

  const degrees = (options.degreeLevels ?? []).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "MonetaryGrant",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    ...(funder ? { funder } : {}),
    ...(options.fundingType ? { additionalType: options.fundingType } : {}),
    ...(eligibleRegion ? { spatialCoverage: eligibleRegion } : {}),
    ...(options.deadline ? { validThrough: options.deadline } : {}),
    ...(degrees.length ? { keywords: degrees.join(", ") } : {}),
    ...(options.officialLink ? { sameAs: options.officialLink } : {}),
    provider: {
      "@type": "Organization",
      name: "Scholars Republic",
      url: SITE_URL,
    },
  };
}

export function createArticleJsonLd(options: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(options.path),
    },
    url: absoluteUrl(options.path),
    author: {
      "@type": "Organization",
      name: "Scholars Republic",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Scholars Republic",
      url: SITE_URL,
    },
    ...(options.datePublished ? { datePublished: options.datePublished } : {}),
    ...(options.dateModified ? { dateModified: options.dateModified } : {}),
  };
}
