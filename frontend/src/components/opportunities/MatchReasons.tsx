type MatchReasonsProps = {
  matched_reasons: string[];
  missing_requirements: string[];
  warnings: string[];
  suggestions: string[];
};

function ReasonList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-2 grid gap-2 text-sm text-ink/70">
          {items.map((item) => (
            <li key={item} className="rounded bg-skyglass px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink/55">{emptyText}</p>
      )}
    </section>
  );
}

export function MatchReasons({
  matched_reasons,
  missing_requirements,
  warnings,
  suggestions,
}: MatchReasonsProps) {
  return (
    <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="font-semibold text-ink">Match Reasons</h2>
      <div className="mt-4 grid gap-5">
        <ReasonList
          title="Why this matches"
          items={matched_reasons}
          emptyText="No matching reasons yet."
        />
        <ReasonList
          title="Missing requirements"
          items={missing_requirements}
          emptyText="No missing requirements detected."
        />
        <ReasonList title="Warnings" items={warnings} emptyText="No warnings detected." />
        <ReasonList
          title="Suggestions"
          items={suggestions}
          emptyText="No extra suggestions right now."
        />
      </div>
    </section>
  );
}
