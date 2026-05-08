"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  startApplicationByOpportunitySlug,
  startApplicationByScholarshipSlug,
  startApplicationFromSaved,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityApplication, OpportunityType } from "@/types/opportunity";

type StartApplicationButtonProps = {
  opportunitySlug?: string;
  savedOpportunityId?: number;
  opportunityType?: OpportunityType;
  initiallyTracked?: boolean;
  onStarted?: (application: OpportunityApplication) => void;
};

export function StartApplicationButton({
  opportunitySlug,
  savedOpportunityId,
  opportunityType = "scholarship",
  initiallyTracked = false,
  onStarted,
}: StartApplicationButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [tracked, setTracked] = useState(initiallyTracked);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTracked(initiallyTracked);
  }, [initiallyTracked]);

  if (authLoading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center gap-2 rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink/50"
      >
        <ClipboardList size={16} aria-hidden="true" />
        Loading...
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
      >
        <ClipboardList size={16} aria-hidden="true" />
        Login to Track
      </Link>
    );
  }

  if (user?.role !== "student") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center gap-2 rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink/45"
      >
        <ClipboardList size={16} aria-hidden="true" />
        Student tracking only
      </button>
    );
  }

  async function handleStart() {
    if (tracked) {
      router.push("/dashboard/applications");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let application: OpportunityApplication;
      if (savedOpportunityId) {
        application = await startApplicationFromSaved(savedOpportunityId);
      } else if (opportunitySlug && opportunityType === "scholarship") {
        application = await startApplicationByScholarshipSlug(opportunitySlug);
      } else if (opportunitySlug) {
        application = await startApplicationByOpportunitySlug(opportunitySlug);
      } else {
        throw new Error("Missing opportunity to track.");
      }

      setTracked(true);
      onStarted?.(application);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleStart}
        disabled={submitting}
        aria-label={
          opportunitySlug
            ? `${tracked ? "View application for" : "Start tracking"} ${opportunitySlug}`
            : tracked
              ? "View application"
              : "Start tracking"
        }
        className={
          tracked
            ? "inline-flex items-center justify-center gap-2 rounded border border-pine/25 bg-mint px-4 py-2 text-sm font-semibold text-pine hover:bg-mint/80 disabled:opacity-60"
            : "inline-flex items-center justify-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90 disabled:opacity-60"
        }
      >
        <ClipboardList size={16} aria-hidden="true" />
        {submitting ? "Starting..." : tracked ? "View Application" : "Start Tracking"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
