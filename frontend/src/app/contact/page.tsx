import type { Metadata } from "next";

import { LegalList, LegalPageShell, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Contact | Scholars Republic",
  description:
    "Contact Scholars Republic for scholarship corrections, official source updates, account support, privacy requests, partnerships, and general support.",
};

const contactReasons = [
  "Report outdated scholarship information",
  "Correct official source details",
  "Account or login support",
  "Privacy or data requests",
  "Partnerships and source corrections",
];

export default function ContactPage() {
  return (
    <LegalPageShell
      label="Contact"
      title="Contact Scholars Republic"
      intro={
        <p>
          Send practical corrections, account support questions, privacy requests, or partnership
          inquiries to the Scholars Republic team. We do not provide a public contact form on this
          page.
        </p>
      }
    >
      <section className="rounded-2xl border border-pine/20 bg-mint/35 p-5 shadow-soft transition-colors dark:border-pine/20 dark:bg-pine/10 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">Email Support</p>
        <h2 className="mt-2 break-words text-2xl font-bold text-ink dark:text-white">
          support@scholarsrepublic.org
        </h2>
        <p className="mt-3 text-sm leading-7 text-ink/70 dark:text-white/60 md:text-base">
          Email us at{" "}
          <a
            href="mailto:support@scholarsrepublic.org"
            className="font-semibold text-pine hover:text-pine/80"
          >
            support@scholarsrepublic.org
          </a>
          .
        </p>
      </section>

      <LegalSection title="What to Contact Us About">
        <LegalList items={contactReasons} />
      </LegalSection>

      <LegalSection title="Helpful Details to Include">
        <LegalList
          items={[
            "For outdated scholarship information, include the scholarship title and page link.",
            "For official source corrections, include the official provider link and the detail that needs correction.",
            "For account support, include the email address connected to your account.",
            "For privacy or data requests, describe the request clearly so we can review it.",
            "For partnerships, include your organization name, website, and the purpose of the request.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Safety Reminder">
        <p>
          Do not send passwords, private documents, financial records, or sensitive personal
          information through email unless we specifically request it through a secure process.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
