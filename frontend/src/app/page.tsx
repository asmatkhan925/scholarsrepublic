import Link from "next/link";
import {
  BadgeCheck,
  ClipboardCheck,
  FileText,
  Search,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";

const featuredScholarships = [
  {
    title: "Chinese Government Scholarship",
    country: "China",
    funding: "Fully Funded",
    deadline: "March 2026",
  },
  {
    title: "Taiwan ICDF Scholarship",
    country: "Taiwan",
    funding: "Fully Funded",
    deadline: "March 2026",
  },
  {
    title: "HEC Need-Based Scholarship",
    country: "Pakistan",
    funding: "Need Based",
    deadline: "Varies",
  },
];

const steps = [
  { label: "Create profile", icon: UserRoundCheck },
  { label: "Get match score", icon: Sparkles },
  { label: "Track applications", icon: ClipboardCheck },
  { label: "Request expert help", icon: FileText },
];

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section
        className="relative overflow-hidden bg-cover bg-center text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15, 81, 63, 0.92), rgba(15, 81, 63, 0.62)), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80')",
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Pakistan-first scholarship matching
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Find the Right Scholarship for Your Profile
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/88">
              Create your free profile, discover verified scholarships, check
              eligibility, and apply with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="rounded bg-saffron px-5 py-3 text-center font-semibold text-ink hover:bg-saffron/90">
                Create Free Profile
              </Link>
              <Link href="/scholarships" className="rounded border border-white/60 px-5 py-3 text-center font-semibold text-white hover:bg-white/10">
                Browse Scholarships
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded border border-ink/10 bg-white p-4 shadow-soft md:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded border border-ink/10 bg-skyglass px-4 py-3">
            <Search size={20} className="text-pine" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink/50"
              placeholder="Search scholarships by country, degree, or field"
            />
          </label>
          <button className="rounded bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-pine/90">
            Search
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Featured scholarships</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featuredScholarships.map((scholarship) => (
              <article key={scholarship.title} className="rounded border border-ink/10 bg-white p-5 shadow-soft">
                <div className="mb-4 inline-flex items-center gap-2 rounded bg-mint px-3 py-1 text-xs font-semibold text-pine">
                  <BadgeCheck size={14} aria-hidden="true" />
                  Verified sample
                </div>
                <h3 className="text-lg font-semibold text-ink">{scholarship.title}</h3>
                <p className="mt-2 text-sm text-ink/65">
                  {scholarship.country} · {scholarship.funding}
                </p>
                <p className="mt-4 text-sm font-medium text-ink">
                  Deadline: {scholarship.deadline}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-ink">How it works</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="rounded border border-ink/10 bg-white p-5">
                  <Icon className="text-pine" size={24} aria-hidden="true" />
                  <p className="mt-4 font-semibold text-ink">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
