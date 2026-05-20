import Link from "next/link";
import type { ReactNode } from "react";

import { AlertTriangle, ArrowLeft, Loader2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

type Tone = "normal" | "success" | "warning" | "danger" | "info";

const metricToneClasses: Record<Tone, string> = {
  normal: "border-pine/10 bg-white dark:border-white/10 dark:bg-white/5",
  success: "border-pine/20 bg-pine/5 dark:border-pine/25 dark:bg-pine/10",
  warning: "border-saffron/30 bg-saffron/10 dark:border-saffron/25 dark:bg-saffron/10",
  danger: "border-red-200 bg-red-50 dark:border-red-400/25 dark:bg-red-500/10",
  info: "border-sky-200 bg-skyglass/60 dark:border-sky-400/25 dark:bg-skyglass/10",
};

const metricValueClasses: Record<Tone, string> = {
  normal: "text-ink dark:text-white",
  success: "text-pine dark:text-mint",
  warning: "text-ink dark:text-white",
  danger: "text-red-700 dark:text-red-300",
  info: "text-ink dark:text-white",
};

export function AdminMetric({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={cn("rounded-xl border px-2.5 py-2", metricToneClasses[tone])}>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
        {label}
      </p>
      <p className={cn("mt-0.5 text-base font-black leading-none", metricValueClasses[tone])}>
        {value}
      </p>
    </div>
  );
}

export function AdminHero({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  icon: Icon,
  actions,
  metrics,
  note,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  backHref?: string;
  backLabel?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  metrics?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
      <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="px-4 py-4 md:px-5">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {backLabel ?? "Back"}
            </Link>
          ) : null}

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine",
              backHref ? "mt-2" : "",
            )}
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {eyebrow}
          </div>

          <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
            <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
              {title}
            </h1>
            <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
              {description}
            </p>
          </div>

          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
          {metrics ? <div className="grid grid-cols-2 gap-1.5">{metrics}</div> : note}
        </div>
      </div>
    </section>
  );
}

export function AdminNotice({
  children,
  tone = "info",
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-sm font-semibold leading-6",
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300"
          : tone === "warning"
            ? "border-saffron/30 bg-saffron/10 text-ink/75 dark:border-saffron/25 dark:bg-saffron/10 dark:text-white/65"
            : "border-pine/20 bg-pine/5 text-pine dark:border-pine/20 dark:bg-pine/10",
      )}
    >
      <div className="flex gap-2">
        <span className="mt-0.5 shrink-0">
          {icon ?? (tone === "warning" ? <AlertTriangle size={15} aria-hidden="true" /> : null)}
        </span>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function AdminLoading({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-pine/10 bg-white p-6 text-sm text-ink/70 shadow-sm dark:border-white/10 dark:bg-[#181b1d] dark:text-white/60">
      <div className="flex items-center gap-2">
        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}

export function AdminFilterButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition",
        active
          ? "border-pine bg-pine text-white shadow-sm"
          : "border-pine/15 bg-white text-pine hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
      )}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px]",
            active ? "bg-white/20 text-white" : "bg-pine/10 text-pine",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
