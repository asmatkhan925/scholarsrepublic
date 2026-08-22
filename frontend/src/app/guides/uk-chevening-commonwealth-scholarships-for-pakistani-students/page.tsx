import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { GuideArticleJsonLd } from "@/components/seo/GuideArticleJsonLd";

export const metadata = {
  title: "UK Scholarships for Pakistani Students: Chevening & Commonwealth | Scholars Republic",
  description:
    "A practical guide to funded UK study for Pakistani students — Chevening, Commonwealth (via HEC), GREAT and university awards, English rules, documents, timeline, and the mistakes that cost applicants.",
};

const ch4Essays = [
  {
    title: "Leadership and influence",
    body: "Assessors want something you personally changed, launched, improved, or resolved. “I was president of the society” is weak on its own. Name the problem that existed, what you decided to do, who you influenced, and the result that followed.",
  },
  {
    title: "Networking and relationship building",
    body: "This is about how you build professional relationships and then use them constructively — not how many contacts or conferences you can list. Show one relationship you built and what came out of it.",
  },
  {
    title: "Studying in the UK / course choice",
    body: "Show you researched the programme beyond its ranking. Point to specific modules, skills, or faculty expertise, and connect them directly to the problem you plan to work on back in Pakistan.",
  },
  {
    title: "Career plan",
    body: "Give realistic short-, medium-, and long-term goals. “I want to become a leader and serve Pakistan” says almost nothing. Name the sector, the specific problem, the likely role and organisations, and the path from this master’s to that outcome.",
  },
];

const documents = [
  "Valid passport",
  "Undergraduate degree certificate and complete transcripts",
  "CV / detailed employment history (for the Chevening work-hours record)",
  "Referee details (usually two references)",
  "Scholarship essays / personal statement",
  "UK university admission documents / offer letter(s)",
  "For HEC-routed Commonwealth applications: your HEC profile and HEC-attested qualifications where the HEC process requires them",
];

const timeline = [
  {
    when: "May – June",
    body: "Audit your Chevening work hours under the current post-undergraduate rule. Decide your career theme and shortlist UK programmes that fit it. Do not leave this to October.",
  },
  {
    when: "June – July",
    body: "Research specific modules and universities, line up referees, update your CV, and gather academic documents. If your universities are likely to need IELTS, take it now so there is time for a retake.",
  },
  {
    when: "August – September",
    body: "Draft the scholarship essays around concrete examples, begin or submit university applications, and confirm the current scholarship deadline. Commonwealth applicants should track HEC separately, as its deadline and requirements can differ from the CSC timetable.",
  },
  {
    when: "Final weeks",
    body: "Use these for editing and verification — not for deciding what you want to study. If the current Chevening deadline falls in October rather than November, move this whole schedule earlier.",
  },
];

