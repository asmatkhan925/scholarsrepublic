import type { MatchBreakdown as MatchBreakdownType } from "@/types/opportunity";

const BREAKDOWN_LABELS: Array<[keyof MatchBreakdownType, string, number]> = [
  ["eligibility", "Eligibility", 20],
  ["degree_level", "Degree level", 15],
  ["field_fit", "Field", 15],
  ["country_preference", "Country preference", 10],
  ["funding_fee", "Funding and fee", 10],
  ["language_test", "Language/test", 10],
  ["academic_requirement", "Academic requirement", 10],
  ["document_readiness", "Documents", 5],
  ["deadline_safety", "Deadline", 5],
];

type MatchBreakdownProps = {
  breakdown: MatchBreakdownType;
};

export function MatchBreakdown({ breakdown }: MatchBreakdownProps) {
  return (
    <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="font-semibold text-ink">Match Breakdown</h2>
      <div className="mt-4 grid gap-3">
        {BREAKDOWN_LABELS.map(([key, label, max]) => {
          const value = breakdown[key] ?? 0;
          const width = Math.min((value / max) * 100, 100);

          return (
            <div key={key} className="grid gap-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink/70">{label}</span>
                <span className="font-semibold text-ink">
                  {value}/{max}
                </span>
              </div>
              <div className="h-2 rounded bg-skyglass">
                <div className="h-2 rounded bg-pine" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
