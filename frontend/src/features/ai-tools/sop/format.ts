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
  "existing draft:",
];

function startsWithPromptMarker(line: string) {
  const normalized = line.trim().toLowerCase();
  return promptMarkerPatterns.some((marker) => normalized.startsWith(marker));
}

function looksLikePromptInstruction(line: string) {
  const normalized = line.trim().toLowerCase();
  return (
    startsWithPromptMarker(normalized) ||
    normalized.startsWith("return only") ||
    normalized.startsWith("return 4") ||
    normalized.startsWith("separate paragraphs") ||
    normalized.startsWith("do not") ||
    normalized.startsWith("if important details") ||
    normalized.startsWith("keep the writing") ||
    normalized.startsWith("avoid ") ||
    normalized.startsWith("make the sop") ||
    normalized.startsWith("write clean sop") ||
    normalized.startsWith("target scholarship:") ||
    normalized.startsWith("target country:") ||
    normalized.startsWith("target degree:") ||
    normalized.startsWith("field of study:") ||
    normalized.startsWith("why this scholarship matters:") ||
    normalized.startsWith("future goals:") ||
    normalized.startsWith("contribution goal:") ||
    normalized.startsWith("existing draft:")
  );
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
      if (looksLikePromptInstruction(line)) {
        continue;
      }

      skippingPromptBlock = false;
    }

    if (looksLikePromptInstruction(line)) {
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
