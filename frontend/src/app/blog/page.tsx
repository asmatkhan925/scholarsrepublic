import { SiteHeader } from "@/components/site-header";

export default function BlogPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">Guides and Updates</h1>
        <p className="mt-3 max-w-2xl text-ink/70">
          Published guides for scholarships, SOPs, study plans, HEC processes, and no IELTS
          opportunities will be added in Phase 10.
        </p>
      </section>
    </main>
  );
}
