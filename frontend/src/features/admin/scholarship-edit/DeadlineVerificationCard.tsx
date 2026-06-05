"use client";

import { Loader2, ShieldCheck } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import type { DeadlineVerificationPackage, OpportunityDetail } from "@/types/opportunity";

type DeadlineVerificationCardProps = {
  opportunity: OpportunityDetail;
  deadlinePackage: DeadlineVerificationPackage | null;
  deadlineChecking: boolean;
  deadlineApplying: boolean;
  deadlineMessage: string;
  deadlineError: string;
  onPrepare: () => void;
  onApply: (date: string, evidence: string, sourceUrl: string) => void;
};

export function DeadlineVerificationCard({
  opportunity,
  deadlinePackage,
  deadlineChecking,
  deadlineApplying,
  deadlineMessage,
  deadlineError,
  onPrepare,
  onApply,
}: DeadlineVerificationCardProps) {
  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="grid gap-3 p-3 md:p-4">
        <div>
          <h2 className="text-lg font-bold text-ink dark:text-white">Deadline Verification</h2>
          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/50">
            Prepare evidence for GPT review, then apply only a verified detected deadline.
          </p>
        </div>

        <div className="grid gap-1.5 text-xs leading-5 text-ink/70 dark:text-white/60">
          <div>Current deadline: {opportunity.deadline || "Missing"}</div>
          <div>Last checked: {opportunity.deadline_last_checked_at || "Never"}</div>
          <div>Status: {opportunity.deadline_check_status || "unchecked"}</div>
          <div>Confidence: {opportunity.deadline_check_confidence || "Not set"}</div>
          {opportunity.deadline_check_evidence ? (
            <div className="rounded-xl border border-pine/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
              {opportunity.deadline_check_evidence}
            </div>
          ) : null}
          {opportunity.social_image?.image_is_stale ? (
            <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 font-semibold text-ink dark:text-white">
              Deadline changed. Uploaded social image may contain old deadline. Upload a new image
              or use OG fallback.
            </div>
          ) : null}
        </div>

        {deadlineMessage ? (
          <div className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine">
            {deadlineMessage}
          </div>
        ) : null}
        {deadlineError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {deadlineError}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={() => onPrepare()}
          disabled={deadlineChecking}
        >
          {deadlineChecking ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck size={15} aria-hidden="true" />
          )}
          {deadlineChecking ? "Preparing..." : "Prepare GPT Deadline Check"}
        </Button>

        {deadlinePackage ? (
          <div className="grid gap-2 rounded-xl border border-pine/10 bg-white p-3 text-xs leading-5 dark:border-white/10 dark:bg-white/5">
            <div className="font-bold text-ink dark:text-white">Candidate dates</div>
            {deadlinePackage.candidate_dates.length > 0 ? (
              deadlinePackage.candidate_dates.slice(0, 4).map((candidate) => (
                <div key={`${candidate.date}-${candidate.evidence}`} className="grid gap-1">
                  <div className="font-semibold text-pine">{candidate.date}</div>
                  <div className="text-ink/65 dark:text-white/60">{candidate.evidence}</div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      onApply(
                        candidate.date,
                        candidate.evidence,
                        deadlinePackage.official_link || deadlinePackage.source_url,
                      )
                    }
                    disabled={deadlineApplying}
                  >
                    Apply detected deadline
                  </Button>
                </div>
              ))
            ) : (
              <div>No candidate dates found. Use GPT review for manual evidence.</div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
