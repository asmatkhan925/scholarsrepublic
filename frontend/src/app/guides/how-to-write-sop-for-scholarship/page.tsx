import Link from "next/link";

export const metadata = {
  title: "How to Write the Best SOP for Scholarship Applications | Scholars Republic",
  description:
    "Learn how to write a powerful Statement of Purpose for scholarships. Includes SOP structure, examples, writing tips, common mistakes, and a checklist.",
};

const sopStructure = [
  {
    title: "1. Strong opening and academic purpose",
    body:
      "Start with your field, motivation, and main goal. Avoid generic childhood stories unless they are specific and clearly connected to your academic direction.",
  },
  {
    title: "2. Academic background",
    body:
      "Explain your degree, important subjects, academic strengths, and how your studies prepared you for the scholarship or program.",
  },
  {
    title: "3. Research, professional, or practical experience",
    body:
      "Discuss relevant projects, internships, jobs, research, volunteering, competitions, or leadership experiences. Explain what you learned and how it shaped your goals.",
  },
  {
    title: "4. Why this program, university, or country",
    body:
      "Show that you researched the program. Mention specific courses, labs, professors, research areas, practical training, or country-specific academic advantages.",
  },
  {
    title: "5. Why this scholarship",
    body:
      "Explain how the scholarship supports your academic goals and future contribution. Do not make the SOP only about financial need.",
  },
  {
    title: "6. Future goals and impact",
    body:
      "Describe your short-term and long-term goals. Explain who will benefit from your education and how you will create meaningful impact.",
  },
  {
    title: "7. Strong conclusion",
    body:
      "End with confidence, purpose, and responsibility. Show that you are ready to benefit from the scholarship and contribute after graduation.",
  },
];

const committeeCriteria = [
  "Clear academic direction",
  "Evidence of preparation",
  "Strong program fit",
  "Realistic future goals",
  "Clear communication",
];

const mistakes = [
  "Starting with a generic childhood story",
  "Repeating the CV instead of explaining meaning and purpose",
  "Praising the university with empty phrases",
  "Writing only emotional or poverty-based stories",
  "Using robotic AI-generated language without personality",
  "Having no clear future plan",
  "Ignoring the official word limit or scholarship instructions",
];

const actionWords = [
  "developed",
  "researched",
  "analyzed",
  "designed",
  "implemented",
  "contributed",
  "investigated",
  "collaborated",
  "improved",
  "led",
  "mentored",
  "evaluated",
  "strengthened",
  "applied",
  "proposed",
];

const checklist = [
  "Have I answered the exact scholarship prompt?",
  "Is my opening specific and memorable?",
  "Have I explained why I chose this field?",
  "Have I shown academic preparation?",
  "Have I included relevant experience?",
  "Have I explained why this university or program fits me?",
  "Have I explained why this scholarship fits my goals?",
  "Are my future goals clear and realistic?",
  "Have I shown potential impact?",
  "Have I avoided copying my CV?",
  "Have I removed generic praise?",
  "Have I checked grammar and spelling?",
  "Have I followed the word limit?",
  "Have I asked someone experienced to review it?",
];

const weakStrongExamples = [
  {
    weak: "I am passionate about education.",
    strong:
      "My interest in education policy developed while volunteering with students who lacked access to trained science teachers.",
  },
  {
    weak: "I want to study abroad for better opportunities.",
    strong:
      "I want to pursue this program because it offers advanced training in public health data analysis, which aligns with my goal of improving maternal health monitoring systems.",
  },
  {
    weak: "Your university is famous.",
    strong:
      "The program’s course on sustainable energy systems directly supports my goal of designing affordable solar solutions for off-grid communities.",
  },
  {
    weak: "I need financial support.",
    strong:
      "This scholarship will allow me to access specialized training and apply it to community-focused development work after graduation.",
  },
  {
    weak: "I have leadership skills.",
    strong:
      "As president of my student society, I led a team of 18 volunteers to organize academic mentoring sessions for first-year students.",
  },
];

function CTABox() {
  return (
    <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-6 shadow-soft md:p-8">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Scholars Republic AI Tool
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Need help turning your ideas into a strong SOP?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/70">
            After reading this guide, use our AI SOP Generator to create a first
            draft from your profile, scholarship target, field of study, future
            goals, and existing draft. Always review and personalize the result
            before submitting.
          </p>
        </div>

        <Link
          href="/dashboard/ai/sop"
          className="inline-flex items-center justify-center rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
        >
          Open SOP Generator
        </Link>
      </div>
    </section>
  );
}

