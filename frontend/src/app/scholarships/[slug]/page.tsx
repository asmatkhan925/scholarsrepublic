"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, ExternalLink } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";
import { getScholarship } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OpportunityDetail } from "@/types/opportunity";

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Rolling or not listed";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function TextSection({ title, content }: { title: string; content: string }) {
  if (!content) {
    return null;
  }

  return (
    <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70">
        {content}
      </p>
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <ul className="mt-4 grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="rounded bg-skyglass px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ScholarshipDetailPage() {
  const params = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [scholarship, setScholarship] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadScholarship() {
      try {
        const data = await getScholarship(params.slug);
        if (mounted) {
          setScholarship(data);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (params.slug) {
      void loadScholarship();
    }

    return () => {
      mounted = false;
    };
  }, [params.slug]);

  const provider = useMemo(() => {
    if (!scholarship) {
      return "";
    }

    return (
      scholarship.university_name ||
      scholarship.provider_name ||
      scholarship.company_name ||
      "Provider not listed"
    );
  }, [scholarship]);

  return (
    <main>
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {loading && (
          <div className="rounded border border-ink/10 bg-white p-6 text-sm text-ink/70">
            Loading scholarship details...
          </div>
        )}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && scholarship && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-6">
              <section className="rounded border border-ink/10 bg-white p-6 shadow-soft">
                <div className="flex flex-wrap gap-2">
                  {scholarship.verified_status && (
                    <span className="inline-flex items-center gap-2 rounded bg-mint px-3 py-1 text-xs font-semibold text-pine">
                      <BadgeCheck size={14} aria-hidden="true" />
                      Verified
                    </span>
                  )}
                  {scholarship.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-skyglass px-3 py-1 text-xs text-ink/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="mt-5 text-3xl font-semibold text-ink">
                  {scholarship.title}
                </h1>
                <p className="mt-3 max-w-3xl text-ink/70">
                  {scholarship.short_description}
                </p>
              </section>

              <TextSection title="Description" content={scholarship.description} />
              <TextSection title="Benefits" content={scholarship.benefits} />
              <TextSection title="Eligibility" content={scholarship.eligibility} />
              <ListSection
                title="Required Documents"
                items={scholarship.required_documents}
              />
              <TextSection title="How to Apply" content={scholarship.how_to_apply} />
            </div>

            <aside className="grid gap-5 self-start lg:sticky lg:top-24">
              <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
                <h2 className="font-semibold text-ink">Opportunity details</h2>
                <dl className="mt-4 grid gap-3 text-sm text-ink/70">
                  <div className="flex justify-between gap-3">
                    <dt>Country</dt>
                    <dd className="text-right font-medium text-ink">
                      {scholarship.country || "Not listed"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Provider</dt>
                    <dd className="text-right font-medium text-ink">{provider}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Funding</dt>
                    <dd className="text-right font-medium text-ink">
                      {humanize(scholarship.funding_type)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Deadline</dt>
                    <dd className="text-right font-medium text-ink">
                      {formatDate(scholarship.deadline)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>IELTS</dt>
                    <dd className="font-medium text-ink">
                      {scholarship.ielts_required ? "Required" : "Not required"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Application fee</dt>
                    <dd className="font-medium text-ink">
                      {scholarship.application_fee_required ? "Required" : "No"}
                    </dd>
                  </div>
                  {scholarship.hec_required && (
                    <div className="flex justify-between gap-3">
                      <dt>HEC</dt>
                      <dd className="font-medium text-ink">Required</dd>
                    </div>
                  )}
                </dl>

                {scholarship.days_until_deadline !== null && (
                  <p className="mt-5 inline-flex items-center gap-2 rounded bg-skyglass px-3 py-2 text-sm text-ink/70">
                    <CalendarDays size={16} aria-hidden="true" />
                    {scholarship.days_until_deadline < 0
                      ? "Deadline passed"
                      : `${scholarship.days_until_deadline} days left`}
                  </p>
                )}

                {scholarship.official_link && (
                  <a
                    href={scholarship.official_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                  >
                    Official Link
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </section>

              <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
                {isAuthenticated ? (
                  <>
                    <h2 className="font-semibold text-ink">Match score coming next</h2>
                    <p className="mt-3 text-sm leading-6 text-ink/70">
                      Personalized match score will be available in the next phase.
                    </p>
                    <Link
                      href="/dashboard"
                      className="mt-5 inline-flex w-full justify-center rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="font-semibold text-ink">
                      Check your eligibility
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-ink/70">
                      Create a free profile to check your eligibility and save this
                      opportunity.
                    </p>
                    <div className="mt-5 grid gap-2">
                      <Link
                        href="/register"
                        className="rounded bg-pine px-4 py-2 text-center text-sm font-semibold text-white hover:bg-pine/90"
                      >
                        Create Free Profile
                      </Link>
                      <Link
                        href="/login"
                        className="rounded border border-ink/15 px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-ink/5"
                      >
                        Login
                      </Link>
                    </div>
                  </>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
