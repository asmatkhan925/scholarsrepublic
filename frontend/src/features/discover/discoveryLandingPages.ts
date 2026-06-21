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

  // ── Country pages ──────────────────────────────────────────────
  {
    slug: "china-scholarships-for-pakistani-students",
    title: "China Scholarships for Pakistani Students",
    description:
      "Explore Chinese government and university scholarships for Pakistani students, confirm official eligibility, and prepare the right documents before applying.",
    badge: "China",
    searchHref: "/scholarships?country=China",
    searchLabel: "View China scholarships",
    secondaryHref: "/guides/china-scholarships-for-pakistani-students",
    secondaryLabel: "Read China scholarship guide",
    intentTitle:
      "This page is useful if you want to study in China through government or university-funded scholarships.",
    intentBullets: [
      "You want to explore CSC, provincial, or university scholarships.",
      "You need to check language requirements such as HSK or English proof.",
      "You are preparing a study plan, SOP, or research proposal.",
      "You want to confirm deadlines and eligibility from official Chinese institutions.",
    ],
    filterSummary: [
      { label: "Country", value: "China" },
      { label: "Common scholarships", value: "CSC, provincial government, university-specific" },
      { label: "Recommended check", value: "HSK level, supervisor contact, and official portal" },
    ],
    relatedGuides: [
      {
        title: "China Scholarships for Pakistani Students",
        description: "Understand CSC, provincial, and university scholarship options in China.",
        href: "/guides/china-scholarships-for-pakistani-students",
      },
      {
        title: "How to Email Professor for Research Supervision",
        description: "Contact Chinese supervisors and research groups before applying.",
        href: "/guides/how-to-email-professor-for-research-supervision",
      },
      {
        title: "How to Write a Study Plan for Scholarship",
        description: "Prepare a strong study plan for Chinese scholarship applications.",
        href: "/guides/how-to-write-study-plan-for-scholarship",
      },
    ],
    faq: [
      {
        question: "Do China scholarships require HSK for Pakistani students?",
        answer:
          "Many Chinese-taught programs require HSK. English-taught programs may accept IELTS or an English proficiency certificate. Always confirm the language requirement on the official scholarship page.",
      },
      {
        question: "Do I need to contact a supervisor before applying to a CSC scholarship?",
        answer:
          "For research-based programs, contacting a supervisor first is strongly recommended. For taught master's programs, it may not be required. Follow the official program instructions.",
      },
      {
        question: "What documents are usually required for China scholarships?",
        answer:
          "Common documents include passport, academic transcripts, degree certificate, CV, study plan, recommendation letters, and language proof. Requirements vary by scholarship provider.",
      },
    ],
    metaTitle: "China Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find China scholarships for Pakistani students including CSC and university-funded opportunities. Confirm eligibility, documents, and deadlines from official sources.",
  },
  {
    slug: "germany-scholarships-for-pakistani-students",
    title: "Germany Scholarships for Pakistani Students",
    description:
      "Find German scholarships including DAAD and university-funded opportunities for Pakistani students, and confirm requirements from official sources before applying.",
    badge: "Germany",
    searchHref: "/scholarships?country=Germany",
    searchLabel: "View Germany scholarships",
    secondaryHref: "/guides/daad-scholarships-for-pakistani-students",
    secondaryLabel: "Read DAAD scholarship guide",
    intentTitle:
      "This page is useful if you want to study in Germany through funded scholarship programs.",
    intentBullets: [
      "You are researching DAAD, Deutschlandstipendium, or university scholarships.",
      "You want to check language requirements such as TestDaF, DSH, or IELTS.",
      "You are preparing a motivation letter, CV, or research proposal.",
      "You want to confirm official deadlines and eligibility from German institutions.",
    ],
    filterSummary: [
      { label: "Country", value: "Germany" },
      { label: "Common scholarships", value: "DAAD, Deutschlandstipendium, university-funded" },
      { label: "Recommended check", value: "Language requirement, APS certificate, and portal" },
    ],
    relatedGuides: [
      {
        title: "DAAD Scholarships for Pakistani Students",
        description: "Understand DAAD programs, eligibility, and application steps.",
        href: "/guides/daad-scholarships-for-pakistani-students",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a strong motivation letter for German scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Format your academic CV for European scholarship applications.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
    ],
    faq: [
      {
        question: "Do Pakistani students need an APS certificate for Germany?",
        answer:
          "Yes, most Pakistani students applying to German universities must obtain an APS (Academic Evaluation Centre) certificate. Check the APS Pakistan website for current requirements and processing times.",
      },
      {
        question: "What language is required for Germany scholarships?",
        answer:
          "English-taught programs may accept IELTS or TOEFL. German-taught programs require TestDaF or DSH. Always confirm the language requirement on the official program page.",
      },
      {
        question: "When should I apply for DAAD scholarships?",
        answer:
          "DAAD deadlines vary by program, typically falling between October and January for the following academic year. Confirm current deadlines on the DAAD official website.",
      },
    ],
    metaTitle: "Germany Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find Germany scholarships for Pakistani students including DAAD and university-funded programs. Check eligibility, APS requirements, deadlines, and official sources.",
  },
  {
    slug: "turkey-scholarships-for-pakistani-students",
    title: "Turkey Scholarships for Pakistani Students",
    description:
      "Explore Türkiye Burslari and university scholarships in Turkey for Pakistani students, confirm eligibility, and prepare the right documents for a competitive application.",
    badge: "Turkey",
    searchHref: "/scholarships?country=Turkey",
    searchLabel: "View Turkey scholarships",
    secondaryHref: "/guides/turkiye-burslari-guide-for-pakistani-students",
    secondaryLabel: "Read Türkiye Burslari guide",
    intentTitle:
      "This page is useful if you are preparing a Türkiye Burslari or other Turkish scholarship application.",
    intentBullets: [
      "You want to apply for Türkiye Burslari or university-funded scholarships.",
      "You want to compare funding, programs, cities, and universities.",
      "You are preparing a study plan, SOP, and personal statement.",
      "You want to confirm language requirements and deadlines from official sources.",
    ],
    filterSummary: [
      { label: "Country", value: "Turkey" },
      { label: "Common scholarships", value: "Türkiye Burslari, university scholarships" },
      { label: "Recommended check", value: "Official Burslari portal, language requirement, interview" },
    ],
    relatedGuides: [
      {
        title: "Türkiye Burslari Guide for Pakistani Students",
        description: "Understand Türkiye Burslari eligibility, process, and application tips.",
        href: "/guides/turkiye-burslari-guide-for-pakistani-students",
      },
      {
        title: "How to Write a Study Plan for Scholarship",
        description: "Prepare a clear study plan for Turkish scholarship applications.",
        href: "/guides/how-to-write-study-plan-for-scholarship",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused personal statement for Turkish scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
    ],
    faq: [
      {
        question: "Is Turkish language required for Türkiye Burslari?",
        answer:
          "Most undergraduate programs are Turkish-taught. Postgraduate programs may be available in English. Turkish language courses are often provided in the first year for awardees of Turkish-taught programs.",
      },
      {
        question: "When does Türkiye Burslari open for applications?",
        answer:
          "The application window typically opens in January or February. Confirm current dates on the official Türkiye Burslari website as they may change each year.",
      },
      {
        question: "Does Türkiye Burslari include accommodation and stipend?",
        answer:
          "Türkiye Burslari typically includes tuition, a monthly stipend, accommodation, health insurance, and a return flight. Confirm the current benefit package from the official scholarship page.",
      },
    ],
    metaTitle: "Turkey Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find Turkey scholarships for Pakistani students including Türkiye Burslari. Check eligibility, funding benefits, language requirements, and official application deadlines.",
  },
  {
    slug: "uk-scholarships-for-pakistani-students",
    title: "UK Scholarships for Pakistani Students",
    description:
      "Find United Kingdom scholarships for Pakistani students including Chevening, Commonwealth, and university-funded awards, and confirm eligibility from official sources.",
    badge: "United Kingdom",
    searchHref: "/scholarships?country=United Kingdom",
    searchLabel: "View UK scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle:
      "This page is useful if you want to study in the United Kingdom through competitive scholarship programs.",
    intentBullets: [
      "You want to explore Chevening, Commonwealth, or university scholarships.",
      "You need to meet IELTS or other English language requirements.",
      "You are preparing a personal statement, CV, and references.",
      "You want to confirm deadlines and official eligibility from UK institutions.",
    ],
    filterSummary: [
      { label: "Country", value: "United Kingdom" },
      { label: "Common scholarships", value: "Chevening, Commonwealth, university-funded" },
      { label: "Recommended check", value: "Work experience eligibility, IELTS score, and references" },
    ],
    relatedGuides: [
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a strong personal statement for UK scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Format your academic and professional CV for UK scholarship applications.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
    ],
    faq: [
      {
        question: "Do UK scholarships require work experience?",
        answer:
          "Chevening typically requires two years of work experience. Commonwealth and university scholarships may have different requirements. Always check official eligibility criteria.",
      },
      {
        question: "What IELTS score is required for UK scholarships?",
        answer:
          "Most UK scholarship programs require a minimum IELTS score of 6.5 or 7.0, but requirements vary by scholarship and program. Confirm on the official scholarship or university page.",
      },
      {
        question: "When should I apply for UK scholarships?",
        answer:
          "Chevening typically closes in November. Commonwealth and university scholarship deadlines vary. Check the official website of each scholarship provider for current dates.",
      },
    ],
    metaTitle: "UK Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find UK scholarships for Pakistani students including Chevening and Commonwealth awards. Check eligibility, work experience requirements, IELTS scores, and official deadlines.",
  },
  {
    slug: "usa-scholarships-for-pakistani-students",
    title: "USA Scholarships for Pakistani Students",
    description:
      "Explore United States scholarships for Pakistani students including Fulbright and university-funded awards, and confirm official requirements before applying.",
    badge: "USA",
    searchHref: "/scholarships?country=USA",
    searchLabel: "View USA scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle:
      "This page is useful if you want to study in the United States through funded scholarship programs.",
    intentBullets: [
      "You want to explore Fulbright, HEC-funded, or university scholarships.",
      "You need to understand GRE, GMAT, or TOEFL requirements.",
      "You are preparing a statement of purpose and academic references.",
      "You want to confirm official eligibility and deadlines from US institutions.",
    ],
    filterSummary: [
      { label: "Country", value: "USA" },
      { label: "Common scholarships", value: "Fulbright, HEC, university-funded" },
      { label: "Recommended check", value: "GRE/GMAT requirement, TOEFL score, and references" },
    ],
    relatedGuides: [
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a strong statement of purpose for US scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "How to Email Professor for Research Supervision",
        description: "Contact US faculty and research groups before applying.",
        href: "/guides/how-to-email-professor-for-research-supervision",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Format your academic CV for US scholarship and graduate applications.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
    ],
    faq: [
      {
        question: "Do US scholarships require GRE scores?",
        answer:
          "Some US graduate programs and scholarships require GRE or GMAT scores. Many programs have moved away from mandatory GRE. Always confirm test requirements on the official program page.",
      },
      {
        question: "Is Fulbright available for Pakistani students?",
        answer:
          "Yes, the Fulbright program has multiple scholarships for Pakistani students through the US-Pakistan Educational Foundation (USEFP). Check the USEFP website for current openings and eligibility.",
      },
      {
        question: "What TOEFL score is required for US scholarships?",
        answer:
          "Requirements vary by university and program, but a TOEFL iBT score of 80 or higher is commonly expected. Some programs accept IELTS instead.",
      },
    ],
    metaTitle: "USA Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find USA scholarships for Pakistani students including Fulbright and university-funded awards. Check GRE, TOEFL requirements, official eligibility, and application deadlines.",
  },
  {
    slug: "canada-scholarships-for-pakistani-students",
    title: "Canada Scholarships for Pakistani Students",
    description:
      "Find Canadian scholarships for Pakistani students including Vanier, university-funded awards, and research positions, and confirm official eligibility before applying.",
    badge: "Canada",
    searchHref: "/scholarships?country=Canada",
    searchLabel: "View Canada scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle:
      "This page is useful if you want to study or research in Canada through scholarship programs.",
    intentBullets: [
      "You want to explore Vanier CGS, university scholarships, or research funding.",
      "You need to confirm IELTS or TOEFL requirements for Canadian institutions.",
      "You are preparing a research proposal, SOP, and recommendation letters.",
      "You want to confirm deadlines and eligibility from Canadian scholarship providers.",
    ],
    filterSummary: [
      { label: "Country", value: "Canada" },
      { label: "Common scholarships", value: "Vanier CGS, university-funded, research awards" },
      { label: "Recommended check", value: "Language requirement, research fit, and supervisor contact" },
    ],
    relatedGuides: [
      {
        title: "How to Email Professor for Research Supervision",
        description: "Contact Canadian faculty and research groups before applying.",
        href: "/guides/how-to-email-professor-for-research-supervision",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for Canadian scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
    ],
    faq: [
      {
        question: "Are Canadian scholarships open to Pakistani students?",
        answer:
          "Yes, many Canadian university scholarships and research funding opportunities are open to international students including Pakistani applicants. Eligibility varies by program.",
      },
      {
        question: "What language tests are required for Canadian universities?",
        answer:
          "Most Canadian universities accept IELTS (typically 6.5+) or TOEFL. Requirements vary by university and program. Confirm with the official institution.",
      },
      {
        question: "Should I contact a supervisor before applying for Canadian research scholarships?",
        answer:
          "For research-based master's and PhD programs, contacting a potential supervisor in advance is strongly recommended and often required by Canadian programs.",
      },
    ],
    metaTitle: "Canada Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find Canada scholarships for Pakistani students including Vanier and university-funded programs. Check language requirements, research fit, official eligibility, and deadlines.",
  },
  {
    slug: "uae-scholarships-for-pakistani-students",
    title: "UAE Scholarships for Pakistani Students",
    description:
      "Explore United Arab Emirates scholarships and university-funded opportunities for Pakistani students, and confirm eligibility and requirements from official sources.",
    badge: "UAE",
    searchHref: "/scholarships?country=UAE",
    searchLabel: "View UAE scholarships",
    secondaryHref: "/guides/scholarship-application-checklist",
    secondaryLabel: "Open application checklist",
    intentTitle:
      "This page is useful if you want to study or receive funding through UAE-based scholarship programs.",
    intentBullets: [
      "You want to explore government or university scholarships in the UAE.",
      "You are checking language requirements and document expectations.",
      "You want to compare funding coverage and program options.",
      "You want to confirm official eligibility and deadlines before applying.",
    ],
    filterSummary: [
      { label: "Country", value: "UAE" },
      { label: "Common scholarships", value: "Government scholarships, university-funded awards" },
      { label: "Recommended check", value: "Eligibility, funding coverage, and official portal" },
    ],
    relatedGuides: [
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP for UAE scholarship applications.",
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
        question: "Are UAE scholarships open to Pakistani students?",
        answer:
          "Some UAE government and university scholarships are open to international students including Pakistani applicants. Eligibility conditions vary widely by program.",
      },
      {
        question: "What documents are usually needed for UAE scholarship applications?",
        answer:
          "Common requirements include passport, academic transcripts, degree certificate, CV, personal statement, and language proof. Always confirm with the official scholarship provider.",
      },
      {
        question: "Is proximity to Pakistan an advantage for UAE scholarships?",
        answer:
          "Geographic proximity reduces travel costs, but scholarship eligibility is based on academic merit and program requirements, not location.",
      },
    ],
    metaTitle: "UAE Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find UAE scholarships for Pakistani students including government and university-funded awards. Check eligibility, documents, funding coverage, and official deadlines.",
  },

  // ── Degree level pages ──────────────────────────────────────────
  {
    slug: "bachelors-scholarships-for-pakistani-students",
    title: "Bachelor's Scholarships for Pakistani Students",
    description:
      "Find undergraduate scholarship opportunities for Pakistani students and confirm official eligibility, funding coverage, and document requirements before applying.",
    badge: "Bachelor's",
    searchHref: "/scholarships?search=bachelor",
    searchLabel: "View bachelor's scholarships",
    secondaryHref: "/guides/scholarship-application-checklist",
    secondaryLabel: "Open application checklist",
    intentTitle:
      "This page is useful if you are searching for bachelor's or undergraduate scholarship funding.",
    intentBullets: [
      "You are currently in FSc, A-levels, or a related pre-university qualification.",
      "You want fully funded or partially funded undergraduate scholarships.",
      "You are preparing documents such as transcripts, CV, and motivation letter.",
      "You want to confirm official eligibility and deadlines before applying.",
    ],
    filterSummary: [
      { label: "Degree level", value: "Bachelor's / Undergraduate" },
      { label: "Best next step", value: "Confirm eligibility and grade requirements" },
      { label: "Recommended check", value: "Matric/FSc marks, age limit, language proof, and documents" },
    ],
    relatedGuides: [
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
      {
        title: "Scholarships Without IELTS for Pakistani Students",
        description: "Find scholarships that may not require IELTS for undergraduate applicants.",
        href: "/guides/scholarships-without-ielts-for-pakistani-students",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused motivation letter for undergraduate scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
    ],
    faq: [
      {
        question: "What grades are required for bachelor's scholarships?",
        answer:
          "Requirements vary by scholarship. Some require 70% or above in Matric and FSc, while others may require higher marks. Always check the official eligibility criteria.",
      },
      {
        question: "Can Pakistani students without IELTS apply for bachelor's scholarships?",
        answer:
          "Some bachelor's scholarships accept alternatives to IELTS, such as English proficiency certificates or school-level English medium education. Confirm language requirements with the official provider.",
      },
      {
        question: "What documents are usually needed for undergraduate scholarships?",
        answer:
          "Common documents include Matric and FSc transcripts, national identity card or B-form, passport, motivation letter, and recommendation letters if required.",
      },
    ],
    metaTitle: "Bachelor's Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find bachelor's and undergraduate scholarships for Pakistani students. Check grade requirements, language proof, funding coverage, and official deadlines.",
  },

  // ── Field of study pages ───────────────────────────────────────
  {
    slug: "engineering-scholarships-for-pakistani-students",
    title: "Engineering Scholarships for Pakistani Students",
    description:
      "Find engineering scholarship opportunities for Pakistani students studying civil, electrical, mechanical, chemical, and other engineering disciplines abroad.",
    badge: "Engineering",
    searchHref: "/scholarships?field=Engineering",
    searchLabel: "View engineering scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle:
      "This page is useful if you are an engineering student looking for funded study opportunities abroad.",
    intentBullets: [
      "You are studying or have studied engineering and want to pursue it further abroad.",
      "You want to find scholarships open to civil, electrical, mechanical, or other engineering disciplines.",
      "You are preparing a study plan, SOP, or research proposal.",
      "You want to confirm official eligibility, documents, and deadlines.",
    ],
    filterSummary: [
      { label: "Field", value: "Engineering" },
      { label: "Best next step", value: "Confirm field eligibility with the official provider" },
      { label: "Recommended check", value: "Degree discipline, CGPA requirement, and official portal" },
    ],
    relatedGuides: [
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused SOP that connects your engineering background to your goals.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "How to Email Professor for Research Supervision",
        description: "Contact engineering faculty or research groups for research positions.",
        href: "/guides/how-to-email-professor-for-research-supervision",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Present your engineering education and projects clearly.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
    ],
    faq: [
      {
        question: "Are engineering scholarships highly competitive?",
        answer:
          "Engineering is a popular field and many scholarships are competitive. Strong CGPA, relevant projects or research experience, and a focused SOP improve your chances.",
      },
      {
        question: "Do engineering scholarships cover all disciplines?",
        answer:
          "Many scholarships cover engineering broadly. Some may specify disciplines such as electrical, civil, or computer engineering. Confirm with the official scholarship page.",
      },
      {
        question: "Should engineering students contact a supervisor for research scholarships?",
        answer:
          "For research-based programs, contacting a potential supervisor is important. For taught programs, it is optional but can demonstrate commitment.",
      },
    ],
    metaTitle: "Engineering Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find engineering scholarships for Pakistani students in civil, electrical, mechanical, and other disciplines. Check CGPA requirements, documents, and official deadlines.",
  },
  {
    slug: "computer-science-scholarships-for-pakistani-students",
    title: "Computer Science Scholarships for Pakistani Students",
    description:
      "Find computer science and IT scholarship opportunities for Pakistani students studying software engineering, data science, AI, and related technology fields abroad.",
    badge: "Computer Science",
    searchHref: "/scholarships?field=Computer Science",
    searchLabel: "View computer science scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle:
      "This page is useful if you are a computer science or IT student looking for funded study opportunities abroad.",
    intentBullets: [
      "You study computer science, software engineering, AI, data science, or a related field.",
      "You want scholarships covering tuition, stipend, or research funding.",
      "You are preparing a technical SOP, project portfolio, or research proposal.",
      "You want to confirm official eligibility and deadlines before applying.",
    ],
    filterSummary: [
      { label: "Field", value: "Computer Science / IT" },
      { label: "Best next step", value: "Confirm field coverage and GPA requirement" },
      { label: "Recommended check", value: "Technical background, projects, and official portal" },
    ],
    relatedGuides: [
      {
        title: "How to Write SOP for Scholarship",
        description: "Write a technical SOP connecting your CS background to your study goals.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "How to Email Professor for Research Supervision",
        description: "Contact CS or AI research groups for research-based opportunities.",
        href: "/guides/how-to-email-professor-for-research-supervision",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Present your technical projects and academic background clearly.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
    ],
    faq: [
      {
        question: "Are computer science scholarships available for Pakistani students?",
        answer:
          "Yes, many scholarships are open to students in computer science, software engineering, AI, and data science. Competition is often high due to the popularity of the field.",
      },
      {
        question: "Do I need coding or research experience for CS scholarships?",
        answer:
          "Research-based programs benefit from published papers or project portfolios. Taught programs typically require strong academics and a focused SOP explaining your goals.",
      },
      {
        question: "Which countries have strong CS scholarship programs?",
        answer:
          "Germany, China, Turkey, UK, Canada, and South Korea all have scholarship programs that accept CS students. Check the official scholarship page for field-specific eligibility.",
      },
    ],
    metaTitle: "Computer Science Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find computer science scholarships for Pakistani students in CS, AI, software engineering, and data science. Check official eligibility, documents, and application deadlines.",
  },
  {
    slug: "medical-scholarships-for-pakistani-students",
    title: "Medical Scholarships for Pakistani Students",
    description:
      "Find medicine and health sciences scholarship opportunities for Pakistani students, confirm official eligibility, and understand document requirements before applying.",
    badge: "Medicine",
    searchHref: "/scholarships?field=Medicine",
    searchLabel: "View medical scholarships",
    secondaryHref: "/guides/scholarship-application-checklist",
    secondaryLabel: "Open application checklist",
    intentTitle:
      "This page is useful if you are a medical or health sciences student looking for funded study abroad opportunities.",
    intentBullets: [
      "You study MBBS, BDS, pharmacy, nursing, or a related health sciences field.",
      "You want scholarships covering clinical training, research, or postgraduate medicine.",
      "You are preparing a personal statement, academic transcripts, and references.",
      "You want to confirm official eligibility, licensing requirements, and deadlines.",
    ],
    filterSummary: [
      { label: "Field", value: "Medicine / Health Sciences" },
      { label: "Best next step", value: "Confirm degree recognition and field eligibility" },
      { label: "Recommended check", value: "License equivalence, degree recognition, and official portal" },
    ],
    relatedGuides: [
      {
        title: "Scholarship Application Checklist",
        description: "Review documents, deadlines, eligibility, and final submission steps.",
        href: "/guides/scholarship-application-checklist",
      },
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a focused personal statement for medical scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Present your clinical background and academic achievements clearly.",
        href: "/guides/scholarship-cv-format-for-pakistani-students",
      },
    ],
    faq: [
      {
        question: "Are medical scholarships available for MBBS graduates from Pakistan?",
        answer:
          "Some postgraduate medical scholarships and research positions are open to MBBS graduates. Availability varies by country and institution. Always confirm degree recognition requirements.",
      },
      {
        question: "Do medical scholarships require clinical experience?",
        answer:
          "Many postgraduate medical scholarships require clinical or research experience. Check the specific eligibility criteria of each scholarship from the official source.",
      },
      {
        question: "Is PMDC or PMC registration required for medical scholarships?",
        answer:
          "Some countries may require evidence of medical registration in Pakistan. Confirm licensing and degree equivalence requirements with the official scholarship provider or destination country's medical authority.",
      },
    ],
    metaTitle: "Medical Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find medical scholarships for Pakistani students in medicine, MBBS, pharmacy, and health sciences. Check degree recognition, eligibility, documents, and official deadlines.",
  },
  {
    slug: "business-scholarships-for-pakistani-students",
    title: "Business Scholarships for Pakistani Students",
    description:
      "Find business, management, and MBA scholarship opportunities for Pakistani students studying finance, economics, marketing, and related business disciplines abroad.",
    badge: "Business",
    searchHref: "/scholarships?field=Business",
    searchLabel: "View business scholarships",
    secondaryHref: "/guides/how-to-write-sop-for-scholarship",
    secondaryLabel: "Read SOP guide",
    intentTitle:
      "This page is useful if you are a business or management student looking for funded study opportunities abroad.",
    intentBullets: [
      "You study business, management, finance, economics, or a related field.",
      "You want scholarships for MBA, MSc in Management, or business-related programs.",
      "You are preparing a personal statement, GMAT results, and professional references.",
      "You want to confirm official eligibility and deadlines before applying.",
    ],
    filterSummary: [
      { label: "Field", value: "Business / Management" },
      { label: "Best next step", value: "Confirm GMAT/GRE requirement and field eligibility" },
      { label: "Recommended check", value: "Work experience, test scores, and official portal" },
    ],
    relatedGuides: [
      {
        title: "How to Write SOP for Scholarship",
        description: "Prepare a professional personal statement for business scholarship applications.",
        href: "/guides/how-to-write-sop-for-scholarship",
      },
      {
        title: "Scholarship CV Format for Pakistani Students",
        description: "Present your professional and academic background clearly for business programs.",
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
        question: "Do business scholarships require GMAT scores?",
        answer:
          "Some MBA and business master's programs require GMAT or GRE scores. Others have moved to test-optional admissions. Confirm the requirement on the official scholarship or program page.",
      },
      {
        question: "Is work experience required for business scholarships?",
        answer:
          "MBA programs often require 2-5 years of work experience. MSc in Management programs may accept fresh graduates. Always check the official eligibility criteria.",
      },
      {
        question: "Which countries have strong business scholarship programs?",
        answer:
          "UK, Germany, France, USA, Canada, and China offer a range of business scholarships. Chevening, DAAD, and some university scholarships cover business-related fields.",
      },
    ],
    metaTitle: "Business Scholarships for Pakistani Students - Scholars Republic",
    metaDescription:
      "Find business, MBA, and management scholarships for Pakistani students. Check GMAT requirements, work experience rules, official eligibility, and application deadlines.",
  },
];

export const discoveryLandingPageSlugs = discoveryLandingPages.map((page) => page.slug);

export function getDiscoveryLandingPage(slug: string) {
  return discoveryLandingPages.find((page) => page.slug === slug);
}
