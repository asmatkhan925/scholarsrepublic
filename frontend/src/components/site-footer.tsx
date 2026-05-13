import Link from "next/link";

import { GraduationCap } from "lucide-react";

const footerLinks = [
  { label: "Scholarships", href: "/scholarships" },
  { label: "Guides", href: "/blog" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Dashboard", href: "/dashboard" },
];

type SiteFooterProps = {
  variant?: "default" | "auth";
};

export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  if (variant === "auth") {
    return (
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-8">
          <p>&copy; Scholars Republic. Helping students find and manage scholarship opportunities.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Auth footer navigation">
            <Link href="/scholarships" className="font-semibold transition hover:text-emerald-700">
              Scholarships
            </Link>
            <Link href="/blog" className="font-semibold transition hover:text-emerald-700">
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 md:px-8 md:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-lg">
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-ink">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-mint text-pine">
                <GraduationCap size={19} aria-hidden="true" />
              </span>
              <span className="text-base">Scholars Republic</span>
            </Link>

            <p className="mt-2 text-sm leading-6 text-ink/62">
              Find scholarships, save opportunities, and track applications.
            </p>
          </div>

          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-ink/65 lg:justify-end"
            aria-label="Footer navigation"
          >
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-pine">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-pine/10 pt-4 text-xs leading-5 text-ink/55 md:flex-row md:items-center md:justify-between">
          <p>
            Always confirm deadlines, eligibility, and requirements on the official scholarship
            page.
          </p>
          <p>&copy; {new Date().getFullYear()} Scholars Republic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
