"use client";

import { ArrowRight, BadgeCheck, BookOpenCheck, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";

interface PlatformStats {
  scholarships_listed: number;
  countries_covered?: number;
  guides_published?: number;
  students_registered: number;
  applications_tracked: number;
}

function useStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  useEffect(() => {
    fetch("/api/platform-stats/")
      .then((r) => r.json())
      .then((d: PlatformStats) => setStats(d))
      .catch(() => {});
  }, []);
  return stats;
}

interface FeaturedScholarship {
  slug: string;
  title: string;
  country: string;
  funding_type: string;
  deadline: string | null;
  is_rolling_deadline: boolean;
  application_fee_status?: "unknown" | "free" | "paid";
}

function useFeaturedScholarships() {
  const [items, setItems] = useState<FeaturedScholarship[]>([]);
  useEffect(() => {
    // Soonest upcoming deadlines make the strongest homepage showcase.
    fetch("/api/scholarships/?ordering=deadline&page_size=6")
      .then((r) => r.json())
      .then((d: { results?: FeaturedScholarship[] }) => setItems(d.results ?? []))
      .catch(() => {});
  }, []);
  return items;
}

function humanizeFunding(value: string): string {
  return (value || "").replace(/_/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortDeadline(item: FeaturedScholarship): string {
  if (item.is_rolling_deadline) return "Rolling";
  if (!item.deadline) return "See details";
  const d = new Date(item.deadline);
  if (Number.isNaN(d.getTime())) return "See details";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k+`;
  return String(n);
}

const loggedOutHelpItems = [
  {
    label: "Match your search",
    description:
      "Choose country, degree level, field, and funding type instead of browsing randomly.",
  },
  {
    label: "Build your profile",
    description: "Keep academic background, goals, documents, and preferences ready in one place.",
  },
  {
    label: "Shortlist serious options",
    description: "Save scholarships worth applying to and revisit them when you are ready.",
  },
  {
    label: "Prepare your application",
    description: "Use guides and tools for SOPs, CVs, study plans, and professor emails.",
  },
];

const loggedInHelpItems = [
  {
    label: "Improve your readiness",
    description: "Update missing profile details so your workspace reflects your real background.",
  },
  {
    label: "Focus your shortlist",
    description:
      "Review saved opportunities and prioritize the scholarships worth applying to first.",
  },
  {
    label: "Move applications forward",
    description: "Track status, next step, priority, notes, and personal deadlines.",
  },
  {
    label: "Prepare stronger documents",
    description: "Use the SOP tool and guides, then edit honestly before submission.",
  },
];

const guideLinks = [
  {
    title: "Write a scholarship SOP",
    href: "/guides/how-to-write-sop-for-scholarship",
    description: "Write a focused, honest, and scholarship-ready statement of purpose.",
  },
  {
    title: "Scholarship CV format",
    href: "/guides/scholarship-cv-format-for-pakistani-students",
    description: "Organize achievements, skills, and experience in a clear academic format.",
  },
  {
    title: "Application checklist",
    href: "/guides/scholarship-application-checklist",
    description: "Check documents, deadlines, official links, and final submission details.",
  },
];

export function HomePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const stats = useStats();
  const featured = useFeaturedScholarships();

  const isLoggedIn = isAuthenticated && !loading;
  const isAuthLoading = loading;
  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const helpItems = isLoggedIn ? loggedInHelpItems : loggedOutHelpItems;

  return (
    <main>
      <section className="bg-[linear-gradient(180deg,rgba(223,247,236,0.62),rgba(247,250,248,0))]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <div className="overflow-hidden rounded-[1.75rem] border border-pine/10 bg-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-5 sm:p-6 md:p-8">
                <Badge tone="mint" className="mb-4">
                  <Sparkles size={14} aria-hidden="true" />
                  Let&apos;s grow together
                </Badge>

                <h1 className="max-w-4xl text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
                  Verified scholarships for Pakistani students — and one place to manage every
                  application.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/70 md:text-base">
                  Scholars Republic is built for Pakistani students applying abroad. Every listing is
                  checked against official university and government sources, so you can move from
                  random searching to a clear application plan — find opportunities, save shortlists,
                  track progress, and prepare stronger documents.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {isLoggedIn ? (
                    <>
                      <ButtonLink href={dashboardHref} className="w-full sm:w-auto" size="md">
                        Continue to Dashboard
                        <ArrowRight size={17} aria-hidden="true" />
                      </ButtonLink>
                      <ButtonLink
                        href="/dashboard/applications"
                        className="w-full sm:w-auto"
                        size="md"
                        variant="outline"
                      >
                        View Tracker
                      </ButtonLink>
                    </>
                  ) : isAuthLoading ? (
                    <>
                      <ButtonLink href="/scholarships" className="w-full sm:w-auto" size="md">
                        Browse Scholarships
                        <ArrowRight size={17} aria-hidden="true" />
                      </ButtonLink>
                      <ButtonLink
                        href="/guides"
                        className="w-full sm:w-auto"
                        size="md"
                        variant="outline"
                      >
                        Explore Guides
                      </ButtonLink>
                    </>
                  ) : (
                    <>
                      <ButtonLink href="/register" className="w-full sm:w-auto" size="md" rel="nofollow">
                        Create Free Profile
                        <ArrowRight size={17} aria-hidden="true" />
                      </ButtonLink>
                      <ButtonLink
                        href="/scholarships"
                        className="w-full sm:w-auto"
                        size="md"
                        variant="outline"
                      >
                        Browse Scholarships
                      </ButtonLink>
                    </>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/65 sm:text-sm">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={15} className="text-pine" aria-hidden="true" />
                    Checked against official sources
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BadgeCheck size={15} className="text-pine" aria-hidden="true" />
                    Last-verified dates shown
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BookOpenCheck size={15} className="text-pine" aria-hidden="true" />
                    Direct links to official applications
                  </span>
                </div>
              </div>

              <div className="border-t border-pine/10 bg-mint/45 p-5 sm:p-6 md:p-7 lg:border-l lg:border-t-0">
                <div className="h-full rounded-[1.5rem] border border-pine/10 bg-white/90 p-5">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-pine">
                    {isLoggedIn ? "Your next best moves" : "How Scholars Republic helps"}
                  </p>

                  <div className="mt-4 grid gap-3">
                    {helpItems.map((item) => (
                      <div key={item.label} className="flex gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-white">
                          {item.label.slice(0, 1)}
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-ink">{item.label}</h2>
                          <p className="text-sm leading-5 text-ink/65">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {featured.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine">
                    Closing soon
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-ink sm:text-xl">
                    Scholarships with upcoming deadlines
                  </h2>
                </div>
                <ButtonLink href="/scholarships/browse" variant="ghost" className="shrink-0">
                  View all
                  <ArrowRight size={15} aria-hidden="true" />
                </ButtonLink>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featured.slice(0, 6).map((item) => (
                  <a
                    key={item.slug}
                    href={`/scholarships/${item.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-pine/10 bg-white/95 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-pine/25 hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.funding_type && (
                        <Badge tone="mint">{humanizeFunding(item.funding_type)}</Badge>
                      )}
                      {item.application_fee_status === "free" && <Badge tone="sky">No fee</Badge>}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-ink group-hover:text-pine">
                      {item.title}
                    </h3>
                    <div className="mt-auto flex items-center justify-between pt-3 text-xs text-ink/55">
                      {item.country && <span>{item.country}</span>}
                      <span className="font-semibold text-ink/70">📅 {shortDeadline(item)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {stats && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-pine/10 overflow-hidden rounded-2xl border border-pine/10 bg-white/90 shadow-soft">
              {[
                { value: fmt(stats.scholarships_listed), label: "Verified scholarships" },
                {
                  value: stats.countries_covered ? `${stats.countries_covered}+` : "40+",
                  label: "Countries covered",
                },
                {
                  value: stats.guides_published ? `${stats.guides_published}+` : "20+",
                  label: "Application guides",
                },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 px-4 py-3 text-center">
                  <span className="text-xl font-black tabular-nums text-pine sm:text-2xl">{value}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-5 md:px-8 md:py-9">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-pine/10 bg-white/85 p-5 shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d] md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Scholarship help center
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink dark:text-white md:text-3xl">
              Prepare smarter before you apply
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
              Use practical guides for SOP writing, CV structure, application planning, professor
              emails, and common scholarship requirements.
            </p>
          </div>

          <ButtonLink href="/guides" variant="outline">
            View All Guides
          </ButtonLink>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {guideLinks.map((guide) => (
            <Card
              key={guide.href}
              className="transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]"
            >
              <CardContent className="p-5">
                <Badge tone="sky">Guide</Badge>
                <h2 className="mt-3 text-base font-bold text-ink dark:text-white">{guide.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">
                  {guide.description}
                </p>
                <ButtonLink href={guide.href} className="mt-4" variant="ghost">
                  Read guide
                  <ArrowRight size={16} aria-hidden="true" />
                </ButtonLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-5 md:px-8 md:pb-16">
        <div className="grid gap-4 rounded-[1.75rem] bg-pine p-5 text-white shadow-soft md:grid-cols-[1.35fr_0.65fr] md:items-center md:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-saffron">
              {isLoggedIn ? "Keep moving" : "Start with one step"}
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {isLoggedIn
                ? "Continue building your scholarship workspace."
                : "Build your scholarship workspace today."}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              {isLoggedIn
                ? "Return to your dashboard, update applications, and keep your scholarship preparation organized."
                : "Create your profile, browse opportunities, and keep your scholarship journey organized from search to submission."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            {isLoggedIn ? (
              <>
                <ButtonLink href={dashboardHref} className="w-full sm:w-auto" variant="secondary">
                  Open Dashboard
                </ButtonLink>
                <ButtonLink
                  href="/dashboard/saved"
                  variant="outline"
                  className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                >
                  Saved Opportunities
                </ButtonLink>
              </>
            ) : isAuthLoading ? (
              <>
                <ButtonLink href="/scholarships" className="w-full sm:w-auto" variant="secondary">
                  Browse Scholarships
                </ButtonLink>
                <ButtonLink
                  href="/guides"
                  variant="outline"
                  className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                >
                  Explore Guides
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href="/register" className="w-full sm:w-auto" variant="secondary" rel="nofollow">
                  Create Free Profile
                </ButtonLink>
                <ButtonLink
                  href="/scholarships"
                  variant="outline"
                  className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                >
                  Browse Scholarships
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
