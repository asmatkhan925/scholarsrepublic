import Link from "next/link";

import { GraduationCap } from "lucide-react";

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "Scholarships", href: "/scholarships" },
      { label: "Student Dashboard", href: "/dashboard" },
      { label: "Saved Opportunities", href: "/dashboard/saved" },
      { label: "Application Tracker", href: "/dashboard/applications" },
    ],
  },
  {
    title: "Guides",
    links: [
      { label: "Scholarship Help Center", href: "/blog" },
      { label: "Write a Scholarship SOP", href: "/guides/how-to-write-sop-for-scholarship" },
      {
        label: "Scholarship CV Format",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
      { label: "Application Checklist", href: "/guides/scholarship-application-checklist" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "SOP Generator", href: "/dashboard/ai/sop" },
      { label: "Profile Builder", href: "/dashboard/profile" },
      { label: "Recommendations", href: "/dashboard/recommendations" },
      { label: "Services", href: "/services" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-pine/10 bg-ink text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-saffron text-ink">
                <GraduationCap size={23} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg">Scholars Republic</span>
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                  Scholarship Platform
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
              Find scholarships, organize applications, build a stronger student profile, and
              prepare scholarship documents with practical guidance and AI-assisted tools.
            </p>

            <p className="mt-5 max-w-md rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/60">
              Always verify deadlines, eligibility, and official requirements on the scholarship
              provider&apos;s website before applying.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-bold text-white">{section.title}</h2>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/65 transition hover:text-saffron"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Scholars Republic. All rights reserved.</p>
          <p>Built for students searching, tracking, and preparing scholarship applications.</p>
        </div>
      </div>
    </footer>
  );
}
