"use client";

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 text-sm font-semibold text-ink/75 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-pine/20 text-pine focus:ring-pine"
      />
    </label>
  );
}
