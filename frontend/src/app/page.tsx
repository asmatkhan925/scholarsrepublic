import type { Metadata } from "next";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Scholars Republic | Find Scholarships and Track Applications",
  description:
    "Discover scholarships, build your student profile, save opportunities, track applications, and prepare stronger scholarship documents with Scholars Republic.",
};

const trustPoints = [
  {
    label: "Scholarship search",
    description: "Browse opportunities and review eligibility details in one organized place.",
    icon: Search,
  },
  {
    label: "Student profile",
    description: "Build a profile that helps you prepare for matching and applications.",
    icon: UserRoundCheck,
  },
  {
    label: "Application tracker",
    description: "Keep saved scholarships, statuses, priorities, and next steps easier to manage.",
    icon: ClipboardCheck,
  },
];

const workflow = [
  {
    title: "Find opportunities",
    description: "Search scholarships and explore guides before you decide where to apply.",
    icon: Search,
  },
  {
    title: "Build your profile",
    description: "Add academic background, goals, countries, fields, and scholarship preferences.",
    icon: UserRoundCheck,
  },
  {
    title: "Save and track",
    description:
      "Shortlist opportunities, monitor progress, and stay organized during application season.",
    icon: ClipboardCheck,
  },
  {
    title: "Prepare documents",
    description:
      "Use guides and AI-assisted tools to draft SOPs, study plans, CVs, and emails carefully.",
    icon: FileText,
  },
];

const guideLinks = [
  {
    title: "How to write a scholarship SOP",
    href: "/guides/how-to-write-sop-for-scholarship",
    description: "A practical guide for writing a focused and honest statement of purpose.",
  },
  {
    title: "Scholarship CV format",
    href: "/guides/scholarship-cv-format-for-pakistani-students",
    description: "Learn how to organize academic achievements, skills, and experience clearly.",
  },
  {
    title: "Application checklist",
    href: "/guides/scholarship-application-checklist",
    description: "Use a simple checklist to avoid missing common scholarship requirements.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(223,247,236,0.9),transparent_35%),linear-gradient(180deg,rgba(237,247,251,0.9),rgba(247,250,248,0))]" />

          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-20">
            <div>
              <Badge tone="mint" className="mb-5">
                <Sparkles size={14} aria-hidden="true" />
                Let&apos;s grow together
              </Badge>

              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-ink md:text-6xl">
                Find scholarships, prepare better, and track every application.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-ink/70 md:text-lg">
                Scholars Republic helps students discover opportunities, build a stronger profile,
                save scholarships, organize applications, and prepare scholarship documents with
                practical guidance.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/register" size="lg">
                  Create Free Profile
                  <ArrowRight size={18} aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/scholarships" size="lg" variant="outline">
                  Browse Scholarships
                </ButtonLink>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/65">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-pine" aria-hidden="true" />
                  Free student account
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

            <Card className="relative overflow-hidden border-pine/10 bg-white/90">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-mint" />
              <CardContent className="relative space-y-5 p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-pine text-white shadow-sm">
                    <GraduationCap size={28} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pine">
                      Student workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-ink">
                      Everything starts with your profile.
                    </h2>
                  </div>
                </div>

                <div className="grid gap-3">
                  {trustPoints.map((point) => {
                    const Icon = point.icon;

                    return (
                      <div
                        key={point.label}
                        className="flex gap-4 rounded-3xl border border-pine/10 bg-white p-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-pine">
                          <Icon size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-bold text-ink">{point.label}</h3>
                          <p className="mt-1 text-sm leading-6 text-ink/65">{point.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-3xl bg-ink p-5 text-white">
                  <p className="text-sm font-semibold text-saffron">Scholarship preparation tip</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Do not wait for the deadline week. Save opportunities early, prepare documents,
                    and verify official requirements before submission.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="grid gap-4 md:grid-cols-4">
            {workflow.map((item, index) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="bg-white/90">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-pine">
                        <Icon size={20} aria-hidden="true" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-ink/30">
                        0{index + 1}
                      </span>
                    </div>
                    <h2 className="mt-5 text-lg font-bold text-ink">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <PageHeader
            eyebrow="Scholarship help center"
            title="Prepare smarter before you apply"
            description="Use practical guides to understand SOP writing, CV structure, application planning, and common scholarship requirements."
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
                  <h2 className="mt-4 text-xl font-bold text-ink">{guide.title}</h2>
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
          <div className="grid gap-5 rounded-[2rem] bg-pine p-6 text-white shadow-soft md:grid-cols-[1.4fr_0.6fr] md:items-center md:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-saffron">
                Start with one step
              </p>
              <h2 className="mt-3 text-3xl font-bold">Build your scholarship workspace today.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Create your profile, browse opportunities, and keep your scholarship journey
                organized from search to submission.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <ButtonLink href="/register" variant="secondary">
                Create Free Profile
              </ButtonLink>
              <ButtonLink
                href="/dashboard/ai/sop"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              >
                Try SOP Tool
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
