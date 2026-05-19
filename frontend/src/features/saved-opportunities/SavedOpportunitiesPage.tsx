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
  const degreeTags = opportunity.degree_levels.slice(0, 2);
  const fieldTags = opportunity.fields_of_study.slice(0, 2);
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
      setMessage("Tracking started.");
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Could not start tracking. Please try again.");
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
      setMessage("Stopped tracking.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setStopping(false);
    }
  }

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_15.5rem]">
          <div className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={deadlineBadge.tone}>{deadlineBadge.label}</Badge>
              <Badge tone="neutral">{humanize(opportunity.funding_type)}</Badge>
              {opportunity.verified_status ? <Badge tone="mint">Verified</Badge> : null}
              {isTracking ? <Badge tone="saffron">Tracking</Badge> : null}
            </div>

            <h2 className="mt-2 text-lg font-bold leading-snug text-ink dark:text-white md:text-xl">
              {opportunity.title}
            </h2>

            <p className="mt-1.5 text-sm leading-5 text-ink/62 dark:text-white/58">
              {provider} · {opportunity.country || "Country not listed"}
            </p>

            {opportunity.short_description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/62 dark:text-white/56">
                {opportunity.short_description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{humanize(opportunity.opportunity_type)}</Badge>
              {degreeTags.map((degree) => (
                <Badge key={degree} tone="neutral">
                  {degree}
                </Badge>
              ))}
              {fieldTags.map((field) => (
                <Badge key={field} tone="sky">
                  {field}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink/50 dark:text-white/45">
              <span className="rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                Saved {formatDate(saved.created_at)}
              </span>
              <span
                className="cursor-help rounded-full border border-pine/10 bg-[#f7faf8] px-2.5 py-1 dark:border-white/10 dark:bg-white/5"
                title="Keep this saved only if you are likely to prepare a real application."
              >
                Shortlist item
              </span>
            </div>

            {message ? <p className="mt-2 text-sm font-semibold text-pine">{message}</p> : null}
            {error ? (
              <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
            ) : null}
          </div>

          <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <div className="rounded-xl bg-[#f7faf8] px-3 py-2 dark:bg-[#181b1d]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
                Deadline
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">
                {formatDate(opportunity.deadline)}
              </p>
            </div>

            <div className="mt-2 grid gap-2">
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
                className="w-full text-ink/55 hover:text-red-700 dark:text-white/50 dark:hover:text-red-300"
                disabled={removing}
                onClick={handleRemove}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={15} aria-hidden="true" />
                {removing ? "Removing..." : "Remove Saved"}
              </Button>
            </div>
          </aside>
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
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-3 py-3 transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 md:px-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem] xl:items-center">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                  Student dashboard
                </p>
                <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
                  Saved opportunities
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
                  Keep your shortlist clean and move serious options into your application tracker.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Saved
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {data?.count ?? savedItems.length}
                  </p>
                </div>

                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Urgent
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {deadlineStats.urgent}
                  </p>
                </div>

                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Rolling
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {deadlineStats.rolling}
                  </p>
                </div>

                <div className="rounded-xl border border-pine/10 bg-white/90 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Expired
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {deadlineStats.expired}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-ink/60 dark:text-white/55">
              Saved items are your shortlist. Track only the scholarships you seriously plan to apply for.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
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
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="p-6 text-sm text-ink/70 dark:text-white/60">
              Loading saved opportunities...
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
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
          <section className="grid gap-3">
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
