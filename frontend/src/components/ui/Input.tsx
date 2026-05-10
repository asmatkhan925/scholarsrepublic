import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldShellProps = {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FieldShell({ label, hint, error, children }: FieldShellProps) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-semibold text-ink">{label}</span> : null}
      {children}
      {error ? (
        <span className="block text-sm text-red-600">{error}</span>
      ) : hint ? (
        <span className="block text-xs leading-5 text-ink/55">{hint}</span>
      ) : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ className, label, hint, error, ...props }: InputProps) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <input
        className={cn(
          "w-full rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
