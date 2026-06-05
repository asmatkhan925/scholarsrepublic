"use client";

import { PROFILE_SECTION_LINKS } from "./profile-constants";

export function ProfileSectionNav() {
  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-[4.75rem] z-30 overflow-x-auto rounded-2xl border border-pine/10 bg-white/95 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#181b1d]/95"
    >
      <div className="flex min-w-max items-center gap-1">
        <span className="hidden rounded-xl px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-pine sm:inline-flex">
          Sections
        </span>

        {PROFILE_SECTION_LINKS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold text-ink/65 transition hover:bg-mint hover:text-pine dark:text-white/62 dark:hover:bg-pine/15 dark:hover:text-pine"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
