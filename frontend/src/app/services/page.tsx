import type { Metadata } from "next";

import {
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MailCheck,
  MessagesSquare,
} from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink, Card, CardContent } from "@/components/ui";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Scholarship Application Support Services - Scholars Republic",
  description:
    "Explore student-focused scholarship application support for CVs, SOPs, study plans, professor emails, checklists, and scholarship preparation.",
};

const services = [
  {
    title: "CV Review",
    description:
      "Help students improve structure, academic clarity, achievements, skills, and scholarship relevance.",
    icon: FileText,
  },
  {
    title: "SOP Review",
    description:
      "Feedback on motivation, clarity, study goals, research direction, and alignment with scholarship requirements.",
    icon: BookOpenCheck,
  },
  {
    title: "Study Plan Review",
    description:
      "Support for students preparing structured study plans for master's, PhD, and exchange applications.",
    icon: GraduationCap,
  },
  {
    title: "Professor Email Review",
    description:
      "Help students write concise and respectful emails for supervisors, labs, and research groups.",
    icon: MailCheck,
  },
  {
    title: "Full Application Checklist Review",
    description: "Review whether the student has prepared the required documents before applying.",
    icon: ClipboardCheck,
  },
  {
    title: "Scholarship Consultation",
    description:
      "General guidance on shortlisting, deadlines, country fit, and application readiness.",
    icon: MessagesSquare,
  },
];

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={[
          createWebPageJsonLd({
            name: "Scholarship Application Support Services",
            description:
              "Explore student-focused scholarship application support for CVs, SOPs, study plans, professor emails, checklists, and scholarship preparation.",
            path: "/services",
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
          ]),
        ]}
      />
      <main className="min-h-screen bg-cream/35 text-ink transition-colors dark:bg-[#0e1012] dark:text-white">
        <SiteHeader />

        <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Student support
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
              Scholarship Application Support Services
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-ink/72 dark:text-white/62 md:text-lg">
              Practical document and application support for students preparing competitive
              scholarship applications.
            </p>
          </div>

          <section className="mt-10 rounded-3xl border border-pine/15 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#181b1d] md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Current support focus
            </p>
            <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
              Built around serious scholarship preparation
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/72 dark:text-white/62 md:text-base">
              Scholars Republic already helps students through scholarship discovery, saved
              opportunities, application tracking, document checklists, and preparation guides.
              These tools help students move from random searching to organized application
              planning.
            </p>
          </section>

          <section className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
                  Coming soon
                </p>
                <h2 className="mt-3 text-2xl font-bold text-ink dark:text-white">
                  Planned student support services
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-ink/62 dark:text-white/52">
                Pilot support will focus on practical review and readiness, not guaranteed outcomes.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <Card key={service.title} className="dark:border-white/10 dark:bg-[#181b1d]">
                    <CardContent className="p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint text-pine dark:bg-pine/15">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-ink dark:text-white">
                        {service.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-ink/68 dark:text-white/58">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-saffron/25 bg-saffron/10 p-6 dark:border-saffron/25 dark:bg-saffron/10 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Important disclaimer
            </p>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/72 dark:text-white/62 md:text-base">
              These services are designed to improve application preparation. They do not guarantee
              admission, scholarship selection, visa approval, or funding.
            </p>
          </section>

          <section className="mt-8 rounded-3xl border border-pine/15 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#181b1d] md:p-8">
            <h2 className="text-2xl font-bold text-ink dark:text-white">
              Start with verified opportunities
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/68 dark:text-white/58 md:text-base">
              Explore active listings, read preparation guides, or contact the team for practical
              scholarship support questions.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/scholarships">Explore Scholarships</ButtonLink>
              <ButtonLink href="/guides" variant="outline">
                Read Scholarship Guides
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                Contact Us
              </ButtonLink>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
