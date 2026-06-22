"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";

import {
  applyCvFields,
  extractCvFields,
  extractCvText,
  type CvExtractedFields,
} from "@/lib/api/profile";
import { getErrorMessage } from "@/lib/errors";

// Human-readable labels for extracted field keys
const FIELD_LABELS: Record<string, string> = {
  city: "City",
  province: "Province",
  current_education_level: "Education level",
  current_institution: "Current institution",
  current_field_of_study: "Field of study",
  graduation_year: "Graduation year",
  grading_system: "Grading system",
  cgpa: "CGPA",
  percentage: "Percentage",
  has_ielts: "Has IELTS",
  ielts_score: "IELTS score",
  has_toefl: "Has TOEFL",
  toefl_score: "TOEFL score",
  has_gre: "Has GRE",
  gre_score: "GRE score",
  has_gmat: "Has GMAT",
  gmat_score: "GMAT score",
  has_duolingo: "Has Duolingo",
  duolingo_score: "Duolingo score",
  has_pte: "Has PTE",
  pte_score: "PTE score",
  has_research_experience: "Research experience",
  has_publications: "Has publications",
  publications_count: "Publications count",
  research_interests: "Research interests",
  skills: "Skills",
  work_experience_years: "Work experience (years)",
  has_internship_experience: "Internship experience",
  linkedin_url: "LinkedIn URL",
  github_url: "GitHub URL",
  portfolio_url: "Portfolio URL",
};

function formatValue(value: string | number | boolean | string[]): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

type Step = "upload" | "extracting" | "preview" | "applying" | "done";

interface Props {
  onClose: () => void;
  onApplied: () => void;
}

export function CvAutofillModal({ onClose, onApplied }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<CvExtractedFields>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [appliedCount, setAppliedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runExtraction = useCallback(async (file?: File, text?: string) => {
    setError(null);
    setStep("extracting");
    try {
      const result = file ? await extractCvFields(file) : await extractCvText(text ?? "");
      if (Object.keys(result.extracted).length === 0) {
        setError("No profile fields could be extracted from this CV. Try pasting the text instead.");
        setStep("upload");
        return;
      }
      setExtracted(result.extracted);
      setSelected(new Set(Object.keys(result.extracted)));
      setStep("preview");
    } catch (err) {
      setError(getErrorMessage(err));
      setStep("upload");
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void runExtraction(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void runExtraction(file);
  }

  async function handleApply() {
    const fieldsToApply: CvExtractedFields = {};
    for (const key of selected) {
      if (key in extracted) fieldsToApply[key] = extracted[key];
    }
    setStep("applying");
    try {
      const result = await applyCvFields(fieldsToApply);
      setAppliedCount(result.updated.length);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err));
      setStep("preview");
    }
  }

  function toggleField(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-[#181b1d]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pine/10 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine/10 text-pine dark:bg-pine/20">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink dark:text-white">Auto-fill from CV</h2>
              <p className="text-[11px] text-ink/50 dark:text-white/50">AI extracts your profile fields</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-ink/50 transition hover:bg-ink/5 hover:text-ink dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* ── UPLOAD STEP ── */}
          {step === "upload" && (
            <div className="grid gap-4">
              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </p>
              )}

              {!pasteMode ? (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition ${
                      isDragOver
                        ? "border-pine bg-mint/40 dark:border-pine dark:bg-pine/10"
                        : "border-pine/25 hover:border-pine/50 hover:bg-mint/20 dark:border-white/15 dark:hover:border-pine/40"
                    }`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pine/10 text-pine dark:bg-pine/20">
                      <Upload size={22} />
                    </span>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-ink dark:text-white">
                        Drop your CV here, or click to browse
                      </p>
                      <p className="mt-0.5 text-xs text-ink/50 dark:text-white/50">PDF · max 5 MB</p>
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => setPasteMode(true)}
                    className="text-center text-xs text-ink/50 underline underline-offset-2 hover:text-pine dark:text-white/50"
                  >
                    Scanned PDF? Paste CV text instead
                  </button>
                </>
              ) : (
                <>
                  <textarea
                    rows={8}
                    placeholder="Paste your full CV text here…"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPasteMode(false)}
                      className="rounded-2xl border border-pine/15 px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 dark:border-white/10 dark:text-white/70"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!pasteText.trim()}
                      onClick={() => void runExtraction(undefined, pasteText)}
                      className="flex-1 rounded-2xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:opacity-50"
                    >
                      Extract from text
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── EXTRACTING STEP ── */}
          {step === "extracting" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Loader2 size={36} className="animate-spin text-pine" />
              <div>
                <p className="font-semibold text-ink dark:text-white">Analysing your CV…</p>
                <p className="mt-0.5 text-sm text-ink/50 dark:text-white/50">
                  AI is extracting profile fields
                </p>
              </div>
            </div>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === "preview" && (
            <div className="grid gap-4">
              <p className="text-sm text-ink/70 dark:text-white/70">
                Review what was found. Uncheck any field you don&apos;t want to apply.
              </p>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-pine/10 dark:border-white/10">
                {Object.entries(extracted).map(([key, value], i) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-pine/5 dark:hover:bg-white/5 ${
                      i > 0 ? "border-t border-pine/5 dark:border-white/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggleField(key)}
                      className="h-4 w-4 rounded accent-pine"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-ink/50 dark:text-white/50">
                        {FIELD_LABELS[key] ?? key}
                      </span>
                      <span className="block truncate text-sm font-medium text-ink dark:text-white">
                        {formatValue(value as string | number | boolean | string[])}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStep("upload"); setError(null); }}
                  className="rounded-2xl border border-pine/15 px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 dark:border-white/10 dark:text-white/70"
                >
                  Try again
                </button>
                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => void handleApply()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:opacity-50"
                >
                  <FileText size={15} />
                  Apply {selected.size} field{selected.size !== 1 ? "s" : ""} to profile
                </button>
              </div>
            </div>
          )}

          {/* ── APPLYING STEP ── */}
          {step === "applying" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Loader2 size={36} className="animate-spin text-pine" />
              <p className="font-semibold text-ink dark:text-white">Updating your profile…</p>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine/10 text-pine dark:bg-pine/20">
                <CheckCircle2 size={30} />
              </span>
              <div>
                <p className="font-bold text-ink dark:text-white">
                  {appliedCount} field{appliedCount !== 1 ? "s" : ""} applied!
                </p>
                <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
                  Review and adjust the values in each section below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { onApplied(); onClose(); }}
                className="rounded-2xl bg-pine px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90"
              >
                View profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
