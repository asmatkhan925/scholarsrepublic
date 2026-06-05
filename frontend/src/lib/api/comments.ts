import type {
  CreateScholarshipCommentPayload,
  ScholarshipComment,
  ScholarshipCommentReply,
  ScholarshipCommentResponse,
} from "@/types/opportunity";

import { api } from "./client";

export async function getScholarshipComments(slug: string) {
  const response = await api.get<ScholarshipCommentResponse>(
    `/scholarships/${slug}/comments/`,
  );
  return response.data;
}

export async function createScholarshipComment(
  slug: string,
  payload: CreateScholarshipCommentPayload,
) {
  const response = await api.post<ScholarshipComment>(`/scholarships/${slug}/comments/`, payload);
  return response.data;
}

export async function replyToScholarshipComment(
  slug: string,
  commentId: number,
  payload: CreateScholarshipCommentPayload,
) {
  const response = await api.post<ScholarshipCommentReply>(
    `/scholarships/${slug}/comments/${commentId}/replies/`,
    payload,
  );
  return response.data;
}

export async function deleteScholarshipComment(commentId: number) {
  await api.delete(`/scholarship-comments/${commentId}/`);
}
