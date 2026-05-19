"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button, ButtonLink } from "@/components/ui";
import {
  startApplicationByOpportunitySlug,
  startApplicationByScholarshipSlug,
  startApplicationFromSaved,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";
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
  const pathname = usePathname();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const loginHref = buildAuthPath("/login", getSafeNextPath(pathname));
  const [tracked, setTracked] = useState(initiallyTracked);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTracked(initiallyTracked);
  }, [initiallyTracked]);

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
      setError(getErrorMessage(requestError) ?? "Could not start tracking. Please try again.");
    } finally {
      setSubmitting(false);
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
      <ButtonLink href={loginHref} className="w-full whitespace-nowrap" size="sm" variant="outline">
        <ClipboardCheck size={15} aria-hidden="true" />
        Login to Track
      </ButtonLink>
    );
  }

  if (user?.role !== "student") {
    return (
      <Button className="w-full whitespace-nowrap" disabled size="sm" variant="outline">
        Student tracking only
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <Button
        className="w-full whitespace-nowrap shadow-sm"
        disabled={submitting}
        onClick={handleStart}
        size="sm"
        variant={tracked ? "secondary" : "primary"}
      >
        {submitting ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <ClipboardCheck size={15} aria-hidden="true" />
        )}
        {submitting ? "Starting..." : tracked ? "View Tracker" : "Track Application"}
      </Button>

      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
