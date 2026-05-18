import type {
  ApplicationPriority,
  ApplicationStatus,
  ChecklistItem,
} from "@/types/opportunity";

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "preparing", label: "Preparing" },
  { value: "documents_pending", label: "Documents Pending" },
  { value: "documents_ready", label: "Documents Ready" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "result_waiting", label: "Result Waiting" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "deferred", label: "Deferred" },
];

export const PRIORITY_OPTIONS: { value: ApplicationPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export type QuickFilter =
  | "all"
  | "due_soon"
  | "overdue"
  | "high_priority"
  | "missing_sop"
  | "sop_ready"
  | "reminder_today"
  | "no_next_step"
  | "needs_work"
  | "ready";

export type TrackerSort = "smart" | "deadline" | "priority" | "updated" | "readiness";

export const TRACKER_SORT_OPTIONS: { value: TrackerSort; label: string }[] = [
  { value: "smart", label: "Smart" },
  { value: "deadline", label: "Deadline" },
  { value: "priority", label: "Priority" },
  { value: "updated", label: "Updated" },
  { value: "readiness", label: "Ready" },
];

export const TRACKER_QUICK_FILTER_VALUES: QuickFilter[] = [
  "all",
  "due_soon",
  "overdue",
  "high_priority",
  "missing_sop",
  "sop_ready",
  "reminder_today",
  "no_next_step",
  "needs_work",
  "ready",
];

export const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due_soon", label: "Due" },
  { value: "overdue", label: "Overdue" },
  { value: "high_priority", label: "High" },
  { value: "missing_sop", label: "No SOP" },
  { value: "sop_ready", label: "SOP" },
  { value: "reminder_today", label: "Remind" },
  { value: "no_next_step", label: "No step" },
  { value: "needs_work", label: "Weak" },
  { value: "ready", label: "Ready" },
];

export const DEFAULT_APPLICATION_CHECKLIST: ChecklistItem[] = [
  { label: "Review eligibility requirements", done: false },
  { label: "Prepare SOP", done: false },
  { label: "Prepare CV", done: false },
  { label: "Collect transcripts", done: false },
  { label: "Request recommendation letters", done: false },
  { label: "Prepare passport/CNIC or ID documents", done: false },
  { label: "Submit application before deadline", done: false },
];
