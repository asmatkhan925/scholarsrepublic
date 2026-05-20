"use client";

import { useMemo, useState } from "react";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui";
import type { OpportunityPathwayDetail } from "@/types/opportunity";

type PathwaySelectProps = {
  label?: string;
  pathways: OpportunityPathwayDetail[];
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
};

export function PathwaySelect({
  label = "Pathway",
  pathways,
  value,
  onChange,
  disabled = false,
}: PathwaySelectProps) {
  const [search, setSearch] = useState("");
  const selected = pathways.find((pathway) => pathway.id === value) ?? null;
  const normalizedSearch = search.trim().toLowerCase();
  const visiblePathways = useMemo(() => {
    const sorted = [...pathways].sort((first, second) => {
      return first.full_path.localeCompare(second.full_path);
    });

    if (!normalizedSearch) {
      return sorted.slice(0, 80);
    }

    return sorted
      .filter((pathway) => {
        return (
          pathway.full_path.toLowerCase().includes(normalizedSearch) ||
          pathway.slug.toLowerCase().includes(normalizedSearch) ||
          pathway.pathway_type.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 80);
  }, [normalizedSearch, pathways]);

  return (
    <div className="grid gap-2 text-sm font-semibold text-ink dark:text-white">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {selected ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            <X size={14} aria-hidden="true" />
            Clear pathway
          </Button>
        ) : null}
      </div>

      {selected ? (
        <div className="rounded-xl border border-pine/15 bg-pine/5 px-3 py-2 text-xs font-bold text-pine dark:border-pine/25 dark:bg-pine/10">
          {selected.full_path}
        </div>
      ) : (
        <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-xs font-bold text-ink/60 dark:border-saffron/25 dark:text-white/58">
          No pathway assigned
        </div>
      )}

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/35"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 disabled:opacity-60 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
          placeholder="Search pathway..."
        />
      </div>

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        disabled={disabled}
        className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 disabled:opacity-60 dark:border-white/10 dark:bg-[#101214] dark:text-white"
      >
        <option value="">No pathway assigned</option>
        {visiblePathways.map((pathway) => (
          <option key={pathway.id} value={pathway.id}>
            {pathway.full_path}
          </option>
        ))}
      </select>
    </div>
  );
}
