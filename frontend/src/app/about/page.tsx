import type { Metadata } from "next";
import Link from "next/link";

import { BadgeCheck, BookOpenCheck, ClipboardCheck, SearchCheck, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { ButtonLink, Card, CardContent } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Scholars Republic - Verified Scholarship Platform for Pakistani Students",
  description:
    "Learn how Scholars Republic helps Pakistani students find verified scholarships, confirm official sources, save opportunities, track applications, and prepare stronger documents.",
};

const trustCards = [
  {
    title: "Official-source focused",
    description:
      "Listings point students back to university, government, provider, or official application sources when available.",
    icon: ShieldCheck,
  },
  {
    title: "Student-first guidance",
    description:
      "Scholarship details are organized around eligibility, deadlines, funding, documents, and next steps students can act on.",
    icon: BookOpenCheck,
  },
  {
    title: "Application preparation workspace",
    description:
      "Students can save opportunities, track progress, and use practical guides while preparing stronger applications.",
    icon: ClipboardCheck,
  },
];

const studentActions = [
  "Find scholarships by country, degree level, funding type, deadline, and eligibility.",
  "Save opportunities and build a serious shortlist.",
  "Track application progress and preparation status.",
  "Review document requirements before applying.",
  "Use scholarship guides for CVs, SOPs, study plans, and application checklists.",
  "Confirm final details from official scholarship providers.",
];

const verificationPoints = [
  "We collect scholarship information from official university, government, organization, and provider websites.",
  "Each scholarship should include a title, provider, country, degree level, funding details, deadline, eligibility notes, and official source link when available.",
  '"Verified" means the opportunity was reviewed against its available source information.',
  '"Last verified" means the date when the listing was most recently checked or updated.',
  "Students should always confirm final requirements on the official source before submitting.",
];

const limits = [
  "Scholars Republic is not a scholarship agent.",
  "Scholars Republic does not guarantee admission, selection, visa approval, funding, or scholarship awards.",
  "Scholars Republic does not submit applications on behalf of students.",
  "Final decisions are made only by universities, governments, organizations, or official scholarship providers.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-cream/35 text-ink transition-colors dark:bg-[#0e1012] dark:text-white">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-pine/15 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-pine shadow-sm dark:border-white/10 dark:bg-white/5">
            <SearchCheck size={14} aria-hidden="true" />
            Public scholarship platform
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
            About Scholars Republic
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/72 dark:text-white/62 md:text-lg">
            Scholars Republic helps Pakistani students discover verified scholarships, understand
            eligibility, save serious opportunities, track applications, and prepare stronger
            scholarship documents.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {trustCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-pine dark:bg-pine/15">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-ink dark:text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-ink/68 dark:text-white/58">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-pine/10 bg-white py-12 dark:border-white/10 dark:bg-[#151719]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Why we built it
            </p>
            <h2 className="mt-3 text-3xl font-bold text-ink dark:text-white">
              A clearer way to research scholarships
            </h2>
          </div>
          <p className="text-base leading-8 text-ink/72 dark:text-white/62">
            Many students lose time searching random Facebook posts, outdated scholarship posts,
            unclear eligibility notes, and broken application links. Scholars Republic was created
            to organize scholarship discovery and application preparation in one reliable workspace.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-2">
        <Card className="dark:border-white/10 dark:bg-[#181b1d]">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">For students</p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              What Scholars Republic helps students do
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-ink/72 dark:text-white/62">
              {studentActions.map((item) => (
                <li key={item} className="flex gap-3">
                  <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="dark:border-white/10 dark:bg-[#181b1d]">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Information trust
            </p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              How we verify information
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-ink/72 dark:text-white/62">
              {verificationPoints.map((item) => (
                <li key={item} className="flex gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-saffron/25 bg-saffron/10 dark:border-saffron/25 dark:bg-saffron/10 lg:col-span-2">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">Clear limits</p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              What Scholars Republic does not do
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-ink/72 dark:text-white/62 md:grid-cols-2">
              {limits.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pine" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8 md:pb-16">
        <div className="rounded-3xl border border-pine/15 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#181b1d] md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
            Corrections and updates
          </p>
          <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
            Scholarship information can change
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/72 dark:text-white/62 md:text-base">
            Scholarship deadlines, eligibility rules, and funding conditions can change. If a
            student finds an incorrect deadline, broken link, missing official source, or outdated
            requirement, they should report it so the listing can be reviewed.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/scholarships">Explore Scholarships</ButtonLink>
            <ButtonLink href="/verification-policy" variant="outline">
              Read Verification Policy
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              Contact Us
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs leading-6 text-ink/55 dark:text-white/45">
            Always treat the official provider page as the final source before applying.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-ink/55 dark:text-white/45">
          Need the legal disclaimer? Read the{" "}
          <Link href="/disclaimer" className="font-semibold text-pine hover:text-pine/80">
            Scholars Republic disclaimer
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
