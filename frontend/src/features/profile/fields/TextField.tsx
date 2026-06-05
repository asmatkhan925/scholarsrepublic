"use client";

import type { StudentProfilePayload } from "@/types/profile";
import type { FieldName } from "../profile-constants";
import { getTextInputValue, sanitizePhoneNumber } from "../profile-utils";

export function TextField({
  label,
  type = "text",
  helper,
  placeholder,
  value,
  min,
  max,
  step,
  inputMode,
  maxLength,
  onChange,
}: {
  label: string;
  type?: string;
  helper?: string;
  placeholder?: string;
  value: StudentProfilePayload[FieldName];
  min?: number | string;
  max?: number | string;
  step?: number | string;
  inputMode?: "text" | "tel" | "url" | "numeric" | "decimal";
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  function handleChange(rawValue: string) {
    if (type === "number") {
      if (rawValue === "") {
        onChange("");
        return;
      }

      if (!/^\d*\.?\d*$/.test(rawValue)) {
        return;
      }

      const parsed = Number(rawValue);

      if (Number.isNaN(parsed)) {
        return;
      }

      let next = parsed;
      const minValue = typeof min === "number" ? min : undefined;
      const maxValue = typeof max === "number" ? max : undefined;

      if (typeof minValue === "number" && next < minValue) {
        next = minValue;
      }

      if (typeof maxValue === "number" && next > maxValue) {
        next = maxValue;
      }

      onChange(String(next));
      return;
    }

    if (type === "tel") {
      onChange(sanitizePhoneNumber(rawValue));
      return;
    }

    onChange(rawValue);
  }

  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/80 dark:text-white/75">
      {label}
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        maxLength={maxLength}
        value={getTextInputValue(value)}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
      />
      {helper ? <span className="text-xs leading-5 text-ink/45 dark:text-white/45">{helper}</span> : null}
    </label>
  );
}
