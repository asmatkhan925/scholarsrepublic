import type { SelectHTMLAttributes } from "react";

import { FieldShell } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Select({ className, label, hint, error, children, ...props }: SelectProps) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <select
        className={cn(
          "w-full rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
