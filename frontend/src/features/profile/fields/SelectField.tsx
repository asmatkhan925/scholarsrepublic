"use client";

import type { StudentProfilePayload } from "@/types/profile";
import type { FieldName, SelectOption } from "../profile-constants";
import { getTextInputValue } from "../profile-utils";

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: StudentProfilePayload[FieldName];
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/80 dark:text-white/75">
      {label}
      <select
        value={getTextInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
      >
        <option value="">Select</option>
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const labelText = typeof option === "string" ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {labelText}
            </option>
          );
        })}
      </select>
    </label>
  );
}
