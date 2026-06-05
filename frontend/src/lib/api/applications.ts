import type {
  ApplicationQueryParams,
  ApplicationSummary,
  CreateApplicationPayload,
  OpportunityApplication,
  OpportunityApplicationResponse,
  UpdateApplicationPayload,
} from "@/types/opportunity";

import { api } from "./client";

export async function getApplications(params?: ApplicationQueryParams) {
  const response = await api.get<OpportunityApplicationResponse>("/applications/", {
    params,
  });
  return response.data;
}

export async function createApplication(payload: CreateApplicationPayload) {
  const response = await api.post<OpportunityApplication>("/applications/", payload);
  return response.data;
}

export async function getApplication(id: number) {
  const response = await api.get<OpportunityApplication>(`/applications/${id}/`);
  return response.data;
}

export async function patchApplication(id: number, payload: UpdateApplicationPayload) {
  const response = await api.patch<OpportunityApplication>(`/applications/${id}/`, payload);
  return response.data;
}

export async function deleteApplication(id: number) {
  await api.delete(`/applications/${id}/`);
}

export async function getApplicationSummary() {
  const response = await api.get<ApplicationSummary>("/applications/summary/");
  return response.data;
}

export async function startApplicationFromSaved(savedId: number) {
  const response = await api.post<OpportunityApplication>(
    `/saved-opportunities/${savedId}/start-application/`,
  );
  return response.data;
}

export async function startApplicationByOpportunitySlug(slug: string) {
  const response = await api.post<OpportunityApplication>(
    `/opportunities/${slug}/start-application/`,
  );
  return response.data;
}

export async function startApplicationByScholarshipSlug(slug: string) {
  const response = await api.post<OpportunityApplication>(
    `/scholarships/${slug}/start-application/`,
  );
  return response.data;
}