export default function SOPGuidePage() {
  return (
    <main className="bg-cream/40">
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <div className="max-w-4xl">
            <Link
              href="/blog"
              className="text-sm font-semibold text-pine hover:underline"
            >
              ← Back to Blog
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-saffron">
              Scholarship Writing Guide
            </p>

            <h1 className="mt-3 text-4xl font-bold leading-tight text-ink md:text-5xl">
              How to Write the Best SOP for Scholarship Applications
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-ink/70 md:text-lg">
              A complete guide for writing a powerful Statement of Purpose,
              including structure, examples, common mistakes, and a checklist for
              fully funded scholarship applications.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/ai/sop"
                className="inline-flex items-center justify-center rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                Use AI SOP Generator
              </Link>

              <a
                href="#sop-checklist"
                className="inline-flex items-center justify-center rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                Jump to SOP Checklist
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="space-y-10">
          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Why your SOP matters so much
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-8 text-ink/75">
              <p>
                A Statement of Purpose, often called an SOP, is one of the most
                important documents in a scholarship application. Your
                transcripts show your grades. Your CV shows your activities. Your
                recommendation letters show what others think about you. But your
                SOP shows why you are applying, what you want to achieve, why you
                deserve funding, and how the scholarship will help you create
                impact.
              </p>
              <p>
                For scholarship applications, the SOP becomes even more
                important because the committee is not only asking, “Can this
                student study here?” They are also asking, “Should we invest
                money in this person?” A strong scholarship SOP answers that
                question clearly.
              </p>
            </div>
          </section>

          <CTABox />

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              What is an SOP for scholarship?
            </h2>
            <p className="mt-4 text-sm leading-8 text-ink/75">
              An SOP for scholarship is a focused essay that explains who you
              are academically and professionally, what field you want to study,
              why you chose that field, why you chose this university or
              scholarship, what experience has prepared you, what your future
              goals are, and how you will use the scholarship to create
              academic, professional, or social impact.
            </p>
            <p className="mt-4 text-sm leading-8 text-ink/75">
              It is different from a normal admission SOP because a scholarship
              SOP must also show purpose, financial justification, leadership
              potential, and future contribution.
            </p>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              SOP vs motivation letter vs personal statement
            </h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 bg-cream/60 text-ink">
                    <th className="px-4 py-3 font-semibold">Document</th>
                    <th className="px-4 py-3 font-semibold">Main focus</th>
                  </tr>
                </thead>
                <tbody className="text-ink/75">
                  <tr className="border-b border-ink/10">
                    <td className="px-4 py-3 font-semibold text-ink">
                      Statement of Purpose
                    </td>
                    <td className="px-4 py-3">
                      Academic goals, research interests, program fit, career plan
                    </td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="px-4 py-3 font-semibold text-ink">
                      Motivation Letter
                    </td>
                    <td className="px-4 py-3">
                      Why you are motivated, why this scholarship, why this
                      country or program
                    </td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="px-4 py-3 font-semibold text-ink">
                      Personal Statement
                    </td>
                    <td className="px-4 py-3">
                      Personal background, challenges, values, life story
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-ink">
                      Statement of Grant Purpose
                    </td>
                    <td className="px-4 py-3">
                      Project plan, feasibility, impact, host-country relevance
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              What scholarship committees really look for
            </h2>
            <p className="mt-4 text-sm leading-8 text-ink/75">
              A scholarship committee usually reads hundreds or thousands of
              applications. They are not looking for fancy English. They are
              looking for clarity, evidence, direction, and fit.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {committeeCriteria.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-pine/15 bg-pine/5 p-4 text-sm font-semibold text-ink"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              The best SOP structure for scholarship applications
            </h2>
            <div className="mt-6 space-y-4">
              {sopStructure.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-5"
                >
                  <h3 className="font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Best SOP writing formula: Past, Present, Future, Fit, Impact
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              {["Past", "Present", "Future", "Fit", "Impact"].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-saffron/30 bg-saffron/10 p-4 text-center font-semibold text-ink"
                >
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-8 text-ink/75">
              If your SOP covers these five areas with evidence, it will already
              be stronger than most generic applications.
            </p>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Common SOP mistakes to avoid
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-ink/75">
              {mistakes.map((mistake) => (
                <li
                  key={mistake}
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                >
                  {mistake}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Strong words to use in an SOP
            </h2>
            <p className="mt-4 text-sm leading-8 text-ink/75">
              Use words that show action, clarity, and purpose.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {actionWords.map((word) => (
                <span
                  key={word}
                  className="rounded-full border border-pine/15 bg-pine/5 px-3 py-1 text-sm font-medium text-pine"
                >
                  {word}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Weak vs strong SOP sentences
            </h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 bg-cream/60 text-ink">
                    <th className="px-4 py-3 font-semibold">Weak sentence</th>
                    <th className="px-4 py-3 font-semibold">Strong sentence</th>
                  </tr>
                </thead>
                <tbody>
                  {weakStrongExamples.map((item) => (
                    <tr key={item.weak} className="border-b border-ink/10">
                      <td className="px-4 py-3 text-red-700">{item.weak}</td>
                      <td className="px-4 py-3 text-ink/75">{item.strong}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Sample SOP paragraph for a scholarship
            </h2>
            <blockquote className="mt-5 rounded-xl border-l-4 border-pine bg-pine/5 p-5 text-sm leading-8 text-ink/75">
              My interest in public health developed during my volunteer work at
              a rural health camp in Sindh, where I observed that many women
              delayed treatment because they lacked access to reliable health
              information and affordable clinical services. This experience
              helped me understand that healthcare challenges are not only
              medical but also social, economic, and administrative. During my
              undergraduate studies in Biotechnology, I built a strong foundation
              in disease mechanisms, epidemiology, and laboratory methods.
              However, I now want to expand my knowledge beyond the laboratory
              and study how public health systems can prevent disease, improve
              awareness, and support vulnerable communities.
            </blockquote>
          </section>

          <section
            id="sop-checklist"
            className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8"
          >
            <h2 className="text-2xl font-bold text-ink">
              SOP checklist before submission
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-ink/10 bg-cream/40 px-4 py-3 text-sm leading-6 text-ink/75"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Recommended SOP length
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-ink/75">
              <li>
                <strong>Undergraduate scholarships:</strong> 500–800 words.
              </li>
              <li>
                <strong>Master’s scholarships:</strong> 800–1,000 words.
              </li>
              <li>
                <strong>PhD scholarships:</strong> 1,000–1,200 words.
              </li>
              <li>
                <strong>If no requirement is given:</strong> one to two pages is
                usually reasonable.
              </li>
            </ul>
          </section>

          <CTABox />

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">
              Final tips for writing a winning scholarship SOP
            </h2>
            <p className="mt-4 text-sm leading-8 text-ink/75">
              A winning SOP is not the one with the most difficult English. It is
              the one with the clearest purpose. The best SOPs are specific,
              honest, focused, evidence-based, personal, realistic, connected to
              the scholarship’s mission, and clear about future impact.
            </p>
            <p className="mt-4 text-sm leading-8 text-ink/75">
              Your SOP should leave the committee thinking: this applicant knows
              who they are, knows what they want to study, understands why this
              scholarship matters, and has a realistic plan to use this
              opportunity for meaningful impact.
            </p>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-bold text-ink">Further reading</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
              <li>
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://gradschool.cornell.edu/admissions/application-steps/statements-of-purpose/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cornell Graduate School: Academic Statement of Purpose
                </a>
              </li>
              <li>
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://owl.purdue.edu/owl/general_writing/graduate_school_applications/graduate_school_applications_statements_of_purpose/statements_of_purpose_drafting_your_statement.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Purdue OWL: Drafting Your Statement of Purpose
                </a>
              </li>
              <li>
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://gradschool.duke.edu/admissions/application-instructions/statement-purpose/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Duke Graduate School: Statement of Purpose
                </a>
              </li>
              <li>
                <a
                  className="font-semibold text-pine hover:underline"
                  href="https://graduate.universityofcalifornia.edu/applying/statement-of-purpose.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  University of California: Statement of Purpose
                </a>
              </li>
            </ul>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold text-ink">In this guide</h2>
            <nav className="mt-4 grid gap-3 text-sm text-ink/70">
              <a href="#sop-checklist" className="hover:text-pine">
                SOP checklist
              </a>
              <Link href="/dashboard/ai/sop" className="hover:text-pine">
                AI SOP Generator
              </Link>
              <Link href="/scholarships" className="hover:text-pine">
                Find scholarships
              </Link>
              <Link href="/dashboard/profile" className="hover:text-pine">
                Complete your profile
              </Link>
            </nav>
          </div>

          <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
            <h2 className="text-lg font-bold text-ink">
              Generate your SOP draft
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use your Scholars Republic profile and study goals to generate a
              structured SOP draft.
            </p>
            <Link
              href="/dashboard/ai/sop"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              Try SOP Generator
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
