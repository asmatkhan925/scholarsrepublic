import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, CalendarDays, ExternalLink, GraduationCap, MapPin } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import { getPublicScholarshipCollection } from "@/lib/serverApi";
import { absoluteUrl, createBreadcrumbJsonLd, createWebPageJsonLd } from "@/lib/seo/jsonLd";
import type { OpportunityCollectionDetail } from "@/types/opportunity";

export const dynamic = "force-dynamic";

type CollectionRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Rolling or not listed";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function providerName(item: OpportunityCollectionDetail["items"][number]["opportunity"]) {
  return item.university_name || item.provider_name || item.company_name || "Provider not listed";
}

function collectionDescription(collection: OpportunityCollectionDetail | null, slug: string) {
  if (!collection) {
    return `Review this scholarship collection on Scholars Republic: ${slug}.`;
  }

  return (
    collection.intro_text ||
    collection.description ||
    `Review ${collection.items.length} scholarships selected by Scholars Republic.`
  );
}

export async function generateMetadata({ params }: CollectionRoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicScholarshipCollection(slug);
  const collection = result.data;
  const title = collection
    ? `${collection.title} - Scholars Republic`
    : "Scholarship Collection - Scholars Republic";
  const description = collectionDescription(collection, slug);
  const canonicalUrl = absoluteUrl(`/scholarships/collections/${slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "Scholars Republic",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ScholarshipCollectionRoutePage({ params }: CollectionRoutePageProps) {
  const { slug } = await params;
  const result = await getPublicScholarshipCollection(slug);

  if (result.notFound) {
    notFound();
  }

  if (!result.data) {
    console.error("[collection-page] Failed to load collection", {
      slug,
      status: result.status,
      url: result.url,
      bodySnippet: result.bodySnippet,
    });

    if (result.status === 200) {
      notFound();
    }

    throw new Error("Failed to load scholarship collection.");
  }

  const collection = result.data;
  const intro = collectionDescription(collection, slug);
  const deadlineRange =
    collection.deadline_start || collection.deadline_end
      ? `${formatDate(collection.deadline_start)} - ${formatDate(collection.deadline_end)}`
      : "Mixed deadlines";
  const summaryFacts = [
    collection.country ? { label: "Country", value: collection.country } : null,
    collection.degree_level ? { label: "Degree", value: collection.degree_level } : null,
    collection.funding_type ? { label: "Funding", value: humanize(collection.funding_type) } : null,
    collection.field_label ? { label: "Field", value: collection.field_label } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <>
      <JsonLd
        data={[
          createWebPageJsonLd({
            name: collection.title,
            description: intro,
            path: `/scholarships/collections/${collection.slug}`,
            type: "CollectionPage",
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Scholarships", path: "/scholarships" },
            {
              name: collection.title,
              path: `/scholarships/collections/${collection.slug}`,
            },
          ]),
        ]}
      />
      <SiteHeader />
      <main className="bg-[#f7faf8] text-ink dark:bg-[#101314] dark:text-white">
        <section className="border-b border-pine/10 bg-white dark:border-white/10 dark:bg-[#151819]">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <ButtonLink href="/scholarships" variant="ghost" className="w-fit gap-2">
              <ArrowLeft size={18} aria-hidden="true" />
              All scholarships
            </ButtonLink>

            <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
              <div>
                <Badge tone="mint">Scholarship collection</Badge>
                <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-ink dark:text-white md:text-5xl">
                  {collection.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">
                  {intro}
                </p>
              </div>

              <div className="grid gap-3 rounded-lg border border-pine/10 bg-[#f7faf8] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <CalendarDays size={20} className="mt-0.5 text-pine" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase text-ink/45 dark:text-white/45">
                      Deadline range
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                      {deadlineRange}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-ink/65 dark:text-white/60">
                  {collection.items.length} scholarships in this collection
                </div>
              </div>
            </div>

            {summaryFacts.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summaryFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-lg border border-pine/10 bg-[#f7faf8] px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-xs font-bold uppercase text-ink/45 dark:text-white/45">
                      {fact.label}
                    </p>
                    <p className="mt-1 text-sm font-black text-ink dark:text-white">{fact.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4">
            {collection.items.map(({ opportunity, position }) => (
              <Card key={opportunity.slug} className="dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="p-5">
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge tone="sky">#{position}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink/55 dark:text-white/50">
                          <MapPin size={14} aria-hidden="true" />
                          {opportunity.country || "Country not listed"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink/55 dark:text-white/50">
                          <GraduationCap size={14} aria-hidden="true" />
                          {opportunity.degree_levels?.join(", ") || "Degree not listed"}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-ink dark:text-white">
                        <Link
                          href={`/scholarships/${opportunity.slug}`}
                          className="hover:text-pine"
                        >
                          {opportunity.title}
                        </Link>
                      </h2>
                      <p className="mt-2 text-sm font-bold text-ink/60 dark:text-white/55">
                        {providerName(opportunity)}
                      </p>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70 dark:text-white/62">
                        {opportunity.summary ||
                          "Review the full scholarship page for eligibility, benefits, documents, and application guidance."}
                      </p>
                    </div>

                    <div className="grid min-w-56 gap-3 lg:text-right">
                      <div>
                        <p className="text-xs font-bold uppercase text-ink/45 dark:text-white/45">
                          Deadline
                        </p>
                        <p className="mt-1 text-sm font-black text-ink dark:text-white">
                          {formatDate(opportunity.deadline)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-ink/45 dark:text-white/45">
                          Funding
                        </p>
                        <p className="mt-1 text-sm font-black text-ink dark:text-white">
                          {humanize(opportunity.funding_type)}
                        </p>
                      </div>
                      <ButtonLink href={`/scholarships/${opportunity.slug}`} className="gap-2">
                        View scholarship
                        <ExternalLink size={16} aria-hidden="true" />
                      </ButtonLink>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
