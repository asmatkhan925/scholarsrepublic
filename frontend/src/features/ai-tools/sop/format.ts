export function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

const promptMarkerPatterns = [
  "you are an expert scholarship sop editor",
  "your task:",
  "write a balanced scholarship statement of purpose draft",
  "write a polished scholarship statement of purpose draft",
  "improve this existing scholarship statement of purpose draft",
  "strict rules:",
  "student details:",
  "final reminder:",
  "output instruction:",
  "tone instruction:",
  "degree guidance:",
  "improvement focus:",
  "optional student instruction:",
  "current sop draft:",
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
    normalized.startsWith("preserve 4") ||
    normalized.startsWith("separate paragraphs") ||
    normalized.startsWith("keep blank lines") ||
    normalized.startsWith("do not") ||
    normalized.startsWith("if important details") ||
    normalized.startsWith("if the optional student instruction") ||
    normalized.startsWith("for a phd application") ||
    normalized.startsWith("for a master's application") ||
    normalized.startsWith("for a master") ||
    normalized.startsWith("use a professional") ||
    normalized.startsWith("keep the writing") ||
    normalized.startsWith("avoid ") ||
    normalized.startsWith("make the sop") ||
    normalized.startsWith("write clean sop") ||
    normalized.startsWith("target scholarship:") ||
    normalized.startsWith("target country:") ||
    normalized.startsWith("target degree:") ||
    normalized.startsWith("field of study:") ||
    normalized.startsWith("academic background:") ||
    normalized.startsWith("key strength or achievement:") ||
    normalized.startsWith("key strength/achievement:") ||
    normalized.startsWith("why this scholarship matters:") ||
    normalized.startsWith("future goals:") ||
    normalized.startsWith("contribution goal:") ||
    normalized.startsWith("improvement focus:") ||
    normalized.startsWith("optional student instruction:") ||
    normalized.startsWith("current sop draft:") ||
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
    .replace(/^\s*```[^\n]*\s*$/gm, "")
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

export function getSOPParagraphs(text: string) {
  return normalizeAIText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function formatSOPForClipboard(text: string) {
  return getSOPParagraphs(text).join("\n\n");
}

function safeFileName(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || "sop-draft";
}

export async function downloadSOPAsDocx({
  title,
  text,
  metadata = [],
}: {
  title: string;
  text: string;
  metadata?: string[];
}) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const paragraphs = getSOPParagraphs(text);
  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
    ...metadata
      .map((item) => item.trim())
      .filter(Boolean)
      .map(
        (item) =>
          new Paragraph({
            children: [new TextRun({ text: item, italics: true })],
          }),
      ),
    new Paragraph({ text: "" }),
    ...paragraphs.map(
      (paragraph) =>
        new Paragraph({
          children: [new TextRun(paragraph)],
          spacing: { after: 240 },
        }),
    ),
  ];

  const documentFile = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(documentFile);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeFileName(title)}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
