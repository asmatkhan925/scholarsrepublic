import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Contact | Scholars Republic",
  description:
    "Contact Scholars Republic for scholarship source corrections, outdated opportunity reports, account support, partnerships, and general support.",
};

const contactReasons = [
  "Report outdated scholarship information",
  "Correct official source details",
  "Get account support",
  "Discuss partnerships",
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-cream/35">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">Contact</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink md:text-4xl">
          Contact Scholars Republic
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 md:text-base">
          We welcome practical corrections, account support requests, and partnership inquiries.
          Please include enough detail for us to understand the request.
        </p>

        <section className="mt-10 border-t border-ink/10 pt-8">
          <h2 className="text-xl font-bold text-ink">Email</h2>
          <p className="mt-3 text-sm leading-7 text-ink/70 md:text-base">
            Send your message to{" "}
            <a
              href="mailto:support@scholarsrepublic.org"
              className="font-semibold text-pine hover:text-pine/80"
            >
              support@scholarsrepublic.org
            </a>
            .
          </p>
        </section>

        <section className="mt-8 border-t border-ink/10 pt-8">
          <h2 className="text-xl font-bold text-ink">Reasons to Contact Us</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-ink/72 md:text-base">
            {contactReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
