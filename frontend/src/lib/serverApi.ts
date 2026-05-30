import type {
  OpportunityCollectionDetail,
  OpportunityDetail,
  OpportunityListResponse,
} from "@/types/opportunity";

const SERVER_FETCH_TIMEOUT_MS = 4_000;

class MissingServerApiBaseUrlError extends Error {
  constructor() {
    super(
      "Missing SERVER_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL in production. Set one to the Django API base URL.",
    );
  }
}

function resolveServerApiBaseUrl() {
  const configuredBaseUrl =
    process.env.SERVER_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000/api";
  }

  throw new MissingServerApiBaseUrlError();
}

type ServerFetchResult<T> =
  | { data: T; notFound: false }
  | { data: null; notFound: true }
  | { data: null; notFound: false };

function buildApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const normalizedBase = resolveServerApiBaseUrl().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function serverFetchJson<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<ServerFetchResult<T>> {
  try {
    const response = await fetch(buildApiUrl(path, params), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return { data: null, notFound: true };
    }

    if (!response.ok) {
      return { data: null, notFound: false };
    }

    return { data: (await response.json()) as T, notFound: false };
  } catch (error) {
    if (error instanceof MissingServerApiBaseUrlError) {
      throw error;
    }

    return { data: null, notFound: false };
  }
}

export async function getPublicScholarshipsInitial() {
  return serverFetchJson<OpportunityListResponse>("/scholarships/", {
    ordering: "deadline",
  });
}

export async function getPublicScholarshipInitial(slug: string) {
  return serverFetchJson<OpportunityDetail>(`/scholarships/${encodeURIComponent(slug)}/`);
}

export async function getPublicScholarshipCollectionInitial(slug: string) {
  return serverFetchJson<OpportunityCollectionDetail>(
    `/scholarships/collections/${encodeURIComponent(slug)}/`,
  );
}
