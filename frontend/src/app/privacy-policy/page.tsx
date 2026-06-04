import type { Metadata } from "next";
import Link from "next/link";

import { LegalContactBox, LegalList, LegalPageShell, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Scholars Republic",
  description:
    "Learn how Scholars Republic handles account data, student profiles, scholarship activity, cookies, AI tools, service providers, and advertising cookies.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      label="Legal"
      title="Privacy Policy"
      updated="Last updated: May 2026"
      intro={
        <p>
          Scholars Republic helps students discover scholarships, save opportunities, track
          applications, prepare documents, and use student tools. This policy explains what
          information we may collect, how it is used, and the choices available to users.
        </p>
      }
    >
      <LegalSection title="Introduction">
        <p>
          We operate Scholars Republic as a scholarship discovery and student support platform. Our
          goal is to collect only the information needed to provide accounts, scholarship tools,
          recommendations, application tracking, support, and site reliability.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <p>Depending on how you use Scholars Republic, information we collect may include:</p>
        <LegalList
          items={[
            "Account information, such as name, email address, password hash, account status, and email verification status.",
            "Student profile information, such as education level, fields of study, target countries, scholarship preferences, documents, or academic details users choose to add.",
            "Scholarship activity, including saved opportunities, application tracker data, shortlist actions, and tracking actions.",
            "Comments and user submissions where those features are available.",
            "AI tool inputs and outputs where students use AI features for drafts or suggestions.",
            "Support or contact messages sent to Scholars Republic.",
            "Basic analytics and log data, such as pages visited, browser or device information, IP address, errors, and security logs.",
          ]}
        />
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>We use information to provide, secure, and improve the platform, including to:</p>
        <LegalList
          items={[
            "Create accounts and protect account access.",
            "Send email verification, password reset, and important account messages.",
            "Power recommendations, profile matching, saved opportunities, and application tracking.",
            "Provide AI and document tools where available.",
            "Respond to support requests and correct reported issues.",
            "Improve site reliability, security, content quality, and user experience.",
            "Prevent misuse, spam, abuse, and suspicious activity.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Cookies, Local Storage, and Similar Technologies">
        <p>
          Scholars Republic may use cookies, local storage, and similar browser technologies for
          essential login and session functionality, remembering preferences, security, and site
          features. You can control cookies and site storage through your browser settings.
          Disabling essential storage may prevent login, saved opportunities, or other account
          features from working correctly.
        </p>
      </LegalSection>

      <LegalSection title="Google AdSense and Third-Party Advertising Cookies">
        <p>
          Scholars Republic uses Google AdSense. Third-party vendors, including Google, use cookies
          to serve ads based on a user&apos;s prior visits to this website or other websites.
        </p>
        <p>
          Google&apos;s use of advertising cookies enables Google and its partners to serve ads to
          users based on visits to Scholars Republic and/or other websites on the Internet.
        </p>
        <p>
          Users may opt out of personalized advertising by visiting{" "}
          <a
            href="https://adssettings.google.com/"
            className="font-semibold text-pine hover:text-pine/80"
            rel="noreferrer"
            target="_blank"
          >
            Google Ads Settings
          </a>
          . Users may also manage cookies through their browser settings.
        </p>
      </LegalSection>

      <LegalSection title="AI Tools and Generated Content">
        <p>
          AI tools may process user-provided prompts, profile details, and draft content to generate
          suggestions or application document drafts. Users should not include sensitive information
          they do not want processed. AI output can be inaccurate or incomplete, and users must
          review, edit, and verify all AI-assisted content before using it.
        </p>
      </LegalSection>

      <LegalSection title="Emails and Service Providers">
        <p>
          Verification, password reset, and important account emails may be sent through email
          service providers. Third-party service providers may process data only as needed to provide
          services such as email delivery, hosting, security, analytics, or platform operations.
        </p>
      </LegalSection>

      <LegalSection title="Comments and User Submissions">
        <p>
          Comments and user submissions may be moderated, reviewed, hidden, or removed for safety,
          spam, abuse, misleading content, or policy compliance. Do not post private, sensitive, or
          confidential details in public comments.
        </p>
      </LegalSection>

      <LegalSection title="Data Retention">
        <p>
          Account and profile data is generally kept while an account is active or as needed to
          provide services. Some logs, security records, and operational records may be retained for
          site reliability, troubleshooting, and abuse prevention. Users can contact us with privacy
          or deletion questions.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use reasonable safeguards to protect account and platform data. No website, server, or
          online transmission can be guaranteed to be 100% secure, so users should also protect their
          passwords and avoid sharing sensitive information unnecessarily.
        </p>
      </LegalSection>

      <LegalSection title="Children's Privacy">
        <p>
          Scholars Republic is intended for students and applicants who can use online services
          responsibly. Users under the required age in their location should use the platform with
          parent or guardian guidance where applicable.
        </p>
      </LegalSection>

      <LegalSection title="Your Choices and Requests">
        <p>
          Users can update profile information where account tools are available, manage cookies
          through browser controls, and contact us for privacy or deletion questions.
        </p>
      </LegalSection>

      <LegalSection title="Changes to This Policy">
        <p>
          We may update this policy as Scholars Republic changes. When we make updates, the
          &quot;Last updated&quot; date on this page will change.
        </p>
      </LegalSection>

      <LegalContactBox>
        <p>
          For privacy questions or data requests, contact us through the{" "}
          <Link href="/contact" className="font-semibold text-pine hover:text-pine/80">
            contact page
          </Link>
          .
        </p>
      </LegalContactBox>
    </LegalPageShell>
  );
}
