import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  PenLine,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "How to Write a Study Plan for Scholarship Applications | Scholars Republic",
  description:
    "Learn how to write a strong study plan for scholarship applications, including structure, examples, research goals, timeline, mistakes to avoid, and document tips.",
};

const studyPlanStructure = [
  {
    title: "1. Academic background",
    body:
      "Briefly introduce your previous degree, field, academic strengths, and the subjects or experiences that prepared you for the proposed study.",
  },
  {
    title: "2. Target program and field",
    body:
      "Explain what degree or program you want to study and why this field is important for your academic and professional development.",
  },
  {
    title: "3. Study objectives",
    body:
      "Describe what you want to learn during the program. Be specific about skills, courses, research areas, or practical training.",
  },
  {
    title: "4. Research or academic plan",
    body:
      "For research-based applications, explain your research interest, possible topic, methods, and expected contribution. For coursework programs, explain your course plan.",
  },
  {
    title: "5. Timeline",
    body:
      "Show how you plan to use each year or semester. A simple timeline makes your study plan more realistic and organized.",
  },
  {
    title: "6. Future goals",
    body:
      "Connect your study plan to your future career, research direction, community impact, or contribution to your home country.",
  },
];

const differences = [
  {
    title: "Study Plan",
    body:
      "Focuses on what you will study, how you will study, your academic plan, timeline, and expected learning outcomes.",
  },
  {
    title: "Statement of Purpose",
    body:
      "Focuses more on your motivation, background, goals, program fit, and why you deserve the scholarship.",
  },
  {
    title: "Research Proposal",
    body:
      "Focuses on a specific research problem, research questions, methodology, literature gap, and expected research contribution.",
  },
];

const timeline = [
  {
    title: "Before starting",
    body:
      "Review the curriculum, identify relevant courses, read about faculty expertise, and define your academic direction.",
  },
  {
    title: "First year or early semesters",
    body:
      "Build foundation through core courses, improve research skills, and understand the academic environment.",
  },
  {
    title: "Middle stage",
    body:
      "Take specialized courses, develop projects, join research activities, and refine your study or research topic.",
  },
  {
    title: "Final stage",
    body:
      "Complete thesis, capstone project, internship, publication, or final research output depending on the program.",
  },
];

const usefulPhrases = [
  "My proposed study plan is designed to strengthen my knowledge in...",
  "During the first stage of my studies, I aim to build a strong foundation in...",
  "In the later stages of the program, I plan to focus on...",
  "This academic plan directly supports my long-term goal of...",
  "The knowledge and skills gained from this program will help me contribute to...",
];

const mistakes = [
  "Writing a study plan like a personal story",
  "Copying the same study plan for every university",
  "Not mentioning courses, research areas, or academic goals",
  "Making unrealistic promises",
  "Writing only about financial need",
  "Ignoring the scholarship or university instructions",
  "Using generic AI text without personal details",
];

const checklist = [
  "Does my study plan match the target degree?",
  "Have I explained my academic background briefly?",
  "Have I mentioned clear study objectives?",
  "Have I connected the program to my future goals?",
  "Have I included a realistic timeline?",
  "Have I avoided unsupported claims?",
  "Have I checked grammar and formatting?",
  "Have I followed the required word limit?",
];

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6"
    >
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}

