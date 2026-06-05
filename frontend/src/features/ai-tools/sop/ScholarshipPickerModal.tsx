"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, X } from "lucide-react";

import type { OpportunityListItem } from "@/types/opportunity";
import {
  formatScholarshipDeadline,
  formatScholarshipMeta,
  getScholarshipDegree,
  getScholarshipField,
} from "./sop-utils";
import type { ScholarshipPickerItem } from "./types";

type ScholarshipPickerModalProps = {
  open: boolean;
  scholarships: ScholarshipPickerItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (scholarship: OpportunityListItem) => void;
  onRetry: () => void;
};

export function ScholarshipPickerModal({
  open,
  scholarships,
  loading,
  error,
  onClose,
  onSelect,
  onRetry,
}: ScholarshipPickerModalProps) {
  const [scholarshipSearch, setScholarshipSearch] = useState("");

  const filteredScholarships = useMemo(() => {
    const normalizedSearch = scholarshipSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return scholarships;
    }

    return scholarships.filter(({ scholarship }) => {
      const searchableText = [
        scholarship.title,
        scholarship.country,
        ...(scholarship.degree_levels ?? []),
        ...(scholarship.fields_of_study ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [scholarshipSearch, scholarships]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-3 py-6 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scholarship-picker-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <div>
            <h3 id="scholarship-picker-title" className="text-base font-bold text-ink dark:text-white">
              Choose scholarship
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/55">
              Saved scholarships appear first, followed by profile matches and other
              scholarships.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/10 text-ink/60 transition hover:bg-ink/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
            aria-label="Close scholarship picker"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-ink/10 p-3 dark:border-white/10">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
              aria-hidden="true"
            />
            <input
              value={scholarshipSearch}
              onChange={(event) => setScholarshipSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              placeholder="Search title, country, degree, or field"
              className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              autoFocus
            />
          </label>
        </div>

        <div className="overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 bg-cream/40 p-3 text-sm text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/58">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Loading scholarships...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
              {error}
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : filteredScholarships.length ? (
            <div className="grid gap-2">
              {filteredScholarships.map(({ scholarship, isSaved, matchScore }) => {
                const degree = getScholarshipDegree(scholarship);
                const field = getScholarshipField(scholarship);
                const deadline = formatScholarshipDeadline(scholarship.deadline);
                const metadata = formatScholarshipMeta([
                  scholarship.country,
                  degree,
                  field,
                  deadline ? `Deadline ${deadline}` : "",
                ]);

                return (
                  <button
                    key={scholarship.slug}
                    type="button"
                    onClick={() => onSelect(scholarship)}
                    className="rounded-xl border border-ink/10 bg-white p-3 text-left transition hover:border-pine/30 hover:bg-pine/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-pine/35 dark:hover:bg-pine/10"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-5 text-ink dark:text-white">
                          {scholarship.title}
                        </p>
                        {metadata ? (
                          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/55">
                            {metadata}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {isSaved ? (
                          <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[11px] font-semibold text-pine">
                            Saved
                          </span>
                        ) : null}
                        {matchScore !== null ? (
                          <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-[11px] font-semibold text-ink/70">
                            Match {Math.round(matchScore)}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-ink/10 bg-cream/40 p-3 text-sm leading-6 text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/58">
              No scholarships match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
