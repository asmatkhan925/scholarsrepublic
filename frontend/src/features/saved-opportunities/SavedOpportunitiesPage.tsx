"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  BookmarkCheck,
  ClipboardCheck,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  deleteSavedOpportunity,
  getSavedOpportunities,
  startApplicationFromSaved,
} from "@/lib/api";
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

function getDaysUntilDeadline(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  const deadline = new Date(value);
  const diff = deadline.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDeadlineBadge(deadline: string | null) {
  const days = getDaysUntilDeadline(deadline);

  if (days === null) {
    return { label: "Rolling", tone: "sky" as const };
  }

  if (days < 0) {
    return { label: "Expired", tone: "danger" as const };
  }

  if (days <= 14) {
    return { label: `${days} days left`, tone: "saffron" as const };
  }

  return { label: `${days} days left`, tone: "mint" as const };
}

function SavedOpportunityCard({
  saved,
  onRemoved,
}: {
  saved: SavedOpportunity;
  onRemoved: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const opportunity = saved.opportunity_detail;
  const provider =
    opportunity.provider_name ||
    opportunity.university_name ||
    opportunity.company_name ||
    "Provider not listed";
  const detailHref =
    opportunity.opportunity_type === "scholarship" ? `/scholarships/${opportunity.slug}` : "#";
  const deadlineBadge = getDeadlineBadge(opportunity.deadline);
  const degreeTags = opportunity.degree_levels.slice(0, 3);
  const extraDegreeCount = Math.max(opportunity.degree_levels.length - degreeTags.length, 0);

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    setMessage(null);

    try {
      await deleteSavedOpportunity(saved.id);
      onRemoved(saved.id);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemoving(false);
    }
  }

  async function handleStartTracking() {
    setStarting(true);
    setError(null);
    setMessage(null);

    try {
      await startApplicationFromSaved(saved.id);
      setMessage("Application added to your tracker.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="mint">{humanize(opportunity.opportunity_type)}</Badge>
              <Badge tone={deadlineBadge.tone}>{deadlineBadge.label}</Badge>
              {opportunity.verified_status ? <Badge tone="sky">Verified</Badge> : null}
            </div>

            <h2 className="mt-4 text-xl font-bold text-ink">{opportunity.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {provider} · {opportunity.country || "Country not listed"}
            </p>

            {opportunity.short_description ? (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">
                {opportunity.short_description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
              {degreeTags.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {extraDegreeCount > 0 ? <Badge tone="neutral">+{extraDegreeCount} more</Badge> : null}
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-pine/10 bg-[#f7faf8] p-4 text-sm lg:w-56">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Funding</p>
              <p className="mt-1 font-semibold text-ink">{humanize(opportunity.funding_type)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Deadline</p>
              <p className="mt-1 font-semibold text-ink">{formatDate(opportunity.deadline)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Saved</p>
              <p className="mt-1 font-semibold text-ink">{formatDate(saved.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href={detailHref} className="w-full sm:w-auto" variant="outline">
            View Details
            <ArrowRight size={16} aria-hidden="true" />
          </ButtonLink>

          <Button
            className="w-full sm:w-auto"
            disabled={starting}
            onClick={handleStartTracking}
            variant="primary"
          >
            <ClipboardCheck size={16} aria-hidden="true" />
            {starting ? "Starting..." : "Start Tracking"}
          </Button>

          <Button
            className="w-full sm:w-auto"
            disabled={removing}
            onClick={handleRemove}
            variant="ghost"
          >
            <Trash2 size={16} aria-hidden="true" />
            {removing ? "Removing..." : "Remove"}
          </Button>
        </div>

        {message ? <p className="mt-4 text-sm font-semibold text-pine">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
      </CardContent>
    </Card>
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

  const savedItems = useMemo(() => data?.results ?? [], [data]);

  const deadlineStats = useMemo(() => {
    const urgent = savedItems.filter((item) => {
      const days = getDaysUntilDeadline(item.opportunity_detail.deadline);
      return days !== null && days >= 0 && days <= 14;
    }).length;

    const expired = savedItems.filter((item) => {
      const days = getDaysUntilDeadline(item.opportunity_detail.deadline);
      return days !== null && days < 0;
    }).length;

    const rolling = savedItems.filter((item) => item.opportunity_detail.deadline === null).length;

    return { urgent, expired, rolling };
  }, [savedItems]);

  return (
    <DashboardShell
      description="Review scholarships and opportunities you saved, then decide what to apply for next."
      title="Saved Opportunities"
    >
      <div className="space-y-5">
        <section className="rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-soft">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Saved</p>
                <p className="mt-1 text-2xl font-bold text-ink">
                  {data?.count ?? savedItems.length}
                </p>
                <p className="mt-1 text-xs text-ink/50">Total shortlist</p>
              </div>

              <div className="rounded-2xl border border-saffron/30 bg-saffron/15 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Urgent</p>
                <p className="mt-1 text-2xl font-bold text-ink">{deadlineStats.urgent}</p>
                <p className="mt-1 text-xs text-ink/50">Due within 14 days</p>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-skyglass px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Rolling</p>
                <p className="mt-1 text-2xl font-bold text-ink">{deadlineStats.rolling}</p>
                <p className="mt-1 text-xs text-ink/50">No fixed deadline</p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Expired</p>
                <p className="mt-1 text-2xl font-bold text-ink">{deadlineStats.expired}</p>
                <p className="mt-1 text-xs text-ink/50">Review or remove</p>
              </div>
            </div>

            <div className="grid gap-2 sm:flex xl:justify-end">
              <ButtonLink href="/scholarships" className="w-full sm:w-auto" size="sm">
                Browse More
                <Search size={15} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink
                href="/dashboard/applications"
                className="w-full sm:w-auto"
                size="sm"
                variant="outline"
              >
                Open Tracker
              </ButtonLink>
            </div>
          </div>
        </section>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-ink/70">
              Loading saved opportunities...
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && savedItems.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/scholarships">
                Browse Scholarships
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description="Save scholarships you want to revisit, compare, or prepare for later. Your shortlist will appear here."
            icon={<ShieldCheck size={22} aria-hidden="true" />}
            title="You have not saved any opportunities yet"
          />
        ) : null}

        {!loading && !error && savedItems.length > 0 ? (
          <section className="grid gap-4">
            {savedItems.map((saved) => (
              <SavedOpportunityCard key={saved.id} saved={saved} onRemoved={handleRemoved} />
            ))}
          </section>
        ) : null}
      </div>
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
