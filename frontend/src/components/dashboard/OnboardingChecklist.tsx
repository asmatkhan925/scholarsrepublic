"use client";

import { CheckCircle2, Circle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "sr_onboarding_dismissed";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface Props {
  profileComplete: boolean; // completion_percentage >= 40
  hasSaved: boolean;        // at least one saved scholarship
}

export function OnboardingChecklist({ profileComplete, hasSaved }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  const steps: Step[] = [
    {
      id: "verify",
      label: "Verify your email",
      description: "Done — your account is active.",
      href: "/dashboard",
      done: true,
    },
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add education, target countries, documents, and test scores.",
      href: "/dashboard/profile",
      done: profileComplete,
    },
    {
      id: "save",
      label: "Save a scholarship",
      description: "Browse scholarships and save the ones you want to apply for.",
      href: "/scholarships",
      done: hasSaved,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-dismiss when all steps are done
  useEffect(() => {
    if (allDone) {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
  }, [allDone]);

  if (dismissed || allDone) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-pine/15 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex items-start justify-between gap-3 border-b border-pine/10 bg-mint/30 px-4 py-3 dark:border-white/8 dark:bg-pine/10">
        <div>
          <p className="text-sm font-bold text-pine">Get started — {completedCount}/{steps.length} done</p>
          <p className="mt-0.5 text-xs text-ink/60 dark:text-white/50">
            Complete these steps to get the most out of Scholars Republic.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss checklist"
          className="mt-0.5 shrink-0 rounded-lg p-1 text-ink/40 hover:bg-pine/10 hover:text-pine dark:text-white/35 dark:hover:text-pine"
        >
          <X size={15} />
        </button>
      </div>

      <div className="divide-y divide-pine/8 dark:divide-white/8">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3 px-4 py-3">
            {step.done ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-pine" aria-hidden="true" />
            ) : (
              <Circle size={18} className="mt-0.5 shrink-0 text-ink/25 dark:text-white/25" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${step.done ? "text-ink/45 line-through dark:text-white/35" : "text-ink dark:text-white"}`}>
                {step.done ? (
                  step.label
                ) : (
                  <Link href={step.href} className="hover:text-pine hover:underline underline-offset-2">
                    {step.label}
                  </Link>
                )}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-xs text-ink/55 dark:text-white/45">{step.description}</p>
              )}
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="shrink-0 rounded-lg border border-pine/20 bg-white px-2.5 py-1 text-xs font-semibold text-pine hover:bg-mint dark:border-pine/30 dark:bg-pine/10 dark:hover:bg-pine/20"
              >
                Go →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
