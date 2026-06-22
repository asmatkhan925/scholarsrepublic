import { api } from "../client";

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: "student" | "admin";
  email_verified: boolean;
  is_active: boolean;
  has_profile: boolean;
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  notify_weekly_digest: boolean;
  notify_deadline_reminder: boolean;
  updated_at: string;
  profile: {
    completion_percentage?: number;
    scholarship_readiness_score?: number;
    readiness_level?: string;
  };
}

export interface AdminUserListResponse {
  count: number;
  results: AdminUser[];
}

export interface AdminStudentProfile {
  user_id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  joined: string;
  completion_percentage: number;
  scholarship_readiness_score: number;
  readiness_level: "High" | "Medium" | "Low";
  current_education_level: string;
  current_institution: string;
  missing_count: number;
}

export interface AdminStudentProfileListResponse {
  count: number;
  results: AdminStudentProfile[];
}

export interface AdminApplication {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  opportunity_id: number;
  opportunity_title: string;
  opportunity_deadline: string | null;
  country: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface AdminApplicationListResponse {
  count: number;
  results: AdminApplication[];
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  email_verified?: string;
  is_active?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUserListResponse> {
  const res = await api.get<AdminUserListResponse>("/auth/admin/users/", { params });
  return res.data;
}

export async function getAdminUser(id: number): Promise<AdminUserDetail> {
  const res = await api.get<AdminUserDetail>(`/auth/admin/users/${id}/`);
  return res.data;
}

export async function patchAdminUser(
  id: number,
  payload: Partial<{ role: string; email_verified: boolean; is_active: boolean }>,
): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/auth/admin/users/${id}/`, payload);
  return res.data;
}

export async function getAdminStudentProfiles(params?: {
  search?: string;
  readiness?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminStudentProfileListResponse> {
  const res = await api.get<AdminStudentProfileListResponse>("/admin/students/profiles/", { params });
  return res.data;
}

export async function getAdminApplications(params?: {
  search?: string;
  status?: string;
  priority?: string;
  user_id?: number;
  limit?: number;
  offset?: number;
}): Promise<AdminApplicationListResponse> {
  const res = await api.get<AdminApplicationListResponse>("/admin/applications/", { params });
  return res.data;
}

export interface AnalyticsSeries { date: string; count: number }
export interface AnalyticsStatusBreakdown { status: string; count: number }
export interface AnalyticsTopScholarship { id: number; title: string; count: number }
export interface AnalyticsTopCountry { country: string; count: number }

export interface AdminAnalyticsResponse {
  summary: {
    total_users: number;
    total_students: number;
    new_users_30d: number;
    total_applications: number;
    new_applications_30d: number;
    total_profiles: number;
    published_scholarships: number;
  };
  signups_series: AnalyticsSeries[];
  apps_series: AnalyticsSeries[];
  status_breakdown: AnalyticsStatusBreakdown[];
  top_scholarships: AnalyticsTopScholarship[];
  readiness_distribution: { High: number; Medium: number; Low: number };
  top_countries: AnalyticsTopCountry[];
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  const res = await api.get<AdminAnalyticsResponse>("/admin/analytics/");
  return res.data;
}
