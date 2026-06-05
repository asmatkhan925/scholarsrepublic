import type { CountryListResponse, StudyFieldListResponse } from "@/types/reference";

import { api } from "./client";

export type HealthResponse = {
  status: "ok";
  message: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health/");
  return response.data;
}

export async function getCountries() {
  const response = await api.get<CountryListResponse>("/reference/countries/");
  return response.data;
}

export async function getStudyFields() {
  const response = await api.get<StudyFieldListResponse>("/reference/study-fields/");
  return response.data;
}
