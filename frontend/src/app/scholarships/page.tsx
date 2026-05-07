import { SiteHeader } from "@/components/site-header";

export default function ScholarshipsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">Scholarships</h1>
        <p className="mt-3 max-w-2xl text-ink/70">
          Scholarship listing, filters, verified badges, and match scores will be implemented in the scholarship phases.
        </p>
      </section>
    </main>
  );
}
