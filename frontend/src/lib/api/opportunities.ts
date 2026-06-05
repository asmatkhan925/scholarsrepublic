import type {
  CreateSavedOpportunityPayload,
  OpportunityDetail,
  OpportunityListItem,
  OpportunityListResponse,
  OpportunityMatch,
  OpportunityPathwayDetail,
  OpportunityPathwayListResponse,
  OpportunityPathwayQueryParams,
  OpportunityQueryParams,
  RecommendedOpportunityResponse,
  SavedOpportunity,
  SavedOpportunityResponse,
  SavedOpportunitySlugsResponse,
} from "@/types/opportunity";

import { api, type PaginationParams } from "./client";

export type ScholarshipPickerQueryParams = {
  q?: string;
  limit?: number;
};

export type ScholarshipPickerItem = OpportunityListItem & {
  is_saved: boolean;
  match_score: number | null;
};

export type ScholarshipPickerResponse = {
  count: number;
  results: ScholarshipPickerItem[];
};

export async function getOpportunities(params?: OpportunityQueryParams) {
  const response = await api.get<OpportunityListResponse>("/opportunities/", {
    params,
  });
  return response.data;
}

export async function getOpportunity(slug: string) {
  const response = await api.get<OpportunityDetail>(`/opportunities/${slug}/`);
  return response.data;
}

export async function getOpportunityPathways(params?: OpportunityPathwayQueryParams) {
  const response = await api.get<OpportunityPathwayListResponse>("/opportunity-pathways/", {
    params,
  });
  return response.data;
}

export async function getOpportunityPathway(slug: string) {
  const response = await api.get<OpportunityPathwayDetail>(`/opportunity-pathways/${slug}/`);
  return response.data;
}

export async function getScholarships(params?: OpportunityQueryParams & PaginationParams) {
  const response = await api.get<OpportunityListResponse>("/scholarships/", {
    params,
  });
  return response.data;
}

export async function getScholarshipPicker(params?: ScholarshipPickerQueryParams) {
  const response = await api.get<ScholarshipPickerResponse>("/scholarships/picker/", {
    params,
  });
  return response.data;
}

export async function getScholarship(slug: string) {
  const response = await api.get<OpportunityDetail>(`/scholarships/${slug}/`);
  return response.data;
}

export async function getOpportunityMatch(slug: string) {
  const response = await api.get<OpportunityMatch>(`/opportunities/${slug}/match/`);
  return response.data;
}

export async function getScholarshipMatch(slug: string) {
  const response = await api.get<OpportunityMatch>(`/scholarships/${slug}/match/`);
  return response.data;
}

export async function getRecommendedOpportunities(params?: OpportunityQueryParams) {
  const response = await api.get<RecommendedOpportunityResponse>("/opportunities/recommended/", {
    params,
  });
  return response.data;
}

export async function getRecommendedScholarships(
  params?: OpportunityQueryParams & PaginationParams,
) {
  const response = await api.get<RecommendedOpportunityResponse>("/scholarships/recommended/", {
    params,
  });
  return response.data;
}

export async function getSavedOpportunities(params?: PaginationParams) {
  const response = await api.get<SavedOpportunityResponse>("/saved-opportunities/", {
    params,
  });
  return response.data;
}

export async function createSavedOpportunity(payload: CreateSavedOpportunityPayload) {
  const response = await api.post<SavedOpportunity>("/saved-opportunities/", payload);
  return response.data;
}

export async function deleteSavedOpportunity(id: number) {
  await api.delete(`/saved-opportunities/${id}/`);
}

export async function getSavedOpportunitySlugs() {
  const response = await api.get<SavedOpportunitySlugsResponse>("/saved-opportunities/slugs/");
  return response.data;
}

export async function saveOpportunityBySlug(slug: string) {
  const response = await api.post<SavedOpportunity>(`/opportunities/${slug}/save/`);
  return response.data;
}

export async function unsaveOpportunityBySlug(slug: string) {
  await api.delete(`/opportunities/${slug}/save/`);
}

export async function saveScholarshipBySlug(slug: string) {
  const response = await api.post<SavedOpportunity>(`/scholarships/${slug}/save/`);
  return response.data;
}

export async function unsaveScholarshipBySlug(slug: string) {
  await api.delete(`/scholarships/${slug}/save/`);
}
