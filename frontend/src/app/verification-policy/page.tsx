import type { Metadata } from "next";

import { LegalContactBox, LegalList, LegalPageShell, LegalSection } from "@/components/legal-page";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Verification Policy - Scholars Republic",
  description:
    "Read how Scholars Republic reviews scholarship listings, official source links, deadlines, funding details, and correction reports.",
};

const sourcePriorities = [
  "Official university pages",
  "Government scholarship portals",
  "Official organization or institute pages",
  "Official application portals",
  "Recognized scholarship provider pages",
];

const studentChecks = [
  "Deadline",
  "Eligibility",
  "Degree level",
  "Required documents",
  "Funding coverage",
  "Application method",
  "Official application link",
  "Country-specific requirements",
  "English test or language requirements",
];

const correctionReasons = [
  "Wrong deadline",
  "Broken official link",
  "Outdated eligibility",
  "Unclear funding information",
  "Missing official source",
  "Expired scholarship still shown as active",
];

export default function VerificationPolicyPage() {
  return (
    <LegalPageShell
      label="Trust and verification"
      title="Verification Policy"
      intro={
        <p>
          How Scholars Republic reviews scholarship listings, official sources, deadlines, and
          corrections.
        </p>
      }
    >
      <LegalSection title="Why Verification Matters">
        <p>
          Scholarship information changes frequently. Deadlines, eligibility rules, funding details,
          application links, and document requirements may be updated by official providers.
          Scholars Republic aims to make scholarship discovery clearer by organizing important
          details and pointing students back to official sources.
        </p>
      </LegalSection>

      <LegalSection title={'What "Verified" Means'}>
        <p>
          A verified listing means Scholars Republic has reviewed the available source information
          and checked key details such as title, provider, country, deadline, degree level, funding
          type, eligibility notes, and application/source link where available.
        </p>
      </LegalSection>

      <LegalSection title={'What "Last Verified" Means'}>
        <p>
          Last verified shows when the listing was most recently checked or updated. It does not
          mean the scholarship provider will not change details afterward.
        </p>
      </LegalSection>

      <LegalSection title="Source Policy">
        <p>Priority is given to:</p>
        <LegalList items={sourcePriorities} />
        <p>
          Scholars Republic avoids presenting social media posts as final authority unless they
          point to an official source.
        </p>
      </LegalSection>

      <LegalSection title="What Students Should Always Confirm">
        <LegalList items={studentChecks} />
      </LegalSection>

      <LegalSection title="Expired or Uncertain Listings">
        <p>
          Expired scholarships may be hidden, marked as expired, or kept only for reference if
          useful. Listings with unclear information should encourage students to check the official
          source.
        </p>
      </LegalSection>

      <LegalSection title="Corrections and Reporting">
        <p>Students can report incorrect information such as:</p>
        <LegalList items={correctionReasons} />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/contact?topic=scholarship-correction">Report an issue</ButtonLink>
          <ButtonLink href="/scholarships" variant="outline">
            Explore verified scholarships
          </ButtonLink>
        </div>
      </LegalSection>

      <LegalContactBox title="Limitation Disclaimer">
        <p>
          Scholars Republic is an information and preparation platform. It is not an official
          scholarship provider, university, embassy, government office, or admission agency. Final
          scholarship decisions and official requirements always belong to the relevant provider.
        </p>
      </LegalContactBox>
    </LegalPageShell>
  );
}
