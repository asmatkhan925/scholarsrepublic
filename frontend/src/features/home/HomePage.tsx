"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";

const loggedOutSteps = [
  {
    title: "Discover options",
    description: "Search scholarships by country, degree level, field, and student goals.",
    icon: Search,
  },
  {
    title: "Check your fit",
    description: "Use your profile to think clearly about eligibility, strengths, and gaps.",
    icon: UserRoundCheck,
  },
  {
    title: "Organize choices",
    description: "Save promising scholarships and keep deadlines, priorities, and notes together.",
    icon: ClipboardCheck,
  },
  {
    title: "Apply stronger",
    description: "Prepare SOPs, CVs, study plans, and emails with practical guides and tools.",
    icon: FileText,
  },
];

const loggedInSteps = [
  {
    title: "Improve your profile",
    description: "Keep your academic background, goals, and preferences accurate.",
    icon: UserRoundCheck,
  },
  {
    title: "Review opportunities",
    description: "Compare saved scholarships and focus on the ones worth your time.",
    icon: BadgeCheck,
  },
  {
    title: "Plan applications",
    description: "Track status, priority, next action, and important application notes.",
    icon: ClipboardCheck,
  },
  {
    title: "Prepare documents",
    description: "Draft and improve SOPs, CVs, study plans, and professor emails.",
    icon: FileText,
  },
];

const loggedOutHelpItems = [
  {
    label: "Find direction",
    description: "Move from random searching to a clearer scholarship shortlist.",
  },
  {
    label: "Understand requirements",
    description: "Review eligibility, documents, deadlines, and application expectations.",
  },
  {
    label: "Stay organized",
    description: "Save opportunities before they disappear into browser tabs and screenshots.",
  },
  {
    label: "Prepare with confidence",
    description: "Use practical guides and tools before writing important application documents.",
  },
];

const loggedInHelpItems = [
  {
    label: "Continue faster",
    description: "Return to your profile, saved scholarships, and tracker without starting over.",
  },
  {
    label: "Choose better",
    description: "Focus on opportunities that match your goals, background, and preparation level.",
  },
  {
    label: "Act on time",
    description: "Turn saved scholarships into next actions instead of missed deadlines.",
  },
  {
    label: "Polish documents",
    description: "Use guides and AI-assisted tools to improve drafts while keeping them honest.",
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

  const isLoggedIn = isAuthenticated && !loading;
  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const steps = isLoggedIn ? loggedInSteps : loggedOutSteps;
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
                  Find scholarships and manage your application journey with confidence.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/70 md:text-base">
                  Scholars Republic helps students move from scholarship searching to organized,
                  prepared applications — with profile tools, saved opportunities, trackers, and
                  practical document guidance.
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
                  ) : (
                    <>
                      <ButtonLink href="/register" className="w-full sm:w-auto" size="md">
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
                    Student-first workspace
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BadgeCheck size={15} className="text-pine" aria-hidden="true" />
                    Save and track
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BookOpenCheck size={15} className="text-pine" aria-hidden="true" />
                    Practical guides
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

                  <div className="mt-4 rounded-2xl border border-pine/10 bg-mint/60 p-4">
                    <p className="text-sm font-semibold text-pine">Apply carefully</p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">
                      Use Scholars Republic to prepare, but always verify final rules on the
                      official scholarship website.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, index) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="bg-white/95">
                  <CardContent className="flex gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink/35">
                          0{index + 1}
                        </span>
                        <h2 className="text-sm font-bold text-ink">{item.title}</h2>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-ink/65">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-5 md:px-8 md:py-9">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-pine/10 bg-white/85 p-5 shadow-soft md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Scholarship help center
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Prepare smarter before you apply
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Use practical guides for SOP writing, CV structure, application planning, professor
              emails, and common scholarship requirements.
            </p>
          </div>

          <ButtonLink href="/blog" variant="outline">
            View All Guides
          </ButtonLink>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {guideLinks.map((guide) => (
            <Card key={guide.href} className="transition hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-5">
                <Badge tone="sky">Guide</Badge>
                <h2 className="mt-3 text-base font-bold text-ink">{guide.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{guide.description}</p>
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
            ) : (
              <>
                <ButtonLink href="/register" className="w-full sm:w-auto" variant="secondary">
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
