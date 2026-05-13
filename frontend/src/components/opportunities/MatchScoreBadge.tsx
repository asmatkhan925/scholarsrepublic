"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AlertCircle, CheckCircle2, Sparkles, X } from "lucide-react";

import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { OpportunityMatch } from "@/types/opportunity";

type MatchScoreBadgeProps = {
  match: OpportunityMatch;
};

function getMatchClassName(score: number) {
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100";
  }
  if (score >= 60) {
    return "border-pine/20 bg-mint text-pine hover:border-pine/35 hover:bg-mint/80";
  }
  if (score >= 40) {
    return "border-saffron/40 bg-saffron/20 text-ink hover:border-saffron/60 hover:bg-saffron/30";
  }
  return "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100";
}

function getReadinessClassName(readinessLevel: OpportunityMatch["readiness_level"]) {
  if (readinessLevel === "High") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (readinessLevel === "Medium") {
    return "border-saffron/40 bg-saffron/20 text-ink";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function clampScore(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function MatchDetailSection({
  title,
  items,
  icon,
  tone = "pine",
}: {
  title: string;
  items: string[];
  icon: "check" | "alert" | "sparkle";
  tone?: "pine" | "saffron";
}) {
  const Icon = icon === "check" ? CheckCircle2 : icon === "alert" ? AlertCircle : Sparkles;
  const iconClassName = tone === "saffron" ? "text-saffron" : "text-pine";

  return (
    <section className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-4">
      <div className="flex items-center gap-2">
        <Icon size={17} className={iconClassName} aria-hidden="true" />
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </div>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/68">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pine/55" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MatchScoreBadge({ match }: MatchScoreBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const score = clampScore(match.score);

  const matchedReasons = useMemo(() => uniqueItems(match.matched_reasons ?? []), [match]);
  const missingOrWeakFactors = useMemo(
    () => uniqueItems([...(match.missing_requirements ?? []), ...(match.warnings ?? [])]),
    [match],
  );
  const suggestions = useMemo(() => uniqueItems(match.suggestions ?? []), [match]);

  const whyItems =
    matchedReasons.length > 0
      ? matchedReasons.slice(0, 5)
      : [
          "This score is based on your saved profile, study level, field, country preferences, and scholarship requirements where available.",
        ];

  const improveItems =
    missingOrWeakFactors.length > 0
      ? missingOrWeakFactors.slice(0, 5)
      : ["Complete your profile to improve recommendation accuracy."];

  const nextStepItems =
    suggestions.length > 0
      ? suggestions.slice(0, 3)
      : [
          score >= 70
            ? "Shortlist this scholarship and confirm final requirements on the official source before applying."
            : "Update your profile and review the scholarship requirements before deciding whether to apply.",
        ];

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDialog, isOpen]);

  const modal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 px-3 py-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-3xl border border-pine/10 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-pine/10 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                  Scholarship fit
                </p>
                <h2 id={titleId} className="mt-1 text-xl font-bold text-ink">
                  Profile match
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDialog}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pine/10 bg-white text-ink/65 transition hover:bg-mint/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/25"
                aria-label="Close match details"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-5rem)] overflow-y-auto px-5 py-5">
              <div className="rounded-2xl border border-pine/10 bg-mint/35 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink/58">Overall match score</p>
                    <p className="mt-1 text-4xl font-black tracking-tight text-pine">
                      {score}
                      <span className="text-xl font-bold text-ink/45">% match</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-bold",
                      getReadinessClassName(match.readiness_level),
                    )}
                  >
                    {match.readiness_level} readiness
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-pine" style={{ width: `${score}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/65">
                  This score is based on your profile, study level, field, country preferences, and
                  available scholarship requirements.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <MatchDetailSection title="Why this matches" items={whyItems} icon="check" />
                <MatchDetailSection
                  title="What to improve"
                  items={improveItems}
                  icon="alert"
                  tone="saffron"
                />
                <MatchDetailSection title="Next step" items={nextStepItems} icon="sparkle" />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-xs leading-5 text-ink/50">
                  Keep your profile current so recommendations reflect your latest documents,
                  target countries, and study plans.
                </p>
                <ButtonLink href="/dashboard/profile" size="sm" variant="secondary">
                  Update profile
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          "group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-left shadow-sm ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/25 focus-visible:ring-offset-2",
          getMatchClassName(score),
        )}
        aria-label={`View profile match details: ${score}% match`}
      >
        <span className="text-base font-black leading-none tracking-tight">{score}%</span>
        <span className="h-4 w-px bg-current opacity-25" aria-hidden="true" />
        <span className="text-xs font-bold leading-none">Profile match</span>
      </button>

      {modal}
    </>
  );
}
