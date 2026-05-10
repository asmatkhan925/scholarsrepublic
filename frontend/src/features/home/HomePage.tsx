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
import { Badge, ButtonLink, Card, CardContent, PageHeader } from "@/components/ui";

const loggedOutSteps = [
  {
    title: "Search scholarships",
    description: "Browse opportunities and understand what fits your academic goals.",
    icon: Search,
  },
  {
    title: "Create your profile",
    description: "Add your background, interests, preferred countries, and degree level.",
    icon: UserRoundCheck,
  },
  {
    title: "Save and track",
    description: "Shortlist scholarships and manage your application progress.",
    icon: ClipboardCheck,
  },
  {
    title: "Prepare documents",
    description: "Use guides and AI-assisted tools to draft stronger application documents.",
    icon: FileText,
  },
];

const loggedInSteps = [
  {
    title: "Update profile",
    description: "Keep your academic details, goals, and preferences ready for matching.",
    icon: UserRoundCheck,
  },
  {
    title: "Review saved opportunities",
    description: "Return to scholarships you shortlisted and check your next actions.",
    icon: BadgeCheck,
  },
  {
    title: "Track applications",
    description: "Organize statuses, priorities, notes, and deadlines in one place.",
    icon: ClipboardCheck,
  },
  {
    title: "Prepare your SOP",
    description: "Use the SOP tool and guides to improve your scholarship documents.",
    icon: FileText,
  },
];

const guideLinks = [
  {
    title: "How to write a scholarship SOP",
    href: "/guides/how-to-write-sop-for-scholarship",
    description: "Write a focused, honest, and scholarship-ready statement of purpose.",
  },
  {
    title: "Scholarship CV format",
    href: "/guides/scholarship-cv-format-for-pakistani-students",
    description: "Organize academic achievements, experience, and skills clearly.",
  },
  {
    title: "Application checklist",
    href: "/guides/scholarship-application-checklist",
    description: "Avoid missing common documents, deadlines, and application steps.",
  },
];

export function HomePage() {
  const { isAuthenticated, loading, user } = useAuth();

  const isLoggedIn = isAuthenticated && !loading;
  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const steps = isLoggedIn ? loggedInSteps : loggedOutSteps;

  return (
    <main>
      <section className="bg-[linear-gradient(180deg,rgba(223,247,236,0.65),rgba(247,250,248,0))]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="overflow-hidden rounded-[2rem] border border-pine/10 bg-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="p-6 md:p-10 lg:p-12">
                <Badge tone="mint" className="mb-5">
                  <Sparkles size={14} aria-hidden="true" />
                  Let&apos;s grow together
                </Badge>

                <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-ink md:text-5xl">
                  Find scholarships and manage your application journey with confidence.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-ink/70">
                  Scholars Republic helps students discover opportunities, build a stronger profile,
                  save scholarships, track applications, and prepare better documents without
                  feeling overwhelmed.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  {isLoggedIn ? (
                    <>
                      <ButtonLink href={dashboardHref} size="lg">
                        Continue to Dashboard
                        <ArrowRight size={18} aria-hidden="true" />
                      </ButtonLink>
                      <ButtonLink href="/dashboard/applications" size="lg" variant="outline">
                        View Tracker
                      </ButtonLink>
                    </>
                  ) : (
                    <>
                      <ButtonLink href="/register" size="lg">
                        Create Free Profile
                        <ArrowRight size={18} aria-hidden="true" />
                      </ButtonLink>
                      <ButtonLink href="/scholarships" size="lg" variant="outline">
                        Browse Scholarships
                      </ButtonLink>
                    </>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/65">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={16} className="text-pine" aria-hidden="true" />
                    Student-first workspace
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BadgeCheck size={16} className="text-pine" aria-hidden="true" />
                    Save and track opportunities
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BookOpenCheck size={16} className="text-pine" aria-hidden="true" />
                    Practical scholarship guides
                  </span>
                </div>
              </div>

              <div className="border-t border-pine/10 bg-mint/45 p-6 md:p-8 lg:border-l lg:border-t-0">
                <div className="rounded-[1.5rem] border border-pine/10 bg-white/85 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
                    {isLoggedIn ? "Your next steps" : "How Scholars Republic helps"}
                  </p>

                  <div className="mt-5 space-y-4">
                    {(isLoggedIn
                      ? [
                          ["Profile", "Review and improve your student profile."],
                          ["Saved", "Open saved opportunities and plan next actions."],
                          ["Tracker", "Update application statuses and priorities."],
                          ["SOP", "Prepare a cleaner scholarship document draft."],
                        ]
                      : [
                          ["Discover", "Search scholarships and read practical guides."],
                          ["Prepare", "Build your profile and organize documents."],
                          ["Apply", "Save opportunities and track applications."],
                          ["Grow", "Use the platform as your scholarship workspace."],
                        ]
                    ).map(([label, description]) => (
                      <div key={label} className="flex gap-3">
                        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-white">
                          {label.slice(0, 1)}
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-ink">{label}</h2>
                          <p className="mt-1 text-sm leading-6 text-ink/65">{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[1.5rem] bg-ink p-5 text-white">
                  <p className="text-sm font-semibold text-saffron">Scholarship tip</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Start early. Save opportunities first, then prepare documents and verify
                    official requirements before applying.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((item, index) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="bg-white/90">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-pine">
                      <Icon size={19} aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-ink/30">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="mt-5 text-base font-bold text-ink">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <PageHeader
          eyebrow="Scholarship help center"
          title="Prepare smarter before you apply"
          description="Use practical guides for SOP writing, CV structure, application planning, professor emails, and common scholarship requirements."
          actions={
            <ButtonLink href="/blog" variant="outline">
              View All Guides
            </ButtonLink>
          }
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {guideLinks.map((guide) => (
            <Card key={guide.href} className="transition hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6">
                <Badge tone="sky">Guide</Badge>
                <h2 className="mt-4 text-lg font-bold text-ink">{guide.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/65">{guide.description}</p>
                <ButtonLink href={guide.href} className="mt-5" variant="ghost">
                  Read guide
                  <ArrowRight size={16} aria-hidden="true" />
                </ButtonLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-8 md:pb-20">
        <div className="grid gap-5 rounded-[2rem] bg-pine p-6 text-white shadow-soft md:grid-cols-[1.35fr_0.65fr] md:items-center md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-saffron">
              {isLoggedIn ? "Keep moving" : "Start with one step"}
            </p>
            <h2 className="mt-3 text-2xl font-bold md:text-3xl">
              {isLoggedIn
                ? "Continue building your scholarship workspace."
                : "Build your scholarship workspace today."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              {isLoggedIn
                ? "Return to your dashboard, update applications, and keep your scholarship preparation organized."
                : "Create your profile, browse opportunities, and keep your scholarship journey organized from search to submission."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            {isLoggedIn ? (
              <>
                <ButtonLink href={dashboardHref} variant="secondary">
                  Open Dashboard
                </ButtonLink>
                <ButtonLink
                  href="/dashboard/saved"
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                >
                  Saved Opportunities
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href="/register" variant="secondary">
                  Create Free Profile
                </ButtonLink>
                <ButtonLink
                  href="/scholarships"
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15"
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
