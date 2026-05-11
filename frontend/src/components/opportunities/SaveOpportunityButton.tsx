"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button, ButtonLink } from "@/components/ui";
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

  if (authLoading) {
    return (
      <Button className="w-full whitespace-nowrap" disabled size="sm" variant="outline">
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        Checking
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <ButtonLink href="/login" className="w-full whitespace-nowrap" size="sm" variant="secondary">
        <BookmarkPlus size={15} aria-hidden="true" />
        Login to Save
      </ButtonLink>
    );
  }

  if (user?.role === "admin") {
    return (
      <Button className="w-full whitespace-nowrap" disabled size="sm" variant="outline">
        <ShieldCheck size={15} aria-hidden="true" />
        Student Only
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <Button
        className={
          saved
            ? "w-full whitespace-nowrap border-pine/20 bg-mint/60 text-pine shadow-sm hover:bg-mint"
            : "w-full whitespace-nowrap shadow-sm"
        }
        disabled={disabled || loading}
        onClick={handleToggle}
        size="sm"
        variant={saved ? "outline" : "primary"}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : saved ? (
          <BookmarkCheck size={15} aria-hidden="true" />
        ) : (
          <BookmarkPlus size={15} aria-hidden="true" />
        )}
        {loading ? "Saving..." : saved ? "Remove Saved" : "Save"}
      </Button>

      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
