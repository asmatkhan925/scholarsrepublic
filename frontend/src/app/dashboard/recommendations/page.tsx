"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { MatchScoreBadge } from "@/components/opportunities/MatchScoreBadge";
import { getRecommendedScholarships } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { RecommendedOpportunityResponse } from "@/types/opportunity";

function RecommendationsContent() {
  const [data, setData] = useState<RecommendedOpportunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      try {
        const response = await getRecommendedScholarships();
        if (mounted) {
          setData(response);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      mounted = false;
    };
  }, []);

  const recommendations = data?.results ?? [];

  return (
    <DashboardShell
      title="Recommended Scholarships"
      description="Based on your profile, documents, and preferences."
    >
      {loading && (
        <div className="rounded border border-ink/10 bg-white p-5 text-sm text-ink/70">
          Loading recommendations...
        </div>
      )}

      {error && (
        <section className="rounded border border-saffron/40 bg-saffron/15 p-5 text-sm text-ink/75">
          <p>{error}</p>
          <Link
            href="/dashboard/profile"
            className="mt-4 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 font-semibold text-white hover:bg-pine/90"
          >
            Complete Profile
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="rounded border border-ink/10 bg-white p-5 text-sm text-ink/70">
          No recommendations are available yet.
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {recommendations.map(({ opportunity, match }) => (
            <article
              key={opportunity.id}
              className="flex flex-col rounded border border-ink/10 bg-white p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{opportunity.title}</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {opportunity.country || "Country not listed"} ·{" "}
                    {opportunity.provider_name || opportunity.university_name || "Provider TBD"}
                  </p>
                </div>
                <MatchScoreBadge score={match.score} readinessLevel={match.readiness_level} />
              </div>

              {match.matched_reasons.length > 0 && (
                <ul className="mt-4 grid gap-2 text-sm text-ink/70">
                  {match.matched_reasons.slice(0, 3).map((reason) => (
                    <li key={reason} className="rounded bg-skyglass px-3 py-2">
                      {reason}
                    </li>
                  ))}
                </ul>
              )}

              {match.missing_requirements.length > 0 && (
                <p className="mt-4 text-sm text-ink/65">
                  Missing: {match.missing_requirements.slice(0, 3).join(", ")}
                </p>
              )}

              <Link
                href={`/scholarships/${opportunity.slug}`}
                className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-pine"
              >
                View Details
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function RecommendationsPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <RecommendationsContent />
    </ProtectedRoute>
  );
}
