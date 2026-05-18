"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowRight, ClipboardCheck, Search, ShieldCheck, Trash2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  deleteApplication,
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
  const [stopping, setStopping] = useState(false);
  const [trackedApplicationId, setTrackedApplicationId] = useState<number | null>(
    saved.application_id,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const opportunity = saved.opportunity_detail;
  const provider =
    opportunity.provider_name ||
    opportunity.university_name ||
    opportunity.company_name ||
    "Provider not listed";
  const detailHref =
    opportunity.opportunity_type === "scholarship"
      ? `/scholarships/${opportunity.slug}`
      : "/scholarships";
  const deadlineBadge = getDeadlineBadge(opportunity.deadline);
  const degreeTags = opportunity.degree_levels.slice(0, 3);
  const extraDegreeCount = Math.max(opportunity.degree_levels.length - degreeTags.length, 0);
  const isTracking = trackedApplicationId !== null;

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
      const application = await startApplicationFromSaved(saved.id);
      setTrackedApplicationId(application.id);
      setMessage("Tracking started. You can stop tracking if this is no longer worth applying to.");
    } catch (requestError) {
      const errorMessage =
        getErrorMessage(requestError) ?? "Could not start tracking. Please try again.";
      setError(errorMessage);
    } finally {
      setStarting(false);
    }
  }

  async function handleStopTracking() {
    if (!trackedApplicationId) {
      return;
    }

    setStopping(true);
    setError(null);
    setMessage(null);

    try {
      await deleteApplication(trackedApplicationId);
      setTrackedApplicationId(null);
      setMessage("Stopped tracking. You can start tracking again later.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setStopping(false);
    }
  }

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1fr_17rem]">
          <div className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="mint">{humanize(opportunity.opportunity_type)}</Badge>
              <Badge tone={deadlineBadge.tone}>{deadlineBadge.label}</Badge>
              {opportunity.verified_status ? <Badge tone="sky">Verified</Badge> : null}
              {isTracking ? <Badge tone="saffron">Tracking</Badge> : null}
            </div>

            <h2 className="mt-3 text-lg font-bold leading-snug text-ink dark:text-white md:text-xl">
              {opportunity.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
              {provider} · {opportunity.country || "Country not listed"}
            </p>

            {opportunity.short_description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-white/58">
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

            <div className="mt-4 rounded-2xl bg-[#f7faf8] px-4 py-3 text-xs leading-5 text-ink/55 dark:bg-white/5 dark:text-white/50">
              Saved {formatDate(saved.created_at)}. Keep this saved only if you are likely to
              prepare a real application.
            </div>
          </div>

          <div className="border-t border-pine/10 bg-mint/35 p-4 dark:border-white/10 dark:bg-white/5 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                  Deadline
                </p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                  {formatDate(opportunity.deadline)}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                {isTracking ? (
                  <Button
                    className="w-full border border-saffron/40 bg-saffron/20 text-ink shadow-sm hover:bg-saffron/30 dark:text-white dark:hover:bg-saffron/25"
                    disabled={stopping}
                    onClick={handleStopTracking}
                    size="sm"
                    variant="outline"
                  >
                    <ClipboardCheck size={15} aria-hidden="true" />
                    {stopping ? "Stopping..." : "Stop Tracking"}
                  </Button>
                ) : (
                  <Button
                    className="w-full shadow-sm"
                    disabled={starting}
                    onClick={handleStartTracking}
                    size="sm"
                    variant="primary"
                  >
                    <ClipboardCheck size={15} aria-hidden="true" />
                    {starting ? "Starting..." : "Track Application"}
                  </Button>
                )}

                <ButtonLink href={detailHref} className="w-full" size="sm" variant="outline">
                  View Details
                  <ArrowRight size={15} aria-hidden="true" />
                </ButtonLink>

                <Button
                  className="w-full"
                  disabled={removing}
                  onClick={handleRemove}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {removing ? "Removing..." : "Remove Saved"}
                </Button>
              </div>
            </div>

            {message ? <p className="mt-3 text-sm font-semibold text-pine">{message}</p> : null}
            {error ? <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p> : null}
          </div>
        </div>
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
      hideHeader
      title="Saved Opportunities"
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-4 py-4 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pine">
                  Student dashboard
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink dark:text-white md:text-3xl">
                  Saved Opportunities
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                  Review your saved scholarships, remove weak options, and move serious choices into
                  your application tracker.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
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
          </div>

          <div className="grid divide-y divide-pine/10 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Saved</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{data?.count ?? savedItems.length}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Total shortlist</p>
            </div>

            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Urgent</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{deadlineStats.urgent}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Due within 14 days</p>
            </div>

            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Rolling</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{deadlineStats.rolling}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Flexible deadlines</p>
            </div>

            <div className="px-4 py-4 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">Expired</p>
              <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{deadlineStats.expired}</p>
              <p className="mt-1 text-xs text-ink/50 dark:text-white/45">Remove or review</p>
            </div>
          </div>
        </section>

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-6 text-sm text-ink/70 dark:text-white/60">
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
