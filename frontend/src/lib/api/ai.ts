import type {
  AIJobStatus,
  CreateSOPDraftPayload,
  GenerateSOPPayload,
  SOPDraft,
  SubmitAIJobResponse,
  UpdateSOPDraftPayload,
} from "@/types/ai";

import { api } from "./client";

export async function submitSOPJob(payload: GenerateSOPPayload) {
  const response = await api.post<SubmitAIJobResponse>("/ai/sop/generate/", payload);
  return response.data;
}

export async function getAIJobStatus(jobId: number) {
  const response = await api.get<AIJobStatus>(`/ai/jobs/${jobId}/`);
  return response.data;
}

export async function getSOPDrafts() {
  const response = await api.get<SOPDraft[]>("/ai/sop-drafts/");
  return response.data;
}

export async function getSOPDraft(id: number) {
  const response = await api.get<SOPDraft>(`/ai/sop-drafts/${id}/`);
  return response.data;
}

export async function createSOPDraft(payload: CreateSOPDraftPayload) {
  const response = await api.post<SOPDraft>("/ai/sop-drafts/", payload);
  return response.data;
}

export async function patchSOPDraft(id: number, payload: UpdateSOPDraftPayload) {
  const response = await api.patch<SOPDraft>(`/ai/sop-drafts/${id}/`, payload);
  return response.data;
}

export async function deleteSOPDraft(id: number) {
  await api.delete(`/ai/sop-drafts/${id}/`);
}
