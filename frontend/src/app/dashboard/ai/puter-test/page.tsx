"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";

type PuterAIOptions = {
  model?: string;
  stream?: boolean;
};

type PuterAI = {
  chat: (prompt: string, options?: PuterAIOptions) => Promise<unknown>;
};

type PuterWindow = Window & {
  puter?: {
    ai?: PuterAI;
  };
};

const DEFAULT_PROMPT =
  "Improve this scholarship SOP draft for a Pakistani student applying for MS Computer Science. Do not invent facts. Draft: I want to apply for master in computer science because I like AI and want to help my country.";

const systemInstruction = `You are an expert scholarship writing assistant for Scholars Republic.
Return only the final improved answer.
Do not show reasoning.
Do not invent achievements, universities, grades, awards, work experience, or research projects.
Improve clarity, structure, grammar, and academic tone.`;

function PuterTestContent() {
  const [scriptStatus, setScriptStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [model, setModel] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalPrompt = useMemo(() => {
    return `${systemInstruction}\n\nStudent request:\n${prompt}`;
  }, [prompt]);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.puter.com/v2/"]',
    );

    const checkReady = () => {
      const puterWindow = window as PuterWindow;

      if (puterWindow.puter?.ai?.chat) {
        setScriptStatus("ready");
      } else {
        setScriptStatus("failed");
      }
    };

    if (existingScript) {
      if ((window as PuterWindow).puter?.ai?.chat) {
        setScriptStatus("ready");
      } else {
        existingScript.addEventListener("load", checkReady, { once: true });
        existingScript.addEventListener("error", () => setScriptStatus("failed"), { once: true });
      }

      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;

    script.onload = checkReady;
    script.onerror = () => setScriptStatus("failed");

    document.body.appendChild(script);
  }, []);

  async function handleGenerate() {
    setError("");
    setResult("");
    setCopied(false);

    const puterWindow = window as PuterWindow;

    if (!puterWindow.puter?.ai?.chat) {
      setError("Puter.js is not ready yet. Please wait a moment and click Retry.");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter a prompt before testing.");
      return;
    }

    setLoading(true);

    try {
      const options: PuterAIOptions = {
        stream: false,
      };

      if (model.trim()) {
        options.model = model.trim();
      }

      const response = await puterWindow.puter.ai.chat(finalPrompt, options);

      if (typeof response === "string") {
        setResult(response);
      } else {
        setResult(JSON.stringify(response, null, 2));
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Puter.js request failed.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;

    await navigator.clipboard.writeText(result);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  function handleRetryScript() {
    setScriptStatus("loading");

    const script = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.puter.com/v2/"]',
    );

    if (script) {
      script.remove();
    }

    const newScript = document.createElement("script");
    newScript.src = "https://js.puter.com/v2/";
    newScript.async = true;

    newScript.onload = () => {
      const puterWindow = window as PuterWindow;

      if (puterWindow.puter?.ai?.chat) {
        setScriptStatus("ready");
      } else {
        setScriptStatus("failed");
      }
    };

    newScript.onerror = () => setScriptStatus("failed");

    document.body.appendChild(newScript);
  }

  return (
    <DashboardShell
      title="Puter.js AI Test"
      description="Test browser-based external AI generation without changing the main Scholars Republic SOP generator."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                <Sparkles size={14} aria-hidden="true" />
                External AI test page
              </div>

              <h2 className="mt-4 text-2xl font-bold text-ink">
                Test Puter.js for scholarship writing
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/65">
                This page is only for testing. It runs Puter.js in the browser and does not use your
                GPU server, Django queue, or vLLM wrapper.
              </p>
            </div>

            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                scriptStatus === "ready"
                  ? "border-pine/20 bg-pine/5 text-pine"
                  : scriptStatus === "failed"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-saffron/30 bg-saffron/10 text-ink/70"
              }`}
            >
              {scriptStatus === "ready" ? (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Puter.js ready
                </span>
              ) : scriptStatus === "failed" ? (
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle size={17} aria-hidden="true" />
                  Puter.js failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  Loading Puter.js
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
          <div className="grid gap-5">
            {scriptStatus === "failed" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                Puter.js could not be loaded. This may be caused by network blocking, browser
                privacy settings, or the external script being unavailable.
                <button
                  type="button"
                  onClick={handleRetryScript}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Retry loading script
                </button>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Optional model name
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="Leave empty to use Puter default model"
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              />
              <span className="text-xs font-normal leading-5 text-ink/55">
                For first test, leave this empty. Later we can test specific models such as OpenAI,
                Claude, Gemini, or DeepSeek if Puter supports them for your account/session.
              </span>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Test prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={9}
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-normal leading-7 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-ink/60">
                This test sends the prompt to Puter.js from the browser.
              </p>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || scriptStatus !== "ready"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {loading ? "Generating..." : "Test Puter AI"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-4 border-b border-ink/10 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Result</h2>
              <p className="mt-1 text-sm text-ink/60">
                Compare this quality with your Qwen GPU output.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!result}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={17} aria-hidden="true" />
              {copied ? "Copied" : "Copy result"}
            </button>
          </div>

          <div className="mt-5 min-h-[260px] whitespace-pre-wrap rounded-2xl border border-ink/10 bg-cream/40 p-5 text-sm leading-7 text-ink">
            {loading
              ? "Generating response from Puter.js..."
              : result || "The Puter.js test result will appear here."}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function PuterTestPage() {
  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <PuterTestContent />
    </ProtectedRoute>
  );
}
