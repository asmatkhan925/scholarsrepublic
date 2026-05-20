"use client";

import { useMemo, useState } from "react";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  GraduationCap,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui";

type WorkbenchAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  primary?: boolean;
};

type WorkflowStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const workflowSteps: WorkflowStep[] = [
  {
    title: "Research",
    description: "Find the official scholarship page, deadline, eligibility, funding, and application method.",
    icon: Search,
  },
  {
    title: "Extract",
    description: "Use GPT to convert the official source into structured scholarship fields.",
    icon: Sparkles,
  },
  {
    title: "Review draft",
    description: "Check warnings, missing fields, official source, and whether claims are accurate.",
    icon: FileSearch,
  },
  {
    title: "Publish",
    description: "Import as draft, edit final details, then publish only when the content is reliable.",
    icon: GraduationCap,
  },
  {
    title: "Verify",
    description: "Mark verified only after checking the official page and deadline again.",
    icon: ShieldCheck,
  },
];

const primaryActions: WorkbenchAction[] = [
  {
    title: "Research new scholarship",
    description: "Start here when you find a new official scholarship page. Copy source text and use the GPT prompt below.",
    href: "#research-workflow",
    icon: Search,
    badge: "Start",
    primary: true,
  },
  {
    title: "Review imported drafts",
    description: "Validate AI or imported draft data before turning it into a real scholarship record.",
    href: "/dashboard/admin/scholarships/drafts",
    icon: FileText,
    badge: "Draft queue",
    primary: true,
  },
  {
    title: "Manage scholarships",
    description: "Edit draft, published, archived, featured, and verified scholarship opportunities.",
    href: "/dashboard/admin/scholarships",
    icon: GraduationCap,
    badge: "Main",
    primary: true,
  },
];

const secondaryActions: WorkbenchAction[] = [
  {
    title: "Create draft manually",
    description: "Use the custom importer when GPT extraction is ready to become a reviewable draft.",
    href: "/dashboard/admin/scholarships/import",
    icon: ClipboardCheck,
  },
  {
    title: "Add imported draft",
    description: "Paste structured JSON into an OpportunityDraft, then validate and import it.",
    href: "/admin/opportunities/opportunitydraft/add/",
    icon: Database,
  },
  {
    title: "Manage pathways",
    description: "Organize country hubs, scholarship programs, application tracks, and guide groupings.",
    href: "/admin/opportunities/opportunitypathway/",
    icon: BookOpenCheck,
  },
  {
    title: "Moderate comments",
    description: "Review and remove inappropriate scholarship comments or replies.",
    href: "/dashboard/admin/comments",
    icon: MessageSquare,
  },
  {
    title: "Student users",
    description: "Review accounts, roles, staff access, and account status.",
    href: "/admin/users/user/",
    icon: Users,
  },
  {
    title: "Student profiles",
    description: "Inspect profile data used for recommendations and match scoring.",
    href: "/admin/profiles/studentprofile/",
    icon: ShieldCheck,
  },
];

