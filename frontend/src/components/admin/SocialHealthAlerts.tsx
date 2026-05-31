"use client";

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

import { Badge, ButtonLink } from "@/components/ui";
import type { SocialSchedulerStatusResponse } from "@/lib/api";

type SocialHealthAlert = SocialSchedulerStatusResponse["health_alerts"][number];

const levelOrder: Record<SocialHealthAlert["level"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const levelMeta: Record<
  SocialHealthAlert["level"],
  {
    label: string;
    badgeTone: "danger" | "saffron" | "sky";
    cardClass: string;
    iconClass: string;
    icon: typeof ShieldAlert;
  }
> = {
  critical: {
    label: "Critical",
    badgeTone: "danger",
    cardClass: "border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-950/20",
    iconClass: "text-red-700 dark:text-red-300",
    icon: ShieldAlert,
  },
  warning: {
    label: "Warning",
    badgeTone: "saffron",
    cardClass: "border-saffron/45 bg-[#fff8eb] dark:border-saffron/30 dark:bg-saffron/10",
    iconClass: "text-[#9b6517] dark:text-saffron",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    badgeTone: "sky",
    cardClass: "border-skyglass bg-skyglass/35 dark:border-white/10 dark:bg-white/5",
    iconClass: "text-pine dark:text-mint",
    icon: Info,
  },
};

function sortedAlerts(alerts: SocialHealthAlert[]) {
  return [...alerts].sort((left, right) => {
    const levelDelta = levelOrder[left.level] - levelOrder[right.level];
    if (levelDelta !== 0) {
      return levelDelta;
    }
    return left.code.localeCompare(right.code);
  });
}

export function SocialHealthAlerts({
  alerts,
  emptyLabel = "No social scheduler health alerts right now.",
}: {
  alerts: SocialHealthAlert[];
  emptyLabel?: string;
}) {
  const orderedAlerts = sortedAlerts(alerts);

  if (!orderedAlerts.length) {
    return (
      <section className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
              Queue health
            </p>
            <p className="mt-1 text-sm text-ink/60 dark:text-white/58">{emptyLabel}</p>
          </div>
          <Badge tone="mint">Healthy</Badge>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-pine/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181b1d]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
            Queue health
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            Alerts needing admin attention
          </h2>
        </div>
        <Badge tone={orderedAlerts[0].level === "critical" ? "danger" : "saffron"}>
          {orderedAlerts.length} alert{orderedAlerts.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-3">
        {orderedAlerts.map((alert) => {
          const meta = levelMeta[alert.level];
          const Icon = meta.icon;

          return (
            <article
              key={alert.code}
              className={`rounded-xl border p-3 ${meta.cardClass}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/75 shadow-sm dark:bg-black/10 ${meta.iconClass}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.badgeTone}>{meta.label}</Badge>
                      <span className="text-xs font-semibold text-ink/45 dark:text-white/45">
                        {alert.code}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-ink dark:text-white">
                      {alert.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-ink/68 dark:text-white/65">
                      {alert.message}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink dark:text-white">
                      {alert.suggested_action}
                    </p>
                  </div>
                </div>
                {alert.related_url ? (
                  <ButtonLink
                    href={alert.related_url}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    Open
                  </ButtonLink>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
