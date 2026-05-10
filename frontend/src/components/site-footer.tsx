import Link from "next/link";

import { GraduationCap } from "lucide-react";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Scholarships", href: "/scholarships" },
      { label: "Scholarship Guides", href: "/blog" },
      { label: "Student Services", href: "/services" },
      { label: "About Scholars Republic", href: "/about" },
    ],
  },
  {
    title: "Student Workspace",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Profile Builder", href: "/dashboard/profile" },
      { label: "Saved Opportunities", href: "/dashboard/saved" },
      { label: "Application Tracker", href: "/dashboard/applications" },
    ],
  },
  {
    title: "Preparation",
    links: [
      { label: "SOP Guide", href: "/guides/how-to-write-sop-for-scholarship" },
      { label: "Study Plan Guide", href: "/guides/how-to-write-study-plan-for-scholarship" },
      { label: "CV Format", href: "/guides/scholarship-cv-format-for-pakistani-students" },
      { label: "Application Checklist", href: "/guides/scholarship-application-checklist" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-pine/10 bg-[#0f1f1b] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-saffron text-ink shadow-sm">
                <GraduationCap size={23} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg">Scholars Republic</span>
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-saffron/85">
                  Let&apos;s grow together
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
              A practical scholarship workspace for students to discover opportunities, organize
              applications, strengthen profiles, and prepare better scholarship documents.
            </p>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron">
                Student-first reminder
              </p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Always confirm deadlines, eligibility, and application rules from the official
                scholarship provider before submitting.
              </p>
            </div>
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

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex flex-col gap-3 text-xs leading-5 text-white/55 md:flex-row md:items-center md:justify-between">
            <p>&copy; {new Date().getFullYear()} Scholars Republic. All rights reserved.</p>
            <p>Find scholarships. Track applications. Prepare documents. Grow with confidence.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
