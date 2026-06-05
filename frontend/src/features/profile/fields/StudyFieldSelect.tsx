"use client";

import { useState } from "react";
import type { FieldCategoryMap } from "../profile-constants";

export function StudyFieldSelect({
  label,
  value,
  fieldCategories,
  onChange,
}: {
  label: string;
  value: string;
  fieldCategories: FieldCategoryMap;
  onChange: (value: string) => void;
}) {
  const categoryNames = Object.keys(fieldCategories);
  const [category, setCategory] = useState(categoryNames[0] ?? "");

  const fieldsForCategory = category ? (fieldCategories[category] ?? []) : [];
  const listId = `study-field-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <div className="grid min-w-0 gap-1.5 md:col-span-2 xl:col-span-2">
      <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>

      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(9rem,12rem)_minmax(14rem,1fr)]">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          aria-label={`${label} category`}
        >
          {categoryNames.map((categoryName) => (
            <option key={categoryName} value={categoryName}>
              {categoryName}
            </option>
          ))}
        </select>

        <input
          list={listId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Select or write your field"
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
          aria-label={label}
        />

        <datalist id={listId}>
          {fieldsForCategory.map((fieldName) => (
            <option key={fieldName} value={fieldName} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