const mistakes = [
  "Counting ineligible work experience — check the 2,800 hours under the current post-undergraduate rule before investing weeks in the application.",
  "Writing essays that are disguised CVs — job titles and certificates are not leadership; decisions, actions, and outcomes are.",
  "Choosing three unrelated Chevening courses — your course choice, work history, and intended impact in Pakistan should form one coherent story.",
  "Using generic problems — “Pakistan needs better education” is weak. Identify the specific gap, population, institution, or policy you intend to address.",
  "Submitting only the CSC form for Commonwealth — Pakistani applicants must follow the HEC / nominating-agency route when the national call requires it.",
  "Leaving IELTS until after the result — even where the scholarship itself does not require it, your university may need it before issuing an unconditional offer.",
  "Following last year’s screenshots — Chevening deadlines, HEC criteria, and university terms change every cycle. Verify on the current official pages.",
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function UKScholarshipsGuidePage() {
  return (
    <>
      <GuideArticleJsonLd
        title="UK Scholarships for Pakistani Students: Chevening and Commonwealth"
        description={metadata.description}
        path="/guides/uk-chevening-commonwealth-scholarships-for-pakistani-students"
        datePublished="2026-08-22"
        dateModified="2026-08-22"
      />
      <SiteHeader />

      <main className="min-h-screen bg-cream/40">
        <section className="border-b border-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                UK Country Guide
              </p>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                UK Scholarships for Pakistani Students: Chevening and Commonwealth
              </h1>
              <p className="mt-4 text-sm leading-7 text-ink/70">
                The UK is expensive if you self-fund, but it is also one of the countries with
                established, fully funded routes built for international students from countries like
                Pakistan. This guide covers the three that matter most — Chevening, Commonwealth
                (through HEC), and GREAT or university awards — with the eligibility details and
                local pitfalls that actually decide applications.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="space-y-7">
            <Section title="Three routes, not one">
              <p>
                These options are not interchangeable, and treating them as one pool is the first
                mistake. Chevening is primarily a leadership scholarship for a one-year taught
                master’s. Commonwealth funding is tied closely to development impact and covers both
                master’s and PhD study. GREAT and university awards are usually linked to an
                admission offer and are often partial rather than full.
              </p>
              <p className="mt-4">
                Pick the route that fits your profile and stage, then prepare for its specific
                selection logic. What wins a Chevening interview is not what wins a Commonwealth
                nomination.
              </p>
            </Section>

            <Section title="Chevening: the UK government’s leadership scholarship">
              <p>
                Chevening is the UK government’s international scholarship programme, funded by the
                Foreign, Commonwealth &amp; Development Office (FCDO) and partner organisations. The
                standard award funds a <strong>one-year taught master’s</strong> only — not
                undergraduate degrees, and not PhDs.
              </p>
              <p className="mt-4">
                A full Chevening Scholarship normally covers tuition, an economy return flight
                between Pakistan and the UK, a monthly living stipend, arrival and departure
                allowances, the cost of one UK visa application, and some additional travel-related
                support. Stipend rates are reviewed periodically, so rely on the current Chevening
                terms rather than figures circulating in Facebook groups or old scholarship posts.
              </p>
            </Section>

            <Section title="The 2,800-hour work experience rule">
              <p>
                This is one of the most important eligibility checks for Pakistani applicants, and
                one of the most commonly misread.
              </p>
              <p className="mt-4">
                Chevening currently requires at least <strong>2,800 hours</strong> of work
                experience — roughly two years of full-time work, though the hours can be built up
                from different kinds of employment. Eligible experience can include full-time and
                part-time jobs, voluntary work, and paid or unpaid internships; the application
                calculates your total from the weeks and weekly hours you enter for each position.
              </p>
              <p className="mt-4">
                The detail that trips people up is the phrase <em>after your undergraduate degree</em>.
                Older advice online may say experience gained before or during university counted.
                Current guidance treats the required hours as post-undergraduate, so a student
                internship completed before graduation should not be used to reach the total. And you
                must already have the hours when you submit — promising to reach 2,800 before
                travelling to the UK is not enough. Confirm the current rule on{" "}
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://www.chevening.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  chevening.org
                </a>{" "}
                before you rely on your count.
              </p>
            </Section>

            <Section title="Degree, course choices, and the return-home rule">
              <p>
                You need an undergraduate degree strong enough to get you into a UK master’s — but
                meeting Chevening’s eligibility does not guarantee a university will accept your
                Pakistani degree, because each university sets its own academic bar.
              </p>
              <p className="mt-4">
                You must select <strong>three eligible UK master’s courses</strong> in the
                application, and eventually hold an unconditional offer from at least one of them by
                Chevening’s offer deadline. The strongest applications choose three courses that form
                a coherent story, not three unrelated subjects picked because admission looks easier.
              </p>
              <p className="mt-4">
                Accepting Chevening also means agreeing to return to Pakistan for at least{" "}
                <strong>two years</strong> after the scholarship ends. If your real plan is immediate
                migration, understand this before applying.
              </p>
            </Section>

            <Section title="The application cycle">
              <p>
                Do not memorise a fixed November deadline — Chevening dates move. The general pattern
                is an opening in late summer, assessment over the following months, interview
                shortlisting early in the new year, interviews around March–April, and results around
                June.
              </p>
              <p className="mt-4">
                Recent cycles have opened and closed <strong>earlier</strong> than the “early
                November” deadline many applicants remember, with some closing in October. Always
                check the current official Chevening timeline before you plan around any remembered
                date.
              </p>
            </Section>

            <Section title="The four Chevening essays: what assessors want">
              <div className="space-y-4">
                {ch4Essays.map((item) => (
                  <div key={item.title} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-ink/75">{item.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                Chevening’s own guidance stresses concrete examples, individual contribution,
                realistic career goals, and a clear line from the course to your intended impact.
              </p>
            </Section>

            <Section title="Commonwealth Scholarships: a different route through HEC">
              <p>
                Commonwealth Scholarships are also UK-government funded through the FCDO, but the
                selection logic differs. The Commonwealth Scholarship Commission in the UK (CSC)
                puts far more weight on how your proposed study will contribute to{" "}
                <strong>sustainable development</strong> in your home country.
              </p>
              <p className="mt-4">
                For Pakistan the two main routes are the Commonwealth Master’s Scholarship (usually a
                one-year taught master’s) and the Commonwealth PhD Scholarship (doctoral research
                with clear developmental relevance).
              </p>
              <p className="mt-4">
                The part Pakistani applicants regularly misunderstand is <strong>nomination</strong>.
                You do not simply submit a CSC form and consider it done. These scholarships use
                nominating agencies, and for Pakistan the Higher Education Commission (HEC) is central
                to the national nomination process. In recent HEC Commonwealth calls, applicants had
                to complete <em>both</em> the CSC application and a separate HEC application, and HEC
                added its own conditions — including, in a past cycle, a minimum HAT (HEC Aptitude
                Test) score. Those HEC conditions change year to year, so follow the current{" "}
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://www.hec.gov.pk/"
                  target="_blank"
                  rel="noreferrer"
                >
                  HEC
                </a>{" "}
                advertisement rather than copying a previous year’s deadline or test rule. For the
                CSC side, confirm details on{" "}
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://cscuk.fcdo.gov.uk/"
                  target="_blank"
                  rel="noreferrer"
                >
                  cscuk.fcdo.gov.uk
                </a>
                .
              </p>
              <p className="mt-4">
                For Commonwealth, development impact is not a paragraph tacked on at the end. You are
                expected to explain the development problem, how the degree relates to it, how you
                will use the skills after returning, who benefits, and how the outcomes could be
                measured.
              </p>
            </Section>

            <Section title="GREAT and university-specific funding">
              <p>
                Search the funding pages of every UK university you apply to. The British Council’s
                GREAT Scholarships programme includes Pakistan, typically as a tuition-fee award for
                eligible postgraduate courses (commonly around £10,000, though amounts and
                participating universities change each year — confirm per university).
              </p>
              <p className="mt-4">
                Universities also run their own international, merit, departmental, and
                country-specific awards. Apply for these in parallel with admission wherever allowed.
                Do not assume two scholarships can be financially “stacked,” though — Chevening,
                Commonwealth, and university awards may have rules against duplicate funding of the
                same costs.
              </p>
            </Section>

            <Section title="English requirements: IELTS, UKVI, and Chevening">
              <p>
                A common target for UK taught master’s programmes is around IELTS Academic 6.5
                overall, often with minimum component scores — but that is a university rule, not a
                national scholarship rule. Some programmes want 7.0 or higher; others accept
                alternative evidence.
              </p>
              <p className="mt-4">
                Chevening removed its own English-language requirement in 2020. What matters is
                meeting your chosen university’s English requirement and securing the unconditional
                offer. Do not assume everyone needs “IELTS UKVI” either — at degree level an eligible
                UK provider may assess English itself for Student visa purposes. Follow the exact
                instructions the university and your CAS state, not WhatsApp advice.
              </p>
            </Section>

            <Section title="Documents to prepare early">
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                Note that HEC attestation is a requirement of the HEC-routed process, not of Chevening
                itself — Chevening’s interview-stage documents centre on your degree certificate and
                references. Keep employment certificates for your own accurate record even though
                Chevening does not normally ask you to upload proof of every job at the initial stage.
              </p>
            </Section>

            <Section title="A realistic preparation timeline">
              <div className="space-y-4">
                {timeline.map((step) => (
                  <div key={step.when} className="rounded-xl border border-ink/10 bg-cream/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                      {step.when}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-ink/75">{step.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="uk-mistakes" title="Common mistakes to avoid">
              <ul className="space-y-3">
                {mistakes.map((m) => (
                  <li key={m} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Is it realistically achievable?">
              <p>
                Yes — but neither Chevening nor Commonwealth is a scholarship where polished English
                covers for a weak underlying case. A competitive Pakistani applicant usually has a
                clear record of work or service, evidence of results, a defensible reason for
                studying a particular subject in the UK, and a credible plan for using that education
                after returning home.
              </p>
              <p className="mt-4">
                Start early enough to build that argument carefully, verify the rules from the
                official source for the current cycle, and treat university admission and scholarship
                preparation as two connected processes — not two last-minute forms.
              </p>
            </Section>

            <Section title="Official sources">
              <ul className="space-y-3">
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://www.chevening.org/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chevening Scholarships (chevening.org)
                  </a>
                </li>
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://cscuk.fcdo.gov.uk/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Commonwealth Scholarship Commission in the UK (cscuk.fcdo.gov.uk)
                  </a>
                </li>
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://www.hec.gov.pk/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Higher Education Commission Pakistan (hec.gov.pk)
                  </a>
                </li>
                <li>
                  <a
                    className="font-semibold text-pine hover:underline"
                    href="https://study-uk.britishcouncil.org/scholarships-funding/great-scholarships"
                    target="_blank"
                    rel="noreferrer"
                  >
                    British Council GREAT Scholarships
                  </a>
                </li>
              </ul>
            </Section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Find UK scholarships
              </p>
              <h2 className="mt-2 text-base font-bold text-ink">Browse open opportunities</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Search verified scholarships and filter by country, funding, and deadline on Scholars
                Republic.
              </p>
              <Link
                href="/scholarships"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Search scholarships
              </Link>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Related guides</h2>
              <nav className="mt-4 grid gap-3 text-sm text-ink/70">
                <Link href="/guides/how-to-write-sop-for-scholarship" className="hover:text-pine">
                  How to write an SOP
                </Link>
                <Link
                  href="/guides/scholarship-cv-format-for-pakistani-students"
                  className="hover:text-pine"
                >
                  Scholarship CV format
                </Link>
                <Link
                  href="/guides/scholarship-application-checklist"
                  className="hover:text-pine"
                >
                  Application checklist
                </Link>
                <a href="#uk-mistakes" className="hover:text-pine">
                  Common mistakes
                </a>
                <Link href="/guides" className="hover:text-pine">
                  All guides
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
