import { SiteHeader } from "@/components/site-header";

export default function ServicesPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">Application Support Services</h1>
        <p className="mt-3 max-w-2xl text-ink/70">
          CV review, SOP review, study plan review, professor email review, full application review,
          and consultation requests will be added in Phase 9.
        </p>
      </section>
    </main>
  );
}
