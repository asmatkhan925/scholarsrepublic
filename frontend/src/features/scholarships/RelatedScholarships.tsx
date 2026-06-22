"use client";

import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getScholarships } from "@/lib/api";
import { Badge, Card, CardContent } from "@/components/ui";
import type { OpportunityListItem } from "@/types/opportunity";

function deadlineTone(s: OpportunityListItem): "mint" | "saffron" | "danger" | "sky" {
  if (s.days_until_deadline === null) return "sky";
  if (s.days_until_deadline < 0) return "danger";
  if (s.days_until_deadline <= 14) return "saffron";
  return "mint";
}

function deadlineLabel(s: OpportunityListItem) {
  if (s.days_until_deadline === null) return "Rolling";
  if (s.days_until_deadline < 0) return "Expired";
  return `${s.days_until_deadline} days left`;
}

interface Props {
  currentSlug: string;
  country: string | null;
  fieldsOfStudy: string[];
  fundingType: string | null;
}

export function RelatedScholarships({ currentSlug, country, fieldsOfStudy, fundingType }: Props) {
  const [items, setItems] = useState<OpportunityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        // Primary: same country. Secondary: same field. Merge + dedupe.
        const results: OpportunityListItem[] = [];
        const seen = new Set<string>();
        seen.add(currentSlug);

        const add = (list: OpportunityListItem[]) => {
          for (const item of list) {
            if (!seen.has(item.slug) && results.length < 4) {
              seen.add(item.slug);
              results.push(item);
            }
          }
        };

        if (country) {
          const countryData = await getScholarships({ country, page_size: 6 });
          add(countryData.results);
        }

        if (results.length < 4 && fieldsOfStudy.length > 0) {
          const fieldData = await getScholarships({ field: fieldsOfStudy[0], page_size: 6 });
          add(fieldData.results);
        }

        if (results.length < 4 && fundingType) {
          const fieldData = await getScholarships({ funding_type: fundingType, page_size: 6 });
          add(fieldData.results);
        }

        if (mounted) setItems(results.slice(0, 3));
      } catch {
        // silently skip — related scholarships are non-critical
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [currentSlug, country, fieldsOfStudy, fundingType]);

  if (loading) {
    return (
      <div className="mt-8">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-100 dark:bg-white/8" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/8" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-ink dark:text-white">Related scholarships</p>
        <Link
          href={country ? `/scholarships?country=${encodeURIComponent(country)}` : "/scholarships"}
          className="flex items-center gap-1 text-xs font-semibold text-pine hover:underline"
        >
          Browse more <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((s) => {
          const provider = s.university_name || s.provider_name || s.company_name || null;
          const tone = deadlineTone(s);
          const label = deadlineLabel(s);

          return (
            <Link key={s.slug} href={`/scholarships/${s.slug}`} className="no-underline group">
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-pine/20 hover:shadow-md dark:border-white/10 dark:bg-[#181b1d]">
                <CardContent className="flex flex-col gap-2 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={tone}>{label}</Badge>
                    {s.verified_status && <Badge tone="mint">Verified</Badge>}
                  </div>

                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-pine dark:text-white">
                    {s.title}
                  </p>

                  {provider && (
                    <p className="line-clamp-1 text-xs text-ink/55 dark:text-white/45">{provider}</p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/50 dark:text-white/40">
                    {s.country && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} aria-hidden="true" />
                        {s.country}
                      </span>
                    )}
                    {s.degree_levels.length > 0 && (
                      <span className="flex items-center gap-1">
                        <CalendarDays size={10} aria-hidden="true" />
                        {s.degree_levels[0]}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
