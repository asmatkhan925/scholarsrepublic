import type { Metadata } from "next";
import Link from "next/link";

import { LegalContactBox, LegalList, LegalPageShell, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use | Scholars Republic",
  description:
    "Review the Scholars Republic terms for scholarship discovery, official source verification, account responsibilities, AI tools, comments, prohibited use, and no guarantees.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      label="Legal"
      title="Terms of Use"
      updated="Last updated: May 2026"
      intro={
        <p>
          These terms explain how Scholars Republic should be used. By using the site, users agree
          to use scholarship information, student tools, comments, and AI-assisted features
          responsibly.
        </p>
      }
    >
      <LegalSection title="Acceptance of Terms">
        <p>
          By accessing or using Scholars Republic, you agree to use the platform responsibly and in
          line with these terms. If you do not agree, you should not use the website or account
          features.
        </p>
      </LegalSection>

      <LegalSection title="What Scholars Republic Provides">
        <p>
          Scholars Republic provides scholarship discovery, saved opportunities, profile tools,
          application tracking, scholarship guides, and AI or document assistance where available.
          The platform is designed to support research and preparation, not to replace official
          scholarship instructions.
        </p>
      </LegalSection>

      <LegalSection title="Scholarship Information and Official Sources">
        <p>
          Scholarship details may change at any time. Users must verify deadlines, eligibility,
          benefits, required documents, fees, and application instructions on official provider
          pages before applying. If there is a conflict, the official scholarship or provider page
          controls.
        </p>
      </LegalSection>

      <LegalSection title="No Guarantees">
        <p>
          Scholars Republic does not guarantee scholarship awards, admission, funding, stipend
          payments, visa approval, interview calls, acceptance, or any other application outcome.
          Users remain responsible for their own decisions, submissions, and follow-up with
          scholarship providers.
        </p>
      </LegalSection>

      <LegalSection title="Account Responsibilities">
        <p>Account users agree to:</p>
        <LegalList
          items={[
            "Provide accurate account, profile, and application information.",
            "Keep passwords and account access secure.",
            "Avoid misuse, spam, abuse, or attempts to disrupt the platform.",
            "Never use fake documents, false achievements, or misleading personal information.",
          ]}
        />
      </LegalSection>

      <LegalSection title="AI Tools">
        <p>
          AI output is drafting assistance only. Users must review, edit, personalize, and verify
          AI-assisted content before using it. Users must not present fake achievements, grades,
          publications, awards, work experience, research, or personal stories as true. The user is
          responsible for all final documents and application materials.
        </p>
      </LegalSection>

      <LegalSection title="User Submissions and Comments">
        <p>
          Users are responsible for comments, replies, and other submissions they post. Do not post
          spam, abusive, illegal, misleading, promotional, hateful, explicit, private, or unrelated
          content. Scholars Republic may moderate, hide, or remove content when needed for safety,
          quality, or policy compliance.
        </p>
      </LegalSection>

      <LegalSection title="Prohibited Use">
        <p>Users must not:</p>
        <LegalList
          items={[
            "Scrape, overload, spam, or abuse the platform.",
            "Attempt hacking, unauthorized access, or security testing without permission.",
            "Submit false, harmful, illegal, or misleading content.",
            "Violate laws, provider rules, or the rights of other people.",
            "Interfere with platform operations, accounts, APIs, or security controls.",
          ]}
        />
      </LegalSection>

      <LegalSection title="External Links">
        <p>
          Scholars Republic links to official provider pages and other external websites. Those
          websites are controlled by their owners and may have their own terms, privacy practices,
          fees, requirements, and deadlines.
        </p>
      </LegalSection>

      <LegalSection title="Changes, Suspension, and Removal">
        <p>
          Scholars Republic may update features, remove or correct content, restrict accounts,
          moderate submissions, or modify these terms as the platform changes.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <p>
          Scholars Republic is provided for scholarship research and student support. To the maximum
          extent permitted by law, Scholars Republic is not responsible for losses, missed
          deadlines, provider changes, application decisions, technical issues, or reliance on
          information without checking official sources.
        </p>
      </LegalSection>

      <LegalContactBox>
        <p>
          Questions about these terms can be sent through the{" "}
          <Link href="/contact" className="font-semibold text-pine hover:text-pine/80">
            contact page
          </Link>
          .
        </p>
      </LegalContactBox>
    </LegalPageShell>
  );
}
