export type DiscoveryLandingPage = {
  slug: string;
  title: string;
  description: string;
  badge: string;
  searchHref: string;
  searchLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  intentTitle: string;
  intentBullets: string[];
  filterSummary: {
    label: string;
    value: string;
  }[];
  relatedGuides: {
    title: string;
    description: string;
    href: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  metaTitle: string;
  metaDescription: string;
};

export const discoveryLandingPages: DiscoveryLandingPage[] = [
  {
    slug: "fully-funded-scholarships-for-pakistani-students",
    title: "Fully Funded Scholarships for Pakistani Students",
    description:
      "Find scholarship opportunities with full funding coverage and use official source links to confirm deadlines, eligibility, benefits, and application requirements before applying.",
    badge: "Funding",
    searchHref: "/scholarships?funding_type=fully_funded",
    searchLabel: "View fully funded scholarships",
    secondaryHref: "/guides/fully-funded-scholarships-for-pakistani-students-2026",
    secondaryLabel: "Read fully funded scholarship guide",
    intentTitle:
      "This page is useful if you are looking for scholarships that may cover tuition, stipend, living support, or other major study costs.",
    intentBullets: [
      "You want to compare scholarships by funding coverage.",
      "You want to focus on opportunities with stronger financial support.",
      "You want to confirm official funding details before applying.",
      "You are preparing documents for competitive scholarship applications.",
    ],
    filterSummary: [
      { label: "Funding", value: "Fully funded" },
      { label: "Best next step", value: "Confirm coverage on the official source" },
      {
        label: "Recommended check",
        value: "Tuition, stipend, accommodation, travel, insurance, and documents",
      },
    ],
    relatedGuides: [
      {
        title: "Fully Funded Scholarships for Pakistani Students in 2026",
        description: "Use the guide to plan your search, documents, and official source checks.",
        href: "/guides/fully-funded-scholarships-for-pakistani-students-2026",
      },
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for competitive scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
    ],
    faq: [
      {
        question: "Does fully funded always mean everything is covered?",
        answer:
          "Not always. Students should confirm tuition, stipend, accommodation, travel, insurance, and other benefits from the official scholarship provider.",
      },
      {
        question: "Should I still check the official source?",
        answer:
          "Yes. Funding details can change, so students should always confirm final coverage and eligibility on the official provider website.",
      },
      {
        question: "What documents are usually needed?",
        answer:
          "Common documents include CV, transcripts, recommendation letters, SOP or motivation letter, passport, and language proof, but exact requirements depend on the provider.",
      },
    ],
    metaTitle: "Fully Funded Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find fully funded scholarships for Pakistani students and check official source links, deadlines, eligibility, funding coverage, and application requirements.",
  },
  {
    slug: "scholarships-without-ielts-for-pakistani-students",
    title: "Scholarships Without IELTS for Pakistani Students",
    description:
      "Explore scholarship opportunities where IELTS may not be required and confirm accepted language alternatives from the official provider before applying.",
    badge: "Without IELTS",
    searchHref: "/scholarships?no_ielts=true",
    searchLabel: "View scholarships without IELTS",
    secondaryHref: "/guides/scholarships-without-ielts-for-pakistani-students",
    secondaryLabel: "Read without IELTS guide",
    intentTitle:
      "This page is useful if you want scholarships that may accept alternatives to IELTS.",
    intentBullets: [
      "You studied in English-medium education.",
      "You want to check scholarships that may accept English proficiency certificates.",
      "You want to avoid unnecessary test costs.",
      "You still want to confirm language rules from official providers.",
    ],
    filterSummary: [
      { label: "Language filter", value: "No IELTS" },
      { label: "Best next step", value: "Confirm accepted alternatives" },
      {
        label: "Recommended check",
        value: "English certificate, TOEFL, Duolingo, interview, or university-specific proof",
      },
    ],
    relatedGuides: [
      {
        title: "Scholarships Without IELTS for Pakistani Students",
        description: "Understand alternatives, risks, and official language requirements.",
        href: "/guides/scholarships-without-ielts-for-pakistani-students",
      },
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for competitive scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
    ],
    faq: [
      {
        question: "Does without IELTS mean no English requirement?",
        answer:
          "Not always. Some providers may accept alternatives such as English-medium certificates, TOEFL, Duolingo, interviews, or internal language proof.",
      },
      {
        question: "Can every Pakistani student apply without IELTS?",
        answer:
          "No. Eligibility depends on the provider, university, country, and program requirements.",
      },
      {
        question: "Should I prepare an English proficiency certificate?",
        answer:
          "Yes, if your university can issue one. Many scholarships that waive IELTS may still ask for proof of previous English-medium study.",
      },
    ],
    metaTitle: "Scholarships Without IELTS for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find scholarships without IELTS for Pakistani students and confirm official language requirements, accepted alternatives, deadlines, and eligibility.",
  },
  {
    slug: "no-application-fee-scholarships-for-pakistani-students",
    title: "No Application Fee Scholarships for Pakistani Students",
    description:
      "Find scholarship opportunities where no application fee is listed and confirm the final application cost from the official scholarship provider.",
    badge: "No Application Fee",
    searchHref: "/scholarships?no_application_fee=true",
    searchLabel: "View no application fee scholarships",
    secondaryHref: "/guides/scholarship-application-checklist",
    secondaryLabel: "Open application checklist",
    intentTitle:
      "This page is useful if you want to avoid unnecessary application costs while shortlisting scholarships.",
    intentBullets: [
      "You want to focus on low-cost or free application options.",
      "You are applying to multiple scholarships and want to reduce expenses.",
      "You want to confirm whether the official application portal charges a fee.",
      "You want to prioritize serious opportunities before spending money.",
    ],
    filterSummary: [
      { label: "Application cost", value: "No fee listed" },
      { label: "Best next step", value: "Confirm fee on official source" },
      {
        label: "Recommended check",
        value: "Application portal, department fee, admission fee, and payment instructions",
      },
    ],
    relatedGuides: [
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Organize academic background and achievements clearly.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for competitive scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
    ],
    faq: [
      {
        question: "Does no application fee mean the full process is free?",
        answer:
          "Not always. The scholarship application may be free, but other costs such as document attestation, courier, admission processing, or visa-related fees may still exist.",
      },
      {
        question: "Should I pay an agent for these scholarships?",
        answer:
          "Scholars Republic is not an agent and does not recommend paying unofficial parties. Always use official provider instructions.",
      },
      {
        question: "How can I confirm there is no fee?",
        answer:
          "Check the official application portal and scholarship provider page before submitting.",
      },
    ],
    metaTitle: "No Application Fee Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find no application fee scholarships for Pakistani students and confirm official application costs, deadlines, eligibility, and document requirements.",
  },
  {
    slug: "phd-scholarships-for-pakistani-students",
    title: "PhD Scholarships for Pakistani Students",
    description:
      "Explore PhD scholarship opportunities and use Scholars Republic to shortlist programs, check eligibility, and prepare research-focused application documents.",
    badge: "PhD",
    searchHref: "/scholarships?search=PhD",
    searchLabel: "View PhD scholarships",
    secondaryHref: "/guides/how-to-email-professor-for-research-supervision",
    secondaryLabel: "Read professor email guide",
    intentTitle: "This page is useful if you are preparing for research-based graduate study.",
    intentBullets: [
      "You are searching for funded PhD positions or doctoral scholarships.",
      "You need to contact supervisors or research groups.",
      "You are preparing a CV, SOP, research plan, or study plan.",
      "You want to check eligibility, funding, and deadlines before applying.",
    ],
    filterSummary: [
      { label: "Degree level", value: "PhD" },
      { label: "Best next step", value: "Check supervisor, research fit, and funding rules" },
      {
        label: "Recommended check",
        value: "Proposal, publications, CV, transcripts, references, and language requirements",
      },
    ],
    relatedGuides: [
      {
        title: "How to Email Professor for Research Supervision",
        description: "Contact supervisors and research groups with concise emails.",
        href: "/guides/how-to-email-professor-for-research-supervision",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for competitive scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Organize academic background and achievements clearly.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
    ],
    faq: [
      {
        question: "Do PhD scholarships always require a supervisor?",
        answer:
          "Not always. Some programs require supervisor acceptance before application, while others assign supervisors after admission.",
      },
      {
        question: "What documents are important for PhD scholarships?",
        answer:
          "Common documents include academic CV, research proposal or study plan, SOP, transcripts, recommendation letters, publications if available, and language proof.",
      },
      {
        question: "Should I email professors before applying?",
        answer:
          "For many research-based programs, contacting a potential supervisor can be helpful, but students should follow the official program instructions.",
      },
    ],
    metaTitle: "PhD Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find PhD scholarships for Pakistani students and prepare research-focused applications with official source checks, supervisor guidance, CV, SOP, and document planning.",
  },
  {
    slug: "masters-scholarships-for-pakistani-students",
    title: "Master's Scholarships for Pakistani Students",
    description:
      "Explore master's scholarship opportunities and prepare stronger applications with clear document planning, eligibility checks, and official source verification.",
    badge: "Master's",
    searchHref: "/scholarships?search=Master",
    searchLabel: "View master's scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle: "This page is useful if you are preparing for master's study abroad.",
    intentBullets: [
      "You want to find funded master's opportunities.",
      "You are preparing SOP, CV, transcripts, and recommendation letters.",
      "You want to compare countries, funding types, and deadlines.",
      "You want to confirm official eligibility and application steps.",
    ],
    filterSummary: [
      { label: "Degree level", value: "Master's" },
      { label: "Best next step", value: "Check eligibility and document requirements" },
      {
        label: "Recommended check",
        value: "Degree requirements, CGPA, language proof, SOP, CV, and deadline",
      },
    ],
    relatedGuides: [
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for competitive scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Organize academic background and achievements clearly.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
    ],
    faq: [
      {
        question: "What documents are usually required for master's scholarships?",
        answer:
          "Common documents include transcripts, degree certificate, CV, SOP or motivation letter, recommendation letters, passport, and language proof.",
      },
      {
        question: "Can final-year students apply?",
        answer:
          "Some scholarships allow final-year students, while others require a completed degree. Always check the official eligibility rules.",
      },
      {
        question: "Should I apply to multiple scholarships?",
        answer:
          "Yes, if you meet the requirements. Students should shortlist serious opportunities and track deadlines carefully.",
      },
    ],
    metaTitle: "Master's Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find master's scholarships for Pakistani students and prepare stronger applications with SOP, CV, checklist, eligibility, deadline, and official source guidance.",
  },
];

export const discoveryLandingPageSlugs = discoveryLandingPages.map((page) => page.slug);

export function getDiscoveryLandingPage(slug: string) {
  return discoveryLandingPages.find((page) => page.slug === slug);
}
