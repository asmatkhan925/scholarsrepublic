"use client";

export function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-xl border border-pine/10 bg-white px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-mint/35 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:bg-white/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-pine"
      />
      <span>{label}</span>
    </label>
  );
}
