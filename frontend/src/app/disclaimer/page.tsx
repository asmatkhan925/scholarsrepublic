import type { Metadata } from "next";
import Link from "next/link";

import { LegalContactBox, LegalPageShell, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer | Scholars Republic",
  description:
    "Read the Scholars Republic disclaimer about scholarship accuracy, official source verification, provider affiliation, AI tools, external links, and application outcomes.",
};

export default function DisclaimerPage() {
  return (
    <LegalPageShell
      label="Legal"
      title="Disclaimer"
      intro={
        <p>
          Scholars Republic publishes scholarship information, guides, and student tools to help
          applicants research opportunities more efficiently. This disclaimer explains important
          limits and responsibilities.
        </p>
      }
    >
      <LegalSection title="Scholarship Information">
        <p>
          Scholarship information on Scholars Republic is provided for research and student support.
          Deadlines, eligibility rules, benefits, required documents, fees, application methods, and
          provider policies may change after information is published or updated.
        </p>
      </LegalSection>

      <LegalSection title="Official Source Rule">
        <p>
          Always verify the deadline, eligibility, benefits, documents, fees, and application steps
          on the official scholarship or provider website before applying. Official provider
          instructions should be treated as the controlling source.
        </p>
      </LegalSection>

      <LegalSection title="No Affiliation">
        <p>
          Scholars Republic is not affiliated with universities, governments, scholarship providers,
          funding bodies, or admissions offices unless that relationship is clearly stated.
        </p>
      </LegalSection>

      <LegalSection title="No Guarantee">
        <p>
          Scholars Republic does not guarantee scholarship awards, admission, funding, stipend
          payments, visa approval, interview calls, acceptance, or any other application outcome.
        </p>
      </LegalSection>

      <LegalSection title="AI and Content Tools">
        <p>
          AI tools, guides, examples, and other content are educational and drafting support only.
          They are not official scholarship, legal, immigration, financial, academic, or admission
          advice. Students should review, personalize, and verify all final application materials.
        </p>
      </LegalSection>

      <LegalSection title="External Links">
        <p>
          External websites are controlled by their owners. Scholars Republic is not responsible for
          external website content, availability, privacy practices, fees, application systems, or
          provider decisions.
        </p>
      </LegalSection>

      <LegalSection title="Student Comments">
        <p>
          Comments and student discussions may be reviewed before publication. Scholars Republic may
          hide or remove comments that are spam, unsafe, misleading, off-topic, abusive, or
          otherwise unsuitable for the website.
        </p>
      </LegalSection>

      <LegalContactBox title="Report Corrections">
        <p>
          If you notice outdated scholarship details or an incorrect official source, please report
          it through the{" "}
          <Link href="/contact" className="font-semibold text-pine hover:text-pine/80">
            contact page
          </Link>
          .
        </p>
      </LegalContactBox>
    </LegalPageShell>
  );
}
