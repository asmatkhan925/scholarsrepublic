import type {
  AdminOpportunityComment,
  AdminOpportunityCommentResponse,
  AdminOpportunityDuplicatePayload,
  AdminOpportunityDuplicateResponse,
  CreateOpportunityDraftPayload,
  OpportunityAdminPayload,
  OpportunityDetail,
  OpportunityDraft,
  OpportunityDraftImportResponse,
  OpportunityDraftResponse,
  OpportunityDraftStatus,
  OpportunityListResponse,
  OpportunityPathwayDetail,
  OpportunityPathwayListResponse,
  OpportunityPathwayQueryParams,
  OpportunityQueryParams,
  UpdateOpportunityDraftPayload,
} from "@/types/opportunity";

import { api, type PaginationParams } from "../client";

export type AdminOverviewResponse = {
  scholarships: {
    total: number;
    draft: number;
    published: number;
    archived: number;
    featured: number;
    unverified: number;
    expiring_soon: number;
  };
  drafts: {
    total: number;
    needs_review: number;
    new: number;
    validated: number;
    imported: number;
    error: number;
  };
  comments: {
    pending: number;
    active: number;
    deleted: number;
  };
  students: {
    total: number;
  };
  applications: {
    total: number;
    saved: number;
  };
};

export type AdminOpportunityPathwayPayload = {
  title: string;
  slug?: string;
  pathway_type: string;
  country_id?: number | null;
  parent_id?: number | null;
  description?: string;
  official_link?: string;
  display_order?: number;
  is_active?: boolean;
};

export type AdminOpportunityDraftQueryParams = PaginationParams & {
  status?: OpportunityDraftStatus;
  search?: string;
  needs_review?: boolean;
};

export type AdminCommentQueryParams = PaginationParams & {
  search?: string;
  status?: "pending" | "active" | "deleted";
  type?: "top_level" | "reply";
};

export async function getAdminOverview() {
  const response = await api.get<AdminOverviewResponse>("/admin/overview/");
  return response.data;
}

export async function getAdminOpportunities(params?: OpportunityQueryParams & PaginationParams) {
  const response = await api.get<OpportunityListResponse>("/admin/opportunities/", {
    params,
  });
  return response.data;
}

export async function getAdminOpportunity(id: number) {
  const response = await api.get<OpportunityDetail>(`/admin/opportunities/${id}/`);
  return response.data;
}

export async function checkAdminOpportunityDuplicates(payload: AdminOpportunityDuplicatePayload) {
  const response = await api.post<AdminOpportunityDuplicateResponse>(
    "/admin/opportunities/check-duplicates/",
    payload,
  );
  return response.data;
}

export async function createAdminOpportunity(payload: OpportunityAdminPayload) {
  const response = await api.post<OpportunityDetail>("/admin/opportunities/", payload);
  return response.data;
}

export async function updateAdminOpportunity(id: number, payload: OpportunityAdminPayload) {
  const response = await api.put<OpportunityDetail>(`/admin/opportunities/${id}/`, payload);
  return response.data;
}

export async function patchAdminOpportunity(id: number, payload: Partial<OpportunityAdminPayload>) {
  const response = await api.patch<OpportunityDetail>(`/admin/opportunities/${id}/`, payload);
  return response.data;
}

export async function deleteAdminOpportunity(id: number) {
  await api.delete(`/admin/opportunities/${id}/`);
}

export async function getAdminOpportunityDrafts(params?: AdminOpportunityDraftQueryParams) {
  const response = await api.get<OpportunityDraftResponse>("/admin/opportunity-drafts/", {
    params,
  });
  return response.data;
}

export async function getAdminOpportunityDraft(id: number) {
  const response = await api.get<OpportunityDraft>(`/admin/opportunity-drafts/${id}/`);
  return response.data;
}

export async function createAdminOpportunityDraft(payload: CreateOpportunityDraftPayload) {
  const response = await api.post<OpportunityDraft>("/admin/opportunity-drafts/", payload);
  return response.data;
}

export async function patchAdminOpportunityDraft(
  id: number,
  payload: UpdateOpportunityDraftPayload,
) {
  const response = await api.patch<OpportunityDraft>(`/admin/opportunity-drafts/${id}/`, payload);
  return response.data;
}

export async function validateAdminOpportunityDraft(id: number) {
  const response = await api.post<OpportunityDraft>(`/admin/opportunity-drafts/${id}/validate/`);
  return response.data;
}

export async function importAdminOpportunityDraft(id: number) {
  const response = await api.post<OpportunityDraftImportResponse>(
    `/admin/opportunity-drafts/${id}/import/`,
  );
  return response.data;
}

export async function deleteAdminOpportunityDraft(id: number) {
  await api.delete(`/admin/opportunity-drafts/${id}/`);
}

export async function getAdminOpportunityPathways(
  params?: OpportunityPathwayQueryParams & PaginationParams & { active?: boolean },
) {
  const response = await api.get<OpportunityPathwayListResponse>("/admin/opportunity-pathways/", {
    params,
  });
  return response.data;
}

export async function createAdminOpportunityPathway(payload: AdminOpportunityPathwayPayload) {
  const response = await api.post<OpportunityPathwayDetail>(
    "/admin/opportunity-pathways/",
    payload,
  );
  return response.data;
}

export async function updateAdminOpportunityPathway(
  id: number,
  payload: Partial<AdminOpportunityPathwayPayload>,
) {
  const response = await api.patch<OpportunityPathwayDetail>(
    `/admin/opportunity-pathways/${id}/`,
    payload,
  );
  return response.data;
}

export async function deactivateAdminOpportunityPathway(id: number) {
  await api.delete(`/admin/opportunity-pathways/${id}/`);
}

export async function reactivateAdminOpportunityPathway(id: number) {
  const response = await api.patch<OpportunityPathwayDetail>(`/admin/opportunity-pathways/${id}/`, {
    is_active: true,
  });
  return response.data;
}

export async function getAdminOpportunityComments(params?: AdminCommentQueryParams) {
  const response = await api.get<AdminOpportunityCommentResponse>("/admin/comments/", {
    params,
  });
  return response.data;
}

export async function moderateAdminOpportunityComment(
  id: number,
  action: "approve" | "hide" | "delete",
) {
  const response = await api.patch<AdminOpportunityComment>(`/admin/comments/${id}/`, {
    action,
  });
  return response.data;
}
