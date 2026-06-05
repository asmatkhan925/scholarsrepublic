"use client";

import { joinCommaList, splitCommaList } from "../profile-utils";

export function CommaField({
  label,
  values,
  helper,
  onChange,
}: {
  label: string;
  values: string[];
  helper: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/80 dark:text-white/75">
      {label}
      <input
        value={joinCommaList(values)}
        onChange={(event) => onChange(splitCommaList(event.target.value))}
        className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
        placeholder="Separate items with commas"
      />
      <span className="text-xs leading-5 text-ink/45 dark:text-white/45">{helper}</span>
    </label>
  );
}
