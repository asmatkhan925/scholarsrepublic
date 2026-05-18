import type { ChecklistItem, OpportunityApplication } from "@/types/opportunity";

import { DEFAULT_APPLICATION_CHECKLIST } from "./application-options";

export function normalizeChecklistLabel(label: string) {
  const normalized = label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const aliases: Array<[RegExp, string]> = [
    [/\b(statement of purpose|sop|personal statement|motivation letter|letter of motivation)\b/g, "sop"],
    [/\b(curriculum vitae|resume|cv)\b/g, "cv"],
    [/\b(academic transcript|transcripts|transcript)\b/g, "transcript"],
    [/\b(letter of recommendation|letters of recommendation|recommendation letter|recommendation letters|reference letter|reference letters|lor)\b/g, "recommendation letter"],
    [/\b(passport copy|copy of passport|passport)\b/g, "passport"],
    [/\b(cnic|national id|identity card|id card)\b/g, "identity document"],
    [/\b(study plan|research plan|research proposal)\b/g, "study plan"],
    [/\b(english proficiency certificate|english language certificate|english proficiency)\b/g, "english proficiency"],
  ];

  return aliases.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    normalized,
  );
}

export function areChecklistLabelsSimilar(first: string, second: string) {
  const firstLabel = normalizeChecklistLabel(first);
  const secondLabel = normalizeChecklistLabel(second);

  if (!firstLabel || !secondLabel) {
    return false;
  }

  return (
    firstLabel === secondLabel ||
    firstLabel.includes(secondLabel) ||
    secondLabel.includes(firstLabel)
  );
}

export function getInitialChecklist(application: OpportunityApplication): ChecklistItem[] {
  const existing = application.checklist_snapshot ?? [];

  if (existing.length > 0) {
    return existing.map((item) => ({
      label: item.label,
      done: Boolean(item.done),
      url: item.url || "",
    }));
  }

  return DEFAULT_APPLICATION_CHECKLIST.map((item) => ({ ...item, url: item.url || "" }));
}
