"use client";

import { useEffect, useState } from "react";

import { ExternalLink, RefreshCw } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import {
  getAdminScholarshipResearchLeads,
  updateAdminScholarshipResearchLeadStatus,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ScholarshipResearchLead } from "@/types/opportunity";

const reviewFilters = [
  { value: "ready_for_draft", label: "Ready for draft" },
  { value: "new", label: "New" },
  { value: "needs_review", label: "Needs review" },
  { value: "rejected", label: "Rejected" },
  { value: "imported", label: "Imported" },
  { value: "all", label: "All" },
];

function displayDate(value: string | null) {
  return value || "Not specified";
}

export default function ScholarshipResearchLeadsPage() {
  const { loading: authLoading, user } = useAuth();
  const [items, setItems] = useState<ScholarshipResearchLead[]>([]);
  const [reviewStatus, setReviewStatus] = useState("ready_for_draft");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadLeads(status = reviewStatus) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await getAdminScholarshipResearchLeads({
        review_status: status,
        limit: 100,
      });
      setItems(response.items);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Could not load research leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || user?.role !== "admin") {
      return;
    }
    void loadLeads("ready_for_draft");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.role]);

  async function updateLead(id: number, action: "ready_for_draft" | "reject" | "imported") {
    setActionId(id);
    setError("");
    setMessage("");
    try {
      await updateAdminScholarshipResearchLeadStatus(id, action);
      setMessage("Research lead updated.");
      await loadLeads(reviewStatus);
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Could not update research lead.");
    } finally {
      setActionId(null);
    }
  }

  async function changeFilter(nextStatus: string) {
    setReviewStatus(nextStatus);
    await loadLeads(nextStatus);
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardShell
        title="Scholarship Research Leads"
        description="Review official scholarship links found by the research GPT before draft creation."
        mode="admin"
      >
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {reviewFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={reviewStatus === filter.value ? "primary" : "outline"}
                  onClick={() => void changeFilter(filter.value)}
                  disabled={loading}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <Button type="button" onClick={() => void loadLeads()} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-pine/10 text-sm dark:divide-white/10">
                  <thead className="bg-pine/5 text-left text-xs font-bold uppercase text-ink/55 dark:bg-white/5 dark:text-white/55">
                    <tr>
                      <th className="px-4 py-3">Scholarship</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Country</th>
                      <th className="px-4 py-3">Degree</th>
                      <th className="px-4 py-3">Deadline</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Duplicate</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pine/10 dark:divide-white/10">
                    {items.map((lead) => (
                      <tr key={lead.id} className="align-top">
                        <td className="max-w-sm px-4 py-3">
                          <div className="font-semibold text-ink dark:text-white">{lead.title}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {lead.official_url ? (
                              <a
                                href={lead.official_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-pine hover:underline"
                              >
                                Official <ExternalLink size={12} aria-hidden="true" />
                              </a>
                            ) : null}
                            {lead.source_url ? (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-pine hover:underline"
                              >
                                Source <ExternalLink size={12} aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {lead.provider_name || lead.university || "-"}
                        </td>
                        <td className="px-4 py-3">{lead.country || "-"}</td>
                        <td className="px-4 py-3">{lead.degree_level || "-"}</td>
                        <td className="px-4 py-3">{displayDate(lead.detected_deadline)}</td>
                        <td className="px-4 py-3">{lead.pakistan_relevance_score}</td>
                        <td className="px-4 py-3">
                          <Badge>{lead.duplicate_status.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{lead.review_status.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="min-w-56 px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void updateLead(lead.id, "ready_for_draft")}
                              disabled={actionId === lead.id}
                            >
                              Ready
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void updateLead(lead.id, "imported")}
                              disabled={actionId === lead.id}
                            >
                              Imported
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void updateLead(lead.id, "reject")}
                              disabled={actionId === lead.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && items.length === 0 ? (
                <div className="p-6 text-sm text-ink/60 dark:text-white/60">
                  No research leads match this filter.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
