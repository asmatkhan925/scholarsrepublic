"use client";

import { PROFILE_SECTION_LINKS, SECTION_MISSING_LABELS } from "./profile-constants";

interface Props {
  missingFields?: string[];
  missingDocuments?: string[];
}

export function ProfileSectionNav({ missingFields = [], missingDocuments = [] }: Props) {
  const allMissing = new Set([...missingFields, ...missingDocuments]);

  function sectionHasMissing(href: string) {
    const labels = SECTION_MISSING_LABELS[href] ?? [];
    return labels.some((l) => allMissing.has(l));
  }

  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-[4.75rem] z-30 overflow-x-auto rounded-2xl border border-pine/10 bg-white/95 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#181b1d]/95"
    >
      <div className="flex min-w-max items-center gap-1">
        <span className="hidden rounded-xl px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-pine sm:inline-flex">
          Sections
        </span>

        {PROFILE_SECTION_LINKS.map((item) => {
          const incomplete = allMissing.size > 0 && sectionHasMissing(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className="relative inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold text-ink/65 transition hover:bg-mint hover:text-pine dark:text-white/62 dark:hover:bg-pine/15 dark:hover:text-pine"
            >
              {item.label}
              {incomplete && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-saffron"
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
