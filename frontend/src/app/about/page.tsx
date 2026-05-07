import { SiteHeader } from "@/components/site-header";

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">About Scholars Republic</h1>
        <p className="mt-3 max-w-2xl text-ink/70">
          Scholars Republic helps Pakistani students find verified scholarships, understand eligibility, prepare documents, and apply with confidence.
        </p>
      </section>
    </main>
  );
}
