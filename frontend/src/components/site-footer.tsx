import Link from "next/link";

import { BadgeCheck, GraduationCap } from "lucide-react";

const footerGroups = [
  {
    label: "Explore",
    links: [
      { label: "Scholarships", href: "/scholarships" },
      { label: "Guides", href: "/guides" },
    ],
  },
  {
    label: "Support",
    links: [
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    label: "Trust & legal",
    links: [
      { label: "Verification Policy", href: "/verification-policy" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms", href: "/terms" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
] as const;

type SiteFooterProps = {
  variant?: "default" | "auth";
};

const footerLinkClassName =
  "inline-flex min-h-9 items-center rounded-lg py-1 text-sm font-medium text-ink/60 transition-colors hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-white/55 dark:hover:text-pine dark:focus-visible:ring-offset-[#101214]";

export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  if (variant === "auth") {
    return (
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            &copy; Scholars Republic. Helping students find and manage scholarship opportunities.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Auth footer navigation">
            <Link href="/scholarships" className="font-semibold transition hover:text-emerald-700">
              Scholarships
            </Link>
            <Link href="/guides" className="font-semibold transition hover:text-emerald-700">
              Guides
            </Link>
            <Link href="/about" className="font-semibold transition hover:text-emerald-700">
              About
            </Link>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-pine/10 bg-white/80 text-ink backdrop-blur-sm dark:border-white/10 dark:bg-[#101214] dark:text-white">
      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-6 sm:py-10 md:px-8">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.7fr))] lg:gap-10">
          <div className="max-w-lg">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101214]"
              aria-label="Scholars Republic home"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine text-white shadow-sm transition group-hover:bg-ink dark:group-hover:bg-white/10">
                <GraduationCap size={21} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <span className="block text-base font-bold tracking-[-0.01em] sm:text-lg">
                  Scholars Republic
                </span>
                <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-pine/70">
                  Let&apos;s grow together
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-ink/58 dark:text-white/55">
              Find reliable scholarship opportunities, understand the requirements, and keep your
              applications organized in one place.
            </p>

            <div className="mt-4 flex max-w-md items-start gap-2 text-xs leading-5 text-ink/48 dark:text-white/45">
              <BadgeCheck className="mt-0.5 shrink-0 text-pine" size={15} aria-hidden="true" />
              <span>Source context and verification notes are shown where available.</span>
            </div>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.label} aria-label={`${group.label} footer links`}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/35 dark:text-white/35">
                {group.label}
              </h2>
              <ul className="mt-2.5 space-y-0.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={footerLinkClassName}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2.5 border-t border-pine/10 pt-5 text-xs leading-5 text-ink/45 dark:border-white/10 dark:text-white/40 sm:mt-9 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p>&copy; {new Date().getFullYear()} Scholars Republic. All rights reserved.</p>
          <p className="max-w-2xl sm:text-right">
            Always confirm deadlines, eligibility, and requirements on the official scholarship
            page before applying.
          </p>
        </div>
      </div>
    </footer>
  );
}
