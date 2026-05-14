export function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

const promptMarkerPatterns = [
  "you are an expert scholarship sop editor",
  "your task:",
  "write a polished scholarship statement of purpose draft",
  "strict rules:",
  "student details:",
  "final reminder:",
  "output instruction:",
  "tone instruction:",
];

function startsWithPromptMarker(line: string) {
  const normalized = line.trim().toLowerCase();
  return promptMarkerPatterns.some((marker) => normalized.startsWith(marker));
}

function removeTrailingPromptEcho(text: string) {
  const lowerText = text.toLowerCase();
  const markerIndexes = promptMarkerPatterns
    .map((marker) => lowerText.indexOf(marker))
    .filter((index) => index >= 0);

  if (!markerIndexes.length) {
    return text;
  }

  const firstMarkerIndex = Math.min(...markerIndexes);
  const beforeMarker = text.slice(0, firstMarkerIndex).trim();

  if (beforeMarker.split(/\s+/).filter(Boolean).length >= 25) {
    return beforeMarker;
  }

  return text;
}

export function normalizeAIText(text: string) {
  const withoutTrailingEcho = removeTrailingPromptEcho(text);
  const cleanedLines: string[] = [];
  let skippingPromptBlock = false;

  for (const rawLine of withoutTrailingEcho
    .replace(/\r/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .split("\n")) {
    const line = rawLine
      .replace(/^\s*[-*]\s+/, "")
      .replace(/^\s*\d+[.)]\s+/, "")
      .trim();
    const lowered = line.toLowerCase();

    if (!line) {
      skippingPromptBlock = false;
      cleanedLines.push("");
      continue;
    }

    if (
      lowered.replace(/[.!]+$/, "") === "ai-generated, for reference only" ||
      lowered.replace(/[.!]+$/, "") === "ai generated, for reference only" ||
      lowered.replace(/[.!]+$/, "") === "ai-generated for reference only" ||
      lowered.replace(/[.!]+$/, "") === "ai generated for reference only"
    ) {
      continue;
    }

    if (startsWithPromptMarker(line)) {
      skippingPromptBlock = true;
      continue;
    }

    if (skippingPromptBlock) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines
    .join("\n")
    .replace(/([^\n])\n(?!\n)([^\n])/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
