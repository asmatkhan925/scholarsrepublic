type PlaceholderPanelProps = {
  title: string;
  items: string[];
};

export function PlaceholderPanel({ title, items }: PlaceholderPanelProps) {
  return (
    <section className="rounded border border-ink/10 bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded border border-ink/10 bg-skyglass p-4 text-sm font-medium text-ink/75"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
