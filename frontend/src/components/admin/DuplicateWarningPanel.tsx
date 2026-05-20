"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";

import { Badge, ButtonLink } from "@/components/ui";
import type { AdminOpportunityDuplicateMatch } from "@/types/opportunity";

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function confidenceTone(confidence: AdminOpportunityDuplicateMatch["confidence"]) {
  return confidence === "exact" ? "danger" : "saffron";
}

export function DuplicateWarningPanel({
  matches,
  compact = false,
}: {
  matches: AdminOpportunityDuplicateMatch[];
  compact?: boolean;
}) {
  if (matches.length === 0) {
    return null;
  }

  const hasExact = matches.some((match) => match.confidence === "exact");

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${
        hasExact
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200"
          : "border-saffron/30 bg-saffron/10 text-ink/75 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/70"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {hasExact ? "Existing scholarship likely already exists" : "Possible existing scholarship"}
          </p>
          <div className={compact ? "mt-2 grid gap-1.5" : "mt-2 grid gap-2"}>
            {matches.slice(0, compact ? 2 : 4).map((match) => (
              <div
                key={match.id}
                className="rounded-lg border border-black/5 bg-white/70 px-2.5 py-2 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={confidenceTone(match.confidence)}>
                    {humanize(match.confidence)}
                  </Badge>
                  <Badge tone="neutral">{humanize(match.status)}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 font-bold text-ink dark:text-white">
                  {match.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-ink/60 dark:text-white/55">
                  {match.reasons.join(", ")}
                  {match.provider_name ? ` · ${match.provider_name}` : ""}
                  {match.country ? ` · ${match.country}` : ""}
                  {match.deadline ? ` · ${match.deadline}` : ""}
                </p>
                <div className="mt-2">
                  <ButtonLink
                    href={`/dashboard/admin/scholarships/${match.id}/edit`}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                  >
                    Open existing
                    <ExternalLink size={13} aria-hidden="true" />
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
          {hasExact ? (
            <p className="mt-2 text-xs font-semibold">
              Exact matches should not be imported as a new scholarship. Open the existing record
              and update it if needed.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
