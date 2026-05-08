import type { ApplicationPriority } from "@/types/opportunity";

const PRIORITY_LABELS: Record<ApplicationPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_STYLES: Record<ApplicationPriority, string> = {
  low: "bg-skyglass text-ink/70",
  medium: "bg-amber-50 text-amber-800",
  high: "bg-red-50 text-red-700",
};

export function applicationPriorityLabel(priority: ApplicationPriority) {
  return PRIORITY_LABELS[priority];
}

export function ApplicationPriorityBadge({ priority }: { priority: ApplicationPriority }) {
  return (
    <span className={`rounded px-3 py-1 text-xs font-semibold ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]} Priority
    </span>
  );
}
