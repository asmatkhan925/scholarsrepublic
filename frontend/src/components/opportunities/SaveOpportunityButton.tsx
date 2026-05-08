"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  saveOpportunityBySlug,
  saveScholarshipBySlug,
  unsaveOpportunityBySlug,
  unsaveScholarshipBySlug,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type SaveOpportunityButtonProps = {
  slug: string;
  opportunityType?: string;
  initiallySaved?: boolean;
  disabled?: boolean;
  onSavedChange?: (saved: boolean) => void;
};

export function SaveOpportunityButton({
  slug,
  opportunityType = "opportunity",
  initiallySaved = false,
  disabled = false,
  onSavedChange,
}: SaveOpportunityButtonProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState(initiallySaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isScholarship = opportunityType === "scholarship";

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved]);

  async function handleToggle() {
    setLoading(true);
    setError(null);

    try {
      if (saved) {
        if (isScholarship) {
          await unsaveScholarshipBySlug(slug);
        } else {
          await unsaveOpportunityBySlug(slug);
        }
        setSaved(false);
        onSavedChange?.(false);
      } else {
        if (isScholarship) {
          await saveScholarshipBySlug(slug);
        } else {
          await saveOpportunityBySlug(slug);
        }
        setSaved(true);
        onSavedChange?.(true);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <Link
        href="/login"
        className="rounded border border-ink/15 px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-ink/5"
      >
        Login to Save
      </Link>
    );
  }

  if (user?.role === "admin") {
    return (
      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/40"
      >
        Student save only
      </button>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={disabled || loading || authLoading}
        onClick={handleToggle}
        aria-label={saved ? `Remove saved ${slug}` : `Save ${slug}`}
        className={
          saved
            ? "rounded border border-pine/25 bg-mint px-4 py-2 text-sm font-semibold text-pine hover:bg-mint/70 disabled:opacity-60"
            : "rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90 disabled:opacity-60"
        }
      >
        {loading ? "Saving..." : saved ? "Remove Saved" : "Save Opportunity"}
      </button>
      {saved && <p className="text-xs font-semibold text-pine">Saved</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
