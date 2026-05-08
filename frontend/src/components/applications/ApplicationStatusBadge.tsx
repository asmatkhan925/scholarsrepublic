import type { ApplicationStatus } from "@/types/opportunity";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  preparing: "Preparing",
  documents_pending: "Documents Pending",
  documents_ready: "Documents Ready",
  applied: "Applied",
  interview: "Interview",
  result_waiting: "Result Waiting",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  deferred: "Deferred",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  preparing: "bg-skyglass text-ink",
  documents_pending: "bg-amber-50 text-amber-800",
  documents_ready: "bg-mint text-pine",
  applied: "bg-blue-50 text-blue-800",
  interview: "bg-violet-50 text-violet-800",
  result_waiting: "bg-indigo-50 text-indigo-800",
  selected: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-stone-100 text-stone-700",
  deferred: "bg-orange-50 text-orange-800",
};

export function applicationStatusLabel(status: ApplicationStatus) {
  return STATUS_LABELS[status];
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`rounded px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
