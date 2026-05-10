import { normalizeAIText } from "./format";

export function FormattedSOPText({ text }: { text: string }) {
  const blocks = normalizeAIText(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const looksLikeHeading =
          block.length < 70 &&
          !block.endsWith(".") &&
          !block.includes(",") &&
          index !== 0;

        if (looksLikeHeading) {
          return (
            <h3 key={index} className="pt-2 text-base font-bold text-ink">
              {block}
            </h3>
          );
        }

        return (
          <p key={index} className="text-sm leading-7 text-ink">
            {block}
          </p>
        );
      })}
    </div>
  );
}
