"use client";

export function MultiCheckboxField({
  label,
  values,
  options,
  helper,
  onToggle,
}: {
  label: string;
  values: string[];
  options: string[];
  helper?: string;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>
        {helper ? <p className="mt-1 text-xs leading-5 text-ink/45 dark:text-white/45">{helper}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option);

          return (
            <label
              key={option}
              className={
                checked
                  ? "flex items-center gap-2 rounded-xl border border-pine bg-mint px-3 py-2 text-sm font-medium text-pine dark:border-pine/30 dark:bg-pine/15"
                  : "flex items-center gap-2 rounded-xl border border-pine/10 bg-white px-3 py-2 text-sm font-medium text-ink/65 transition hover:bg-mint/35 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:bg-white/10"
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="h-4 w-4 accent-pine"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}
