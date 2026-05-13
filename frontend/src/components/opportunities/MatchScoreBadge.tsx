import type { OpportunityMatch } from "@/types/opportunity";

type MatchScoreBadgeProps = {
  score: number;
  readinessLevel?: OpportunityMatch["readiness_level"];
};

function getMatchLabel(score: number) {
  if (score >= 80) {
    return "Strong Match";
  }
  if (score >= 60) {
    return "Good Match";
  }
  if (score >= 40) {
    return "Moderate Match";
  }
  return "Low Match";
}

function getMatchClassName(score: number) {
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (score >= 60) {
    return "border-pine/20 bg-mint text-pine";
  }
  if (score >= 40) {
    return "border-saffron/40 bg-saffron/20 text-ink";
  }
  return "border-red-200 bg-red-50 text-red-700";
}

export function MatchScoreBadge({ score, readinessLevel }: MatchScoreBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${getMatchClassName(
        score,
      )}`}
      aria-label={`Match score ${score} out of 100`}
    >
      <span>{score}/100</span>
      <span>{getMatchLabel(score)}</span>
      {readinessLevel && <span className="font-medium opacity-75">{readinessLevel}</span>}
    </div>
  );
}