export default function StudyPlanGuidePage() {
  return (
    <main className="min-h-screen bg-cream/40">
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3 text-ink">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-white">
                <GraduationCap size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-bold">
                  Scholars Republic
                </span>
                <span className="text-xs text-ink/55">
                  Scholarship guides and student support
                </span>
              </span>
            </Link>

            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <Link
                href="/blog"
                className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink"
              >
                Blog
              </Link>
              <Link
                href="/scholarships"
                className="rounded-xl bg-pine px-4 py-2 text-white transition hover:bg-pine/90"
              >
                Search Scholarships
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-11">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
                Scholarship Document Guide
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink md:text-3xl">
                How to Write a Study Plan for Scholarship Applications
              </h1>

              <p className="mt-4 text-sm leading-7 text-ink/70 md:text-base">
                A study plan explains what you want to study, how you will
                organize your learning, and how the program supports your future
                goals. It is especially important for scholarships where the
                committee wants to see academic direction, preparation, and a
                realistic plan.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/scholarships"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  <Search size={16} aria-hidden="true" />
                  Search Scholarships
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
                >
                  <UserRoundCheck size={16} aria-hidden="true" />
                  Complete Profile
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                Quick idea
              </p>
              <h2 className="mt-2 text-base font-bold text-ink">
                A study plan should feel realistic
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Do not write only dreams. Show the committee what you will study,
                why it matters, and how you will use the opportunity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="space-y-7">
          <Section title="What is a study plan?">
            <p>
              A study plan is a short academic document that explains your
              proposed learning path. It shows what you want to study, why you
              chose that area, what skills or knowledge you want to gain, and how
              your study will support your future goals.
            </p>
            <p className="mt-4">
              For scholarship applications, a good study plan helps the
              committee understand that you are not applying randomly. It proves
              that you have thought about your academic direction and can use the
              scholarship opportunity responsibly.
            </p>
          </Section>

          <Section title="Study plan vs SOP vs research proposal">
            <div className="grid gap-4 md:grid-cols-3">
              {differences.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-4"
                >
                  <h3 className="text-sm font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Best structure for a scholarship study plan">
            <div className="space-y-3">
              {studyPlanStructure.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-4"
                >
                  <h3 className="text-sm font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-ink/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Simple study plan timeline">
            <div className="grid gap-4 md:grid-cols-2">
              {timeline.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-4"
                >
                  <CalendarCheck
                    size={22}
                    className="text-pine"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-sm font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Useful phrases for a study plan">
            <p>
              These phrases can help you start, but do not copy them blindly.
              Adapt them to your own field, program, and goals.
            </p>

            <div className="mt-4 grid gap-3">
              {usefulPhrases.map((phrase) => (
                <div
                  key={phrase}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <PenLine
                    size={17}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <span>{phrase}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Sample study plan paragraph">
            <blockquote className="rounded-xl border-l-4 border-pine bg-pine/5 p-5 text-sm leading-8 text-ink/75">
              My proposed study plan is focused on strengthening my knowledge in
              data-driven education technologies and applying this knowledge to
              improve access to quality learning resources. During the first
              stage of the program, I plan to build a strong foundation in
              machine learning, data analysis, and educational technology. In the
              later stages, I aim to focus on practical projects that explore how
              artificial intelligence can support personalized learning and
              student performance monitoring. This study plan directly supports
              my long-term goal of developing technology-based solutions that
              can improve educational services in Pakistan.
            </blockquote>
          </Section>

          <Section id="checklist" title="Study plan checklist before submission">
            <div className="grid gap-3 md:grid-cols-2">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl border border-ink/10 bg-cream/40 px-4 py-3"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-pine"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Common mistakes to avoid">
            <div className="grid gap-3 md:grid-cols-2">
              {mistakes.map((mistake) => (
                <div
                  key={mistake}
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                >
                  {mistake}
                </div>
              ))}
            </div>
          </Section>

          <section className="rounded-2xl border border-pine/20 bg-gradient-to-r from-pine/10 via-white to-saffron/10 p-5 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Scholars Republic tools
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Prepare your documents with a clearer plan
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use Scholars Republic to search scholarships, complete your
              profile, save opportunities, track applications, and prepare your
              SOP, study plan, and scholarship CV step by step.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/scholarships"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                <Search size={16} aria-hidden="true" />
                Search Scholarships
              </Link>
              <Link
                href="/dashboard/ai/sop"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                <Sparkles size={16} aria-hidden="true" />
                SOP Generator
              </Link>
            </div>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">On this page</h2>
            <nav className="mt-4 grid gap-3 text-sm text-ink/70">
              <a href="#checklist" className="hover:text-pine">
                Study plan checklist
              </a>
              <Link href="/scholarships" className="hover:text-pine">
                Search scholarships
              </Link>
              <Link href="/dashboard/profile" className="hover:text-pine">
                Complete profile
              </Link>
              <Link href="/dashboard/saved" className="hover:text-pine">
                Saved opportunities
              </Link>
              <Link href="/dashboard/applications" className="hover:text-pine">
                Application tracker
              </Link>
            </nav>
          </div>

          <div className="rounded-2xl border border-pine/20 bg-pine/5 p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Recommended first step
            </p>
            <h2 className="mt-2 text-base font-bold text-ink">
              Find the scholarship first
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Your study plan should match the scholarship, degree, university,
              and field. Start by shortlisting opportunities.
            </p>
            <Link
              href="/scholarships"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              Open Scholarship Search
            </Link>
          </div>

          <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">
              Need help with your SOP?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Your SOP and study plan should support each other. Start with a
              clear SOP draft, then turn it into a study-focused plan.
            </p>
            <div className="mt-4 grid gap-2">
              <Link
                href="/guides/how-to-write-sop-for-scholarship"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                <BookOpen size={16} aria-hidden="true" />
                Read SOP Guide
              </Link>
              <Link
                href="/dashboard/ai/sop"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
              >
                <Sparkles size={16} aria-hidden="true" />
                Open SOP Generator
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
