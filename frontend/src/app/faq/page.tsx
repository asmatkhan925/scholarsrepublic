import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import { LegalPageShell, LegalSection } from "@/components/legal-page";
import { createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Scholars Republic",
  description:
    "Answers to common questions about Scholars Republic — how scholarship matching works, account setup, profile privacy, AI tools, and how to use the platform.",
  openGraph: {
    title: "Frequently Asked Questions | Scholars Republic",
    description:
      "Answers to common questions about Scholars Republic — how scholarship matching works, account setup, profile privacy, AI tools, and how to use the platform.",
    type: "website",
  },
  alternates: {
    canonical: "/faq",
  },
};

type FaqItem = { question: string; answer: React.ReactNode };
type FaqSection = { title: string; items: FaqItem[] };

const faqSections: FaqSection[] = [
  {
    title: "About Scholars Republic",
    items: [
      {
        question: "What is Scholars Republic?",
        answer:
          "Scholars Republic is a scholarship discovery and student support platform built for Pakistani students. It helps you find verified scholarships, save opportunities, track your applications, and prepare stronger documents using guides and AI tools.",
      },
      {
        question: "Is Scholars Republic free to use?",
        answer:
          "Yes. Creating an account, browsing scholarships, saving opportunities, tracking applications, reading guides, and using core platform features are all free.",
      },
      {
        question: "Who runs Scholars Republic?",
        answer: (
          <>
            Scholars Republic is an independent platform focused on the Pakistani student market. You
            can learn more on the{" "}
            <Link href="/about" className="font-semibold text-pine hover:text-pine/80">
              About page
            </Link>
            .
          </>
        ),
      },
      {
        question: "How is Scholars Republic different from a simple Google search?",
        answer:
          "Scholars Republic organizes scholarships in one place with structured eligibility, deadline, and document information. You can save opportunities, track application progress, get matched scholarships based on your profile, use AI to draft documents, and get practical preparation guides — all in one workspace.",
      },
    ],
  },
  {
    title: "Scholarships & Listings",
    items: [
      {
        question: "Are the scholarships on Scholars Republic real?",
        answer:
          "Scholars Republic focuses on verified listings with links to official sources. Each scholarship is checked against official provider websites where possible. Students should always confirm deadlines, eligibility, and requirements on the official scholarship page before applying.",
      },
      {
        question: "How often are scholarships updated?",
        answer:
          "Scholarships are updated regularly. Listings include a verification date to help students understand when information was last checked. Because scholarship details can change, always confirm on the official provider website.",
      },
      {
        question: "Can I apply for scholarships directly through Scholars Republic?",
        answer:
          "No. Scholars Republic is a discovery and preparation platform. Each scholarship listing links to the official source where you must apply. Scholars Republic does not process applications on behalf of scholarship providers.",
      },
      {
        question: "What does the verified badge mean?",
        answer: (
          <>
            A verified badge means the scholarship details were checked against an official source
            such as the scholarship provider website, university, or government portal. Read the{" "}
            <Link
              href="/verification-policy"
              className="font-semibold text-pine hover:text-pine/80"
            >
              Verification Policy
            </Link>{" "}
            for details.
          </>
        ),
      },
      {
        question: "Why are some scholarships marked as expired?",
        answer:
          "Scholarships with past deadlines are marked expired. They remain visible so students can plan ahead for the next cycle. Use filters to show only active or upcoming deadlines.",
      },
      {
        question: "A scholarship I found has wrong information. How do I report it?",
        answer: (
          <>
            Email{" "}
            <a
              href="mailto:support@scholarsrepublic.org"
              className="font-semibold text-pine hover:text-pine/80"
            >
              support@scholarsrepublic.org
            </a>{" "}
            with the scholarship name and the correction. We review reports and update listings
            accordingly.
          </>
        ),
      },
    ],
  },
  {
    title: "Account & Profile",
    items: [
      {
        question: "How do I create an account?",
        answer: (
          <>
            Visit the{" "}
            <Link href="/register" className="font-semibold text-pine hover:text-pine/80">
              registration page
            </Link>{" "}
            and sign up with your email. You will receive a verification email to activate your
            account.
          </>
        ),
      },
      {
        question: "Why do I need to verify my email?",
        answer:
          "Email verification confirms your account is active and secure. Without verification, some features may be restricted.",
      },
      {
        question: "What information does my profile collect?",
        answer:
          "Your profile collects academic background, target countries, degree level goals, study fields, language skills, and document status. This information is used to calculate your scholarship match score and improve recommendations. You can read the full details in the Privacy Policy.",
      },
      {
        question: "Does completing my profile improve scholarship matches?",
        answer:
          "Yes. A more complete profile improves your match score by giving the platform more information to compare against scholarship eligibility criteria. The dashboard shows exactly which fields are missing and how they affect your readiness.",
      },
      {
        question: "Can I delete my account?",
        answer: (
          <>
            Yes. Contact{" "}
            <a
              href="mailto:support@scholarsrepublic.org"
              className="font-semibold text-pine hover:text-pine/80"
            >
              support@scholarsrepublic.org
            </a>{" "}
            to request account deletion. We will remove your account and associated data in line
            with the{" "}
            <Link href="/privacy-policy" className="font-semibold text-pine hover:text-pine/80">
              Privacy Policy
            </Link>
            .
          </>
        ),
      },
      {
        question: "Is my profile information shared publicly?",
        answer:
          "No. Your profile information is used internally to calculate match scores and recommendations. It is not displayed publicly or shared with scholarship providers.",
      },
    ],
  },
  {
    title: "Matching & Recommendations",
    items: [
      {
        question: "How does scholarship matching work?",
        answer:
          "Scholars Republic compares your profile — including degree level, field of study, target countries, language skills, and document readiness — against the eligibility criteria of each scholarship. The result is a match score shown on scholarship listings and in your recommendations.",
      },
      {
        question: "Why is my match score low?",
        answer:
          "A low match score usually means your profile is incomplete or the scholarship criteria do not align with your current profile fields. Visit the dashboard to see which fields are missing and how completing them improves your score.",
      },
      {
        question: "Does a high match score guarantee acceptance?",
        answer:
          "No. A match score reflects profile-to-eligibility alignment, not your actual chances of being selected. Scholarship selection depends on competition, application quality, references, and the scholarship provider's own criteria.",
      },
    ],
  },
  {
    title: "Application Tracker",
    items: [
      {
        question: "What is the application tracker?",
        answer:
          "The application tracker lets you track scholarships you are actively pursuing. You can set a status (submitted, under review, accepted, rejected), add a deadline and priority, write notes, and track your readiness. It helps you manage multiple applications without losing track.",
      },
      {
        question: "Does Scholars Republic submit applications for me?",
        answer:
          "No. The tracker is for your own organization only. All actual scholarship applications must be submitted through the official scholarship portal or as instructed by the provider.",
      },
      {
        question: "Can I track multiple applications at once?",
        answer: "Yes. There is no limit on the number of applications you can track.",
      },
    ],
  },
  {
    title: "AI Tools",
    items: [
      {
        question: "What AI tools are available?",
        answer:
          "Currently, Scholars Republic offers an AI-powered SOP (Statement of Purpose) generator that helps you draft a scholarship SOP based on your profile and a selected scholarship. More tools are planned.",
      },
      {
        question: "Is the AI SOP output ready to submit?",
        answer:
          "No. The AI output is a draft starting point. You must review, edit, and personalize it before submitting. AI-generated text can be inaccurate or generic — always make it your own.",
      },
      {
        question: "Is there a limit on AI tool usage?",
        answer:
          "Yes, AI tools have a monthly usage limit to ensure fair access. The current limit is shown in the tool itself.",
      },
      {
        question: "Is my SOP data used to train AI models?",
        answer:
          "Your SOP inputs are processed to generate a draft response. Read the Privacy Policy for full details on how AI tool data is handled.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      {
        question: "How does Scholars Republic protect my data?",
        answer: (
          <>
            Scholars Republic uses HTTPS encryption, secure authentication, and access controls to
            protect your data. Read the{" "}
            <Link href="/privacy-policy" className="font-semibold text-pine hover:text-pine/80">
              Privacy Policy
            </Link>{" "}
            for full details.
          </>
        ),
      },
      {
        question: "Does Scholars Republic use cookies?",
        answer: (
          <>
            Yes. Scholars Republic uses cookies for authentication, site functionality, and
            advertising (Google AdSense). You can manage cookie preferences using the consent
            banner. See the{" "}
            <Link href="/privacy-policy" className="font-semibold text-pine hover:text-pine/80">
              Privacy Policy
            </Link>{" "}
            for details.
          </>
        ),
      },
      {
        question: "Does Scholars Republic show ads?",
        answer:
          "Yes. Scholars Republic uses Google AdSense to display advertisements that help support the platform. You can opt out of personalized ads via Google Ads Settings.",
      },
    ],
  },
  {
    title: "Getting Help",
    items: [
      {
        question: "How do I contact Scholars Republic?",
        answer: (
          <>
            Email{" "}
            <a
              href="mailto:support@scholarsrepublic.org"
              className="font-semibold text-pine hover:text-pine/80"
            >
              support@scholarsrepublic.org
            </a>{" "}
            for account support, scholarship corrections, privacy requests, or general questions.
          </>
        ),
      },
      {
        question: "Where can I find scholarship guides?",
        answer: (
          <>
            The{" "}
            <Link href="/guides" className="font-semibold text-pine hover:text-pine/80">
              Guides section
            </Link>{" "}
            has practical guides covering SOPs, study plans, CVs, professor emails, country-specific
            scholarships, application checklists, and more.
          </>
        ),
      },
      {
        question: "I found a bug or have a suggestion. How do I report it?",
        answer: (
          <>
            Email{" "}
            <a
              href="mailto:support@scholarsrepublic.org"
              className="font-semibold text-pine hover:text-pine/80"
            >
              support@scholarsrepublic.org
            </a>{" "}
            with a description of the issue or suggestion. We read all feedback.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqSections.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: typeof item.answer === "string" ? item.answer : item.question,
        },
      })),
    ),
  };

  return (
    <>
      <JsonLd
        data={[
          jsonLdFaq,
          createWebPageJsonLd({
            name: "Frequently Asked Questions",
            description:
              "Answers to common questions about Scholars Republic — scholarship matching, account setup, AI tools, privacy, and how to get help.",
            path: "/faq",
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />
      <LegalPageShell
        label="Help"
        title="Frequently Asked Questions"
        intro={
          <p>
            Common questions about Scholars Republic, how scholarship matching works, account
            management, AI tools, and how to get support. For anything not answered here, email{" "}
            <a
              href="mailto:support@scholarsrepublic.org"
              className="font-semibold text-pine hover:text-pine/80"
            >
              support@scholarsrepublic.org
            </a>
            .
          </p>
        }
      >
        {faqSections.map((section) => (
          <LegalSection key={section.title} title={section.title}>
            <div className="grid gap-4">
              {section.items.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-pine/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-[#181b1d]"
                >
                  <p className="font-semibold text-ink dark:text-white">{item.question}</p>
                  <div className="mt-2 text-sm leading-7 text-ink/68 dark:text-white/58">
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>
          </LegalSection>
        ))}
      </LegalPageShell>
    </>
  );
}
