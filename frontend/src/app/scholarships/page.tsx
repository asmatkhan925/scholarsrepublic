"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";

const scholarships = [
  {
    title: "Chinese Government Scholarship",
    country: "China",
    funding: "Fully Funded",
    deadline: "March 2026",
  },
  {
    title: "Taiwan ICDF Scholarship",
    country: "Taiwan",
    funding: "Fully Funded",
    deadline: "March 2026",
  },
  {
    title: "Turkiye Burslari Scholarship",
    country: "Turkey",
    funding: "Fully Funded",
    deadline: "February 2026",
  },
];

export default function ScholarshipsPage() {
  const { isAuthenticated } = useAuth();
  const eligibilityHref = isAuthenticated ? "/dashboard" : "/register";

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-pine">
            Public scholarship browsing
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">
            Scholarships for Pakistani Students
          </h1>
          <p className="mt-3 text-ink/70">
            Browse verified scholarships. Create a free profile to check
            eligibility and save opportunities.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {scholarships.map((scholarship) => (
            <article
              key={scholarship.title}
              className="rounded border border-ink/10 bg-white p-5 shadow-soft"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded bg-mint px-3 py-1 text-xs font-semibold text-pine">
                <BadgeCheck size={14} aria-hidden="true" />
                Verified sample
              </div>
              <h2 className="text-lg font-semibold text-ink">
                {scholarship.title}
              </h2>
              <dl className="mt-4 grid gap-2 text-sm text-ink/70">
                <div className="flex justify-between gap-3">
                  <dt>Funding</dt>
                  <dd className="font-medium text-ink">{scholarship.funding}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Country</dt>
                  <dd className="font-medium text-ink">{scholarship.country}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Deadline</dt>
                  <dd className="font-medium text-ink">{scholarship.deadline}</dd>
                </div>
              </dl>

              {!isAuthenticated && (
                <p className="mt-5 rounded bg-skyglass px-3 py-2 text-sm text-ink/70">
                  Create a free profile to check your match score.
                </p>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link
                  href="#"
                  className="rounded border border-ink/15 px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-ink/5"
                >
                  View Details
                </Link>
                <Link
                  href={eligibilityHref}
                  className="rounded bg-pine px-4 py-2 text-center text-sm font-semibold text-white hover:bg-pine/90"
                >
                  Check Eligibility
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
