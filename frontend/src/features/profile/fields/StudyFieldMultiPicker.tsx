"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { FieldCategoryMap } from "../profile-constants";

export function StudyFieldMultiPicker({
  label,
  values,
  fieldCategories,
  onChange,
}: {
  label: string;
  values: string[];
  fieldCategories: FieldCategoryMap;
  onChange: (value: string[]) => void;
}) {
  const categoryNames = Object.keys(fieldCategories);
  const [category, setCategory] = useState(categoryNames[0] ?? "");
  const [field, setField] = useState("");

  const fieldsForCategory = category ? (fieldCategories[category] ?? []) : [];
  const availableFields = fieldsForCategory.filter((fieldName) => !values.includes(fieldName));
  const listId = `target-field-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  function addField(fieldName: string) {
    const cleaned = fieldName.trim();

    if (!cleaned || values.includes(cleaned)) {
      return;
    }

    onChange([...values, cleaned]);
    setField("");
  }

  function removeField(fieldName: string) {
    onChange(values.filter((item) => item !== fieldName));
  }

  return (
    <div className="grid min-w-0 gap-1.5">
      <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>

      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(9rem,12rem)_minmax(18rem,1fr)_auto]">
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setField("");
          }}
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
          value={field}
          onChange={(event) => setField(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addField(field);
            }
          }}
          placeholder="Select or write target field"
          className="min-w-0 w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
          aria-label={label}
        />

        <datalist id={listId}>
          {availableFields.map((fieldName) => (
            <option key={fieldName} value={fieldName} />
          ))}
        </datalist>

        <Button
          type="button"
          onClick={() => addField(field)}
          disabled={!field.trim()}
          variant="outline"
        >
          Add
        </Button>
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((fieldName) => (
            <button
              key={fieldName}
              type="button"
              onClick={() => removeField(fieldName)}
              className="rounded-full border border-pine/15 bg-mint px-2.5 py-1 text-xs font-semibold text-pine transition hover:bg-saffron/20 dark:border-pine/25 dark:bg-pine/10"
            >
              {fieldName} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-ink/45 dark:text-white/45">
          Choose a suggestion or type your own field, then add it.
        </p>
      )}
    </div>
  );
}
