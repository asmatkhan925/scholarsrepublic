import type { ProfileCompletion, StudentProfile, StudentProfilePayload } from "@/types/profile";

import { api } from "./client";

export type CvExtractedFields = Record<string, string | number | boolean | string[]>;

export interface CvAutofillExtractResponse {
  extracted: CvExtractedFields;
}

export interface CvAutofillApplyResponse {
  updated: string[];
  skipped: string[];
  profile: StudentProfile;
}

export async function getStudentProfile() {
  const response = await api.get<StudentProfile>("/profile/");
  return response.data;
}

export async function createStudentProfile(payload: StudentProfilePayload) {
  const response = await api.post<StudentProfile>("/profile/", payload);
  return response.data;
}

export async function updateStudentProfile(payload: StudentProfilePayload) {
  const response = await api.put<StudentProfile>("/profile/", payload);
  return response.data;
}

export async function patchStudentProfile(payload: Partial<StudentProfilePayload>) {
  const response = await api.patch<StudentProfile>("/profile/", payload);
  return response.data;
}

export async function getProfileCompletion() {
  const response = await api.get<ProfileCompletion>("/profile/completion/");
  return response.data;
}

export async function extractCvFields(file: File): Promise<CvAutofillExtractResponse> {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<CvAutofillExtractResponse>("/profile/cv/autofill/extract/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function extractCvText(text: string): Promise<CvAutofillExtractResponse> {
  const response = await api.post<CvAutofillExtractResponse>("/profile/cv/autofill/extract/", { text });
  return response.data;
}

export async function applyCvFields(fields: CvExtractedFields): Promise<CvAutofillApplyResponse> {
  const response = await api.post<CvAutofillApplyResponse>("/profile/cv/autofill/apply/", { fields });
  return response.data;
}