function ActionCard({ item }: { item: WorkbenchAction }) {
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      className={`group rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#181b1d] dark:hover:bg-white/5 ${
        item.primary
          ? "border-pine/15 bg-mint/30 hover:border-pine/30 hover:bg-mint/45"
          : "border-pine/10 bg-white hover:border-pine/25 hover:bg-mint/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
          <Icon size={17} aria-hidden="true" />
        </span>
        {item.badge ? <Badge tone="saffron">{item.badge}</Badge> : null}
      </div>

      <h2 className="mt-3 text-base font-bold leading-snug text-ink group-hover:text-pine dark:text-white">
        {item.title}
      </h2>

      <p className="mt-1 line-clamp-3 text-sm leading-5 text-ink/60 dark:text-white/58">
        {item.description}
      </p>

      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-pine">
        Open
        {item.href.startsWith("#") ? (
          <ArrowRight size={13} aria-hidden="true" />
        ) : (
          <ExternalLink size={13} aria-hidden="true" />
        )}
      </span>
    </a>
  );
}

function WorkflowStepCard({ step, index }: { step: WorkflowStep; index: number }) {
  const Icon = step.icon;

  return (
    <div className="rounded-2xl border border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
          <Icon size={17} aria-hidden="true" />
        </span>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine">
            Step {index + 1}
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-ink dark:text-white">{step.title}</h3>
          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/55">
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const gptPrompt = useMemo(
    () => `You are helping me prepare a scholarship listing for Scholars Republic.

Use only the official source text I provide. Do not invent deadlines, benefits, eligibility, countries, universities, IELTS rules, application fees, documents, or funding details.

Return clean structured JSON with this shape:
{
  "title": "",
  "provider_name": "",
  "university_name": "",
  "country": "",
  "official_link": "",
  "source_url": "",
  "source_name": "",
  "short_description": "",
  "description": "",
  "benefits": "",
  "eligibility": "",
  "how_to_apply": "",
  "deadline": "",
  "is_rolling_deadline": false,
  "degree_levels": [],
  "fields_of_study": [],
  "eligible_countries": [],
  "funding_type": "",
  "funding_amount": null,
  "funding_currency": "",
  "stipend_summary": "",
  "application_fee_required": false,
  "ielts_required": false,
  "toefl_required": false,
  "duolingo_required": false,
  "hsk_required": false,
  "english_proficiency_certificate_accepted": false,
  "required_documents": [],
  "tags": [],
  "warnings": [],
  "missing_information": []
}

Rules:
- If a fact is not present in the official source, leave it blank or null.
- Put uncertain items in warnings.
- Put missing important facts in missing_information.
- Keep wording student-friendly and accurate.
- Do not use markdown.

Official source URL:
PASTE_URL_HERE

Official source text:
PASTE_TEXT_HERE`,
    [],
  );

  async function copyPrompt() {
    await navigator.clipboard.writeText(gptPrompt);
    setCopiedPrompt(true);

    window.setTimeout(() => {
      setCopiedPrompt(false);
    }, 1800);
  }

  return (
    <DashboardShell
      mode="admin"
      title="Admin Dashboard"
      description="Scholarship research, AI extraction, draft review, publishing, and verification workflow."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="px-4 py-4 md:px-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                <ShieldCheck size={14} aria-hidden="true" />
                Scholarship Admin Workbench
              </div>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Welcome, {user?.full_name ?? "Admin"}.
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Research scholarships, structure them with GPT, review drafts, publish, and verify.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="#research-workflow"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
                >
                  Start research workflow
                  <ArrowRight size={15} aria-hidden="true" />
                </a>

                <a
                  href="/admin/opportunities/opportunitydraft/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Review drafts
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Workflow
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    5 steps
                  </p>
                </div>

                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Source rule
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    Official
                  </p>
                </div>

                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Publish
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    Manual
                  </p>
                </div>

                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 text-xs leading-5 text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
                  Verify facts before students see them.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {primaryActions.map((item) => (
            <ActionCard key={item.title} item={item} />
          ))}
        </section>

        <section
          id="research-workflow"
          className="scroll-mt-24 rounded-[1.35rem] border border-pine/10 bg-white p-3 shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d] md:p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                Research workflow
              </p>
              <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
                From official page to published scholarship
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-ink/60 dark:text-white/58">
                Use this flow every time so listings stay accurate, useful, and safe for students.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void copyPrompt()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              {copiedPrompt ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <Clipboard size={16} aria-hidden="true" />
              )}
              {copiedPrompt ? "Prompt copied" : "Copy GPT prompt"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <WorkflowStepCard key={step.title} step={step} index={index} />
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-2xl border border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-pine" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink dark:text-white">
                  GPT extraction prompt
                </h3>
              </div>

              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-pine/10 bg-white p-3 text-xs leading-5 text-ink/70 dark:border-white/10 dark:bg-[#101214] dark:text-white/65">
                {gptPrompt}
              </pre>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-saffron/30 bg-saffron/10 p-3 dark:border-saffron/25 dark:bg-saffron/10">
                <div className="flex items-center gap-2">
                  <TimerReset size={16} className="text-pine" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink dark:text-white">
                    Verification rules
                  </h3>
                </div>

                <div className="mt-2 grid gap-2 text-sm leading-6 text-ink/65 dark:text-white/58">
                  <p>Use official source pages, not random blogs or social posts.</p>
                  <p>Do not mark fully funded, no IELTS, or no fee unless the source clearly says it.</p>
                  <p>Keep status as draft until deadline, source URL, eligibility, and benefits are checked.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-pine/10 bg-mint/25 p-3 dark:border-white/10 dark:bg-pine/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-pine" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink dark:text-white">
                    Before publishing
                  </h3>
                </div>

                <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-ink/65 dark:text-white/58">
                  <li>Official URL works.</li>
                  <li>Deadline is correct or marked rolling.</li>
                  <li>Degree levels and study fields are filled.</li>
                  <li>Funding and documents are accurate.</li>
                  <li>Verified status is used only after checking.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                Admin tools
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink dark:text-white">
                Manage content and students
              </h2>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {secondaryActions.map((item) => (
              <ActionCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
