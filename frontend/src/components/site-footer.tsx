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
    label: "Help & trust",
    links: [
      { label: "About", href: "/about" },
      { label: "Verification Policy", href: "/verification-policy" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    label: "Legal",
    links: [
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
  "inline-flex min-h-9 items-center rounded-lg py-1 text-sm font-semibold text-ink/60 transition-colors hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7faf8]";

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
    <footer className="border-t border-pine/10 bg-[#f7faf8] text-ink">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 md:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="max-w-xl lg:col-span-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/25 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7faf8]"
              aria-label="Scholars Republic home"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine transition-transform group-hover:-translate-y-0.5">
                <GraduationCap size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-bold tracking-[-0.01em] text-ink sm:text-lg">
                  Scholars Republic
                </span>
                <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-pine/70">
                  Let&apos;s grow together
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-ink/60 sm:text-[15px] sm:leading-7">
              Find scholarships, understand the requirements, save opportunities, and keep your
              applications moving forward.
            </p>

            <div className="mt-5 inline-flex max-w-md items-start gap-2.5 rounded-2xl border border-pine/10 bg-white/70 px-3.5 py-3 text-xs leading-5 text-ink/55 shadow-sm dark:bg-white/5">
              <BadgeCheck className="mt-0.5 shrink-0 text-pine" size={16} aria-hidden="true" />
              <span>
                We prioritize clear sourcing and verification so you can judge each opportunity with
                better context.
              </span>
            </div>
          </div>

          <nav
            className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-3 lg:col-span-7 lg:justify-self-end lg:gap-x-14 xl:gap-x-20"
            aria-label="Footer navigation"
          >
            {footerGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/40">
                  {group.label}
                </h2>
                <ul className="mt-3 space-y-0.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={footerLinkClassName}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-pine/10 pt-5 sm:mt-12">
          <div className="flex flex-col gap-3 text-xs leading-5 text-ink/50 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <p className="max-w-2xl">
              Always confirm deadlines, eligibility, and application requirements on the official
              scholarship page before applying.
            </p>
            <p className="shrink-0">
              &copy; {new Date().getFullYear()} Scholars Republic. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
