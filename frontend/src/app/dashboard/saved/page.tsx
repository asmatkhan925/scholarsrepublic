"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { deleteSavedOpportunity, getSavedOpportunities } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { SavedOpportunity, SavedOpportunityResponse } from "@/types/opportunity";

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Rolling or not listed";
  }
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function SavedCard({
  saved,
  onRemoved,
}: {
  saved: SavedOpportunity;
  onRemoved: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opportunity = saved.opportunity_detail;
  const provider =
    opportunity.provider_name || opportunity.university_name || opportunity.company_name || "TBD";
  const detailHref =
    opportunity.opportunity_type === "scholarship" ? `/scholarships/${opportunity.slug}` : "#";

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    try {
      await deleteSavedOpportunity(saved.id);
      onRemoved(saved.id);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{opportunity.title}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {provider} · {opportunity.country || "Country not listed"}
          </p>
        </div>
        <span className="rounded bg-skyglass px-3 py-1 text-xs font-semibold text-ink/65">
          {humanize(opportunity.opportunity_type)}
        </span>
      </div>

      <dl className="mt-5 grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
        <div>
          <dt className="text-ink/50">Funding</dt>
          <dd className="font-semibold text-ink">{humanize(opportunity.funding_type)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Deadline</dt>
          <dd className="font-semibold text-ink">{formatDate(opportunity.deadline)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Saved</dt>
          <dd className="font-semibold text-ink">{formatDate(saved.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-2 rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
        >
          View Details
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          disabled={removing}
          onClick={handleRemove}
          className="inline-flex items-center gap-2 rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 size={16} aria-hidden="true" />
          {removing ? "Removing..." : "Remove Saved"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  );
}

function SavedOpportunitiesContent() {
  const [data, setData] = useState<SavedOpportunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSaved() {
      try {
        const response = await getSavedOpportunities();
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

    void loadSaved();

    return () => {
      mounted = false;
    };
  }, []);

  function handleRemoved(id: number) {
    setData((current) => {
      if (!current) {
        return current;
      }
      const results = current.results.filter((item) => item.id !== id);
      return {
        ...current,
        count: Math.max(current.count - 1, 0),
        results,
      };
    });
  }

  const savedItems = data?.results ?? [];

  return (
    <DashboardShell
      title="Saved Opportunities"
      description="Keep track of scholarships and future opportunities you want to apply for."
    >
      {loading && (
        <div className="rounded border border-ink/10 bg-white p-5 text-sm text-ink/70">
          Loading saved opportunities...
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && savedItems.length === 0 && (
        <section className="rounded border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-ink">You have not saved any opportunities yet.</h2>
          <p className="mt-3 text-sm text-ink/70">
            Browse scholarships and save the ones you want to revisit or apply for later.
          </p>
          <Link
            href="/scholarships"
            className="mt-5 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            Browse Scholarships
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      {!loading && !error && savedItems.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {savedItems.map((saved) => (
            <SavedCard key={saved.id} saved={saved} onRemoved={handleRemoved} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function SavedOpportunitiesPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <SavedOpportunitiesContent />
    </ProtectedRoute>
  );
}
