import type { TextareaHTMLAttributes } from "react";

import { FieldShell } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ className, label, hint, error, ...props }: TextareaProps) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <textarea
        className={cn(
          "min-h-28 w-full rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
