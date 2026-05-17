"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Users,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  api,
  createSOPDraft,
  getAIJobStatus,
  getCountries,
  getRecommendedScholarships,
  getSavedOpportunities,
  getScholarships,
  getStudyFields,
  submitSOPJob,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import type { AIJobStatus, CreateSOPDraftPayload, GenerateSOPPayload } from "@/types/ai";
import type { CountryOption, StudyFieldOption } from "@/types/reference";
import type { OpportunityListItem, RecommendedOpportunity, SavedOpportunity } from "@/types/opportunity";
import { FormattedSOPText } from "./FormattedSOPText";
import { initialForm, PUTER_MODEL } from "./constants";
import { downloadSOPAsDocx, formatSOPForClipboard, formatWait, normalizeAIText } from "./format";
import { buildPuterPrompt, buildSOPImprovementPrompt, extractPuterText } from "./puter";
import type {
  AIHealthStatus,
  GenerationProvider,
  PuterWindow,
  SOPImprovementFocus,
} from "./types";

type DeepSeekWorkerStatusResponse = {
  online: boolean;
  status: "online" | "offline" | string;
  message: string;
};

type DeepSeekJobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

type CreateDeepSeekJobResponse = {
  job_id: number;
  status: DeepSeekJobStatus;
  message: string;
  poll_url: string;
};

type DeepSeekJobResponse = {
  id: number;
  kind: string;
  status: DeepSeekJobStatus;
  ok: boolean | null;
  text: string;
  user_message: string;
  jobs_ahead: number | null;
  queue_position: number | null;
  processing_label: string;
  result_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
};

type DeepSeekLimitErrorResponse = {
  detail?: string;
  status?: string;
  retry_after_seconds?: number;
};

type LocalSOPRequestPayload = Omit<GenerateSOPPayload, "academic_background" | "key_strength"> & {
  output_type: "full_sop";
  tone: "formal";
};


type ScholarshipPickerItem = {
  id: number;
  slug: string;
  title: string;
  country: string;
  degree: string;
  field: string;
  deadline: string | null;
  isSaved: boolean;
  matchScore: number | null;
  rankGroup: number;
};

const deepSeekTerminalStatuses: DeepSeekJobStatus[] = ["completed", "failed", "canceled"];
const sopImprovementOptions: Array<{ value: SOPImprovementFocus; label: string }> = [
  { value: "opening", label: "Improve opening/motivation" },
  { value: "academic_background", label: "Improve academic background" },
  { value: "scholarship_fit", label: "Improve scholarship fit" },
  { value: "future_goals", label: "Improve future goals/contribution" },
  { value: "clarity", label: "Make the whole SOP clearer" },
];
const fallbackCountryOptions = ["Pakistan", "China", "Turkey", "Germany", "United States"];
const fallbackStudyFieldOptions = [
  "Computer Science",
  "Artificial Intelligence",
  "Engineering",
  "Business Administration",
  "Public Health",
];
const deepSeekLeaveWarning =
  "Your SOP request is still processing. Leaving may cancel or lose the result.";

function getDeepSeekLimitPayload(error: unknown): DeepSeekLimitErrorResponse | null {
  if (!isAxiosError<DeepSeekLimitErrorResponse>(error)) {
    return null;
  }

  return error.response?.data ?? null;
}

function formatCooldown(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}



function formatDeadline(value: string | null) {
  if (!value) return "Rolling or not listed";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

function getProviderDisplayName(provider: GenerationProvider | null) {
  if (provider === "local") return "Server 1";
  if (provider === "puter") return "Server 2";
  if (provider === "deepseek") return "Server 3";
  return "";
}

function getBackendSOPPayload(form: GenerateSOPPayload): LocalSOPRequestPayload {
  const extraNotes = [
    form.existing_draft?.trim(),
    form.academic_background?.trim()
      ? `Academic background: ${form.academic_background.trim()}`
      : "",
    form.key_strength?.trim()
      ? `Key strength or achievement: ${form.key_strength.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    target_scholarship: form.target_scholarship,
    target_country: form.target_country,
    target_degree: form.target_degree,
    field_of_study: form.field_of_study,
    why_scholarship: form.why_scholarship,
    future_goals: form.future_goals,
    contribution_goal: form.contribution_goal,
    existing_draft: extraNotes,
    output_type: "full_sop",
    tone: "formal",
  };
}

function cancelDeepSeekJobWithKeepalive(jobId: number) {
  const accessToken = getAccessToken();
  const baseUrl = api.defaults.baseURL ?? "";

  void fetch(`${baseUrl}/desktop-automation/jobs/${jobId}/cancel/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: "{}",
    keepalive: true,
  }).catch(() => {
    // Best effort during page unload.
  });
}

function getDeepSeekProcessingLabel(job: DeepSeekJobResponse) {
  const backendLabel = job.processing_label?.replace("Queued - ", "Queued — ");

  if (job.status === "running") {
    return backendLabel || "Processing now";
  }

  if (job.status !== "queued") {
    return backendLabel || "Please keep this page open";
  }

  const jobsAhead =
    job.jobs_ahead ??
    (job.queue_position && job.queue_position > 0
      ? Math.max(0, job.queue_position - 1)
      : null);

  if (jobsAhead === 0 && job.queue_position === 1) {
    return "Queued — you are next";
  }

  if (backendLabel) {
    return backendLabel;
  }

  if (typeof jobsAhead === "number") {
    return jobsAhead > 0 ? `Queued — ${jobsAhead} job(s) ahead` : "Queued — you are next";
  }

  return "Queued";
}

function CompactOptionInput({
  id,
  label,
  options,
  placeholder,
  required = false,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: string[];
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-ink">
      {label}
      <input
        required={required}
        list={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
      />
      <datalist id={id}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

function SOPGeneratorContent() {
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [checkingAI, setCheckingAI] = useState(true);
  const [provider, setProvider] = useState<GenerationProvider>("local");
  const [puterStatus, setPuterStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [deepSeekWorkerStatus, setDeepSeekWorkerStatus] =
    useState<DeepSeekWorkerStatusResponse | null>(null);
  const [checkingDeepSeekWorker, setCheckingDeepSeekWorker] = useState(true);
  const [countryOptions, setCountryOptions] = useState<string[]>(fallbackCountryOptions);
  const [studyFieldOptions, setStudyFieldOptions] = useState<string[]>(fallbackStudyFieldOptions);
  const [form, setForm] = useState<GenerateSOPPayload>(initialForm);
  const [job, setJob] = useState<AIJobStatus | null>(null);
  const [jobMessage, setJobMessage] = useState("");
  const [puterResult, setPuterResult] = useState("");
  const [deepSeekJob, setDeepSeekJob] = useState<DeepSeekJobResponse | null>(null);
  const [deepSeekResult, setDeepSeekResult] = useState("");
  const [deepSeekError, setDeepSeekError] = useState<string | null>(null);
  const [deepSeekCooldownSeconds, setDeepSeekCooldownSeconds] = useState(0);
  const [resultProvider, setResultProvider] = useState<GenerationProvider | null>(null);
  const [resultForm, setResultForm] = useState<GenerateSOPPayload | null>(null);
  const [improvementFocus, setImprovementFocus] = useState<SOPImprovementFocus>("opening");
  const [improvementInstruction, setImprovementInstruction] = useState("");
  const [improvingDraft, setImprovingDraft] = useState(false);
  const [improvementMessage, setImprovementMessage] = useState<string | null>(null);
  const [improvementError, setImprovementError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [scholarshipSearch, setScholarshipSearch] = useState("");
  const [loadingScholarships, setLoadingScholarships] = useState(false);
  const [scholarshipItems, setScholarshipItems] = useState<ScholarshipPickerItem[]>([]);
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipPickerItem | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeDeepSeekJobIdRef = useRef<number | null>(null);
  const submittedFormRef = useRef<GenerateSOPPayload | null>(null);

  const canSubmit = useMemo(() => {
    return (
      Boolean(selectedScholarship) &&
      form.target_degree.trim().length > 0 &&
      form.field_of_study.trim().length > 0 &&
      ((form.future_goals || "").trim().length > 0 || (form.existing_draft || "").trim().length > 0)
    );
  }, [form, selectedScholarship]);



  async function loadScholarshipPickerItems() {
    setLoadingScholarships(true);
    try {
      const [savedResponse, recommendedResponse, scholarshipsResponse] = await Promise.all([
        getSavedOpportunities(),
        getRecommendedScholarships(),
        getScholarships(),
      ]);

      const itemMap = new Map<string, ScholarshipPickerItem>();

      const upsertItem = (
        scholarship: OpportunityListItem,
        options: { isSaved: boolean; matchScore: number | null; rankGroup: number },
      ) => {
        if (!scholarship?.slug) return;
        const existing = itemMap.get(scholarship.slug);
        const degree = scholarship.degree_levels?.[0] ?? "";
        const field = scholarship.fields_of_study?.[0] ?? "";
        const next: ScholarshipPickerItem = {
          id: scholarship.id,
          slug: scholarship.slug,
          title: scholarship.title,
          country: scholarship.country ?? "",
          degree,
          field,
          deadline: scholarship.deadline ?? null,
          isSaved: options.isSaved || existing?.isSaved || false,
          matchScore:
            typeof options.matchScore === "number" ? options.matchScore : existing?.matchScore ?? null,
          rankGroup: Math.min(existing?.rankGroup ?? options.rankGroup, options.rankGroup),
        };
        itemMap.set(scholarship.slug, next);
      };

      (savedResponse.results ?? []).forEach((saved: SavedOpportunity) => {
        upsertItem(saved.opportunity_detail, { isSaved: true, matchScore: null, rankGroup: 0 });
      });
      (recommendedResponse.results ?? []).forEach((recommended: RecommendedOpportunity) => {
        upsertItem(recommended.opportunity, {
          isSaved: false,
          matchScore: recommended.match?.score ?? null,
          rankGroup: 1,
        });
      });
      (scholarshipsResponse.results ?? []).forEach((scholarship) => {
        upsertItem(scholarship, { isSaved: false, matchScore: null, rankGroup: 2 });
      });

      const items = Array.from(itemMap.values()).sort((a, b) => {
        if (a.rankGroup !== b.rankGroup) return a.rankGroup - b.rankGroup;
        if ((b.matchScore ?? -1) !== (a.matchScore ?? -1)) return (b.matchScore ?? -1) - (a.matchScore ?? -1);
        return a.title.localeCompare(b.title);
      });
      setScholarshipItems(items);
    } catch {
      setScholarshipItems([]);
    } finally {
      setLoadingScholarships(false);
    }
  }

  async function checkAIHealth() {
    setCheckingAI(true);
    setError(null);

    try {
      const response = await api.get<AIHealthStatus>("/ai/health/");
      const health = response.data;

      setAiHealth(health);

      if (!health.available) {
        setProvider("puter");
      }
    } catch {
      setAiHealth({
        available: false,
        status: "offline",
        message: "Server 1 is temporarily unavailable.",
      });
      setProvider("puter");
    } finally {
      setCheckingAI(false);
    }
  }

  async function checkDeepSeekWorkerStatus() {
    setCheckingDeepSeekWorker(true);

    try {
      const response = await api.get<DeepSeekWorkerStatusResponse>(
        "/desktop-automation/workers/status/",
      );
      setDeepSeekWorkerStatus(response.data);
      setDeepSeekError(response.data.online ? null : "Server 3 is unavailable.");
    } catch {
      setDeepSeekWorkerStatus({
        online: false,
        status: "offline",
        message: "Server 3 status could not be loaded.",
      });
      setDeepSeekError("Server 3 status could not be loaded.");
    } finally {
      setCheckingDeepSeekWorker(false);
    }
  }

  async function loadReferenceOptions() {
    try {
      const [countriesResponse, fieldsResponse] = await Promise.all([
        getCountries(),
        getStudyFields(),
      ]);

      const countries = countriesResponse.results
        .map((country: CountryOption) => country.name)
        .filter(Boolean);
      const studyFields = fieldsResponse.results
        .map((field: StudyFieldOption) => field.name)
        .filter(Boolean);

      setCountryOptions(countries.length ? countries : fallbackCountryOptions);
      setStudyFieldOptions(studyFields.length ? studyFields : fallbackStudyFieldOptions);
    } catch {
      setCountryOptions(fallbackCountryOptions);
      setStudyFieldOptions(fallbackStudyFieldOptions);
    }
  }

  function loadPuterScript() {
    setPuterStatus("loading");

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.puter.com/v2/"]',
    );

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;

    script.onload = () => {
      const puterWindow = window as PuterWindow;

      if (puterWindow.puter?.ai?.chat) {
        setPuterStatus("ready");
      } else {
        setPuterStatus("failed");
      }
    };

    script.onerror = () => {
      setPuterStatus("failed");
    };

    document.body.appendChild(script);
  }

  useEffect(() => {
    checkAIHealth();
    checkDeepSeekWorkerStatus();
    loadReferenceOptions();
    void loadScholarshipPickerItems();
    loadPuterScript();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (deepSeekCooldownSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDeepSeekCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deepSeekCooldownSeconds]);

  useEffect(() => {
    const isActive = deepSeekJob?.status === "queued" || deepSeekJob?.status === "running";
    activeDeepSeekJobIdRef.current = isActive && deepSeekJob ? deepSeekJob.id : null;
  }, [deepSeekJob]);

  useEffect(() => {
    const isActive = deepSeekJob?.status === "queued" || deepSeekJob?.status === "running";

    if (!isActive) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = deepSeekLeaveWarning;
      return deepSeekLeaveWarning;
    }

    function handlePageHide() {
      const jobId = activeDeepSeekJobIdRef.current;
      if (jobId) {
        cancelDeepSeekJobWithKeepalive(jobId);
      }
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#")) {
        return;
      }

      if (!window.confirm(deepSeekLeaveWarning)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const jobId = activeDeepSeekJobIdRef.current;
      if (jobId) {
        cancelDeepSeekJobWithKeepalive(jobId);
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [deepSeekJob]);

  function resetSaveState() {
    setSavedDraftId(null);
    setSaveMessage(null);
    setSaveError(null);
  }

  function resetImprovementStatus() {
    setImprovementMessage(null);
    setImprovementError(null);
  }

  function updateField<K extends keyof GenerateSOPPayload>(field: K, value: GenerateSOPPayload[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    resetSaveState();
  }

  async function pollJob(jobId: number) {
    try {
      const latest = await getAIJobStatus(jobId);
      setJob(latest);

      if (latest.status === "success" || latest.status === "failed") {
        setLoading(false);
        setResultProvider(latest.status === "success" ? "local" : null);
        setResultForm(latest.status === "success" ? submittedFormRef.current : null);

        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (requestError) {
      setLoading(false);
      setError(getErrorMessage(requestError));

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }

  async function pollDeepSeekJob(jobId: number): Promise<DeepSeekJobResponse | null> {
    try {
      const response = await api.get<DeepSeekJobResponse>(
        `/desktop-automation/jobs/${jobId}/`,
      );
      const latest = response.data;

      setDeepSeekJob(latest);

      if (deepSeekTerminalStatuses.includes(latest.status)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        setLoading(false);

        if (latest.status === "completed") {
          setDeepSeekResult(normalizeAIText(latest.user_message || latest.text || ""));
          setResultProvider("deepseek");
          setResultForm(submittedFormRef.current);
          setDeepSeekError(null);
          setError(null);
        } else {
          const message =
            latest.user_message ||
            latest.text ||
            "Your Server 3 request could not be completed.";

          setDeepSeekError(message);
          setError(message);
          setResultProvider(null);
        }
      }

      return latest;
    } catch (requestError) {
      const message = getErrorMessage(requestError);

      setLoading(false);
      setDeepSeekError(message);
      setError(message);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      return null;
    }
  }

  async function cancelDeepSeekJob(jobId: number) {
    try {
      const response = await api.post<DeepSeekJobResponse>(
        `/desktop-automation/jobs/${jobId}/cancel/`,
        {},
      );

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      setDeepSeekJob(response.data);
      setDeepSeekError(response.data.user_message || "This AI request was canceled.");
      setLoading(false);
    } catch (requestError) {
      setDeepSeekError(getErrorMessage(requestError));
    }
  }

  async function generateWithLocalServer() {
    if (!aiHealth?.available) {
      setProvider("puter");
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setCopiedFormatted(false);
    setJob(null);
    setJobMessage("");
    setPuterResult("");
    setDeepSeekJob(null);
    setDeepSeekResult("");
    setDeepSeekError(null);
    setResultProvider(null);
    setResultForm(null);
    resetImprovementStatus();
    resetSaveState();
    submittedFormRef.current = { ...form };

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const response = await submitSOPJob(getBackendSOPPayload(form));

      setJobMessage(response.message);
      setJob({
        id: response.job_id,
        tool_type: "sop_generate",
        status: response.status,
        result_text: "",
        error_message: "",
        queue_position: response.queue_position,
        queue_position_at_submit: response.queue_position,
        estimated_wait_seconds: response.estimated_wait_seconds,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        created_at: new Date().toISOString(),
      });

      await pollJob(response.job_id);

      pollingRef.current = setInterval(() => {
        pollJob(response.job_id);
      }, 3000);
    } catch (requestError) {
      setLoading(false);
      setError(getErrorMessage(requestError));
      await checkAIHealth();
    }
  }

  async function generateWithPuter() {
    const puterWindow = window as PuterWindow;

    if (!puterWindow.puter?.ai?.chat) {
      setError("Server 2 is still loading. Please wait a moment or refresh options.");
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setCopiedFormatted(false);
    setJob(null);
    setJobMessage("");
    setPuterResult("");
    setDeepSeekJob(null);
    setDeepSeekResult("");
    setDeepSeekError(null);
    setResultProvider(null);
    setResultForm(null);
    resetImprovementStatus();
    resetSaveState();
    submittedFormRef.current = { ...form };

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const response = await puterWindow.puter.ai.chat(buildPuterPrompt(form), {
        model: PUTER_MODEL,
        stream: false,
      });

      setPuterResult(normalizeAIText(extractPuterText(response)));
      setResultProvider("puter");
      setResultForm(submittedFormRef.current);
    } catch {
      const message = "Server 2 request failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function generateWithDeepSeek() {
    if (checkingDeepSeekWorker || !deepSeekWorkerStatus?.online) {
      const message = "Server 3 is unavailable. Refresh options before trying again.";

      setDeepSeekError(message);
      setError(message);
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setCopiedFormatted(false);
    setJob(null);
    setJobMessage("");
    setPuterResult("");
    setDeepSeekJob(null);
    setDeepSeekResult("");
    setDeepSeekError(null);
    setResultProvider(null);
    setResultForm(null);
    resetImprovementStatus();
    resetSaveState();
    submittedFormRef.current = { ...form };

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const response = await api.post<CreateDeepSeekJobResponse>(
        "/desktop-automation/deepseek-jobs/",
        {
          query: buildPuterPrompt(form),
        },
      );

      setDeepSeekCooldownSeconds(0);

      const queuedJob: DeepSeekJobResponse = {
        id: response.data.job_id,
        kind: "deepseek_query",
        status: response.data.status,
        ok: null,
        text: response.data.message,
        user_message: response.data.message,
        jobs_ahead: null,
        queue_position: null,
        processing_label: "Queued",
        result_payload: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        claimed_at: null,
        completed_at: null,
        failed_at: null,
      };

      setDeepSeekJob(queuedJob);

      const latest = await pollDeepSeekJob(response.data.job_id);

      if (latest && !deepSeekTerminalStatuses.includes(latest.status)) {
        pollingRef.current = setInterval(() => {
          void pollDeepSeekJob(response.data.job_id);
        }, 3000);
      }
    } catch (requestError) {
      const limitPayload = getDeepSeekLimitPayload(requestError);
      const retryAfter = limitPayload?.retry_after_seconds ?? 0;
      const message =
        limitPayload?.detail ??
        getErrorMessage(requestError) ??
        "Could not submit the Server 3 request.";

      if (retryAfter > 0) {
        setDeepSeekCooldownSeconds(retryAfter);
      }

      setLoading(false);
      setDeepSeekError(message);
      setError(message);

      if (isAxiosError(requestError) && requestError.response?.status === 503) {
        await checkDeepSeekWorkerStatus();
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedScholarship) {
      setError("Please choose the scholarship you are applying for.");
      return;
    }

    if (!canSubmit) {
      setError(
        "Please provide scholarship selection, target degree, field of study, and either future goals or an existing SOP draft.",
      );
      return;
    }

    if (provider === "local") {
      await generateWithLocalServer();
      return;
    }

    if (provider === "deepseek") {
      await generateWithDeepSeek();
      return;
    }

    await generateWithPuter();
  }

  const localResult = normalizeAIText(job?.result_text || "");
  const result =
    resultProvider === "puter"
      ? puterResult
      : resultProvider === "deepseek"
        ? deepSeekResult
        : resultProvider === "local"
          ? localResult
          : "";
  const isWaiting =
    provider === "local" && (job?.status === "pending" || job?.status === "running");
  const deepSeekActiveJob = deepSeekJob?.status === "queued" || deepSeekJob?.status === "running";
  const deepSeekIsWaiting = Boolean(deepSeekActiveJob);

  function applyImprovedResult(improvedText: string, improvedProvider: GenerationProvider) {
    const cleanedText = normalizeAIText(improvedText);

    if (!cleanedText) {
      throw new Error("The improved draft was empty. Please try again.");
    }

    if (improvedProvider === "puter") {
      setPuterResult(cleanedText);
    }

    if (improvedProvider === "deepseek") {
      setDeepSeekResult(cleanedText);
    }

    if (improvedProvider === "local") {
      setJob((current) =>
        current
          ? {
              ...current,
              result_text: cleanedText,
            }
          : current,
      );
    }

    setResultProvider(improvedProvider);
    setResultForm(resultForm ?? form);
    setCopied(false);
    setCopiedFormatted(false);
    resetSaveState();
  }

  async function improveWithPuter(prompt: string) {
    const puterWindow = window as PuterWindow;

    if (!puterWindow.puter?.ai?.chat) {
      throw new Error("This improvement option is still loading. Please refresh options.");
    }

    const response = await puterWindow.puter.ai.chat(prompt, {
      model: PUTER_MODEL,
      stream: false,
    });

    applyImprovedResult(extractPuterText(response), "puter");
  }

  async function improveWithDeepSeek(prompt: string) {
    if (checkingDeepSeekWorker || !deepSeekWorkerStatus?.online) {
      throw new Error("This improvement option is unavailable. Refresh options before trying again.");
    }

    const response = await api.post<CreateDeepSeekJobResponse>(
      "/desktop-automation/deepseek-jobs/",
      {
        query: prompt,
      },
    );

    setDeepSeekCooldownSeconds(0);

    setDeepSeekJob({
      id: response.data.job_id,
      kind: "deepseek_query",
      status: response.data.status,
      ok: null,
      text: response.data.message,
      user_message: response.data.message,
      jobs_ahead: null,
      queue_position: null,
      processing_label: "Queued",
      result_payload: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      claimed_at: null,
      completed_at: null,
      failed_at: null,
    });

    for (let attempt = 0; attempt < 240; attempt += 1) {
      const latestResponse = await api.get<DeepSeekJobResponse>(
        `/desktop-automation/jobs/${response.data.job_id}/`,
      );
      const latest = latestResponse.data;

      setDeepSeekJob(latest);

      if (latest.status === "completed") {
        applyImprovedResult(latest.user_message || latest.text || "", "deepseek");
        return;
      }

      if (latest.status === "failed" || latest.status === "canceled") {
        throw new Error(
          latest.user_message || latest.text || "The improved draft could not be completed.",
        );
      }

      await wait(3000);
    }

    throw new Error("The improved draft is taking too long. Please try again.");
  }

  async function handleImproveDraft() {
    if (!result || improvingDraft) {
      return;
    }

    resetImprovementStatus();

    if (provider === "local") {
      setImprovementError("Improvement is available after selecting Server 2 or Server 3.");
      return;
    }

    const prompt = buildSOPImprovementPrompt({
      form: resultForm ?? form,
      existingSOP: result,
      focus: improvementFocus,
      instruction: improvementInstruction,
    });

    setImprovingDraft(true);
    setImprovementMessage("Improving draft. Please keep this page open.");
    setError(null);
    setDeepSeekError(null);

    try {
      if (provider === "deepseek") {
        await improveWithDeepSeek(prompt);
      } else {
        await improveWithPuter(prompt);
      }

      setImprovementMessage("Draft improved. Review it before saving.");
    } catch (requestError) {
      const limitPayload = getDeepSeekLimitPayload(requestError);
      const retryAfter = limitPayload?.retry_after_seconds ?? 0;
      const message =
        limitPayload?.detail ||
        (requestError instanceof Error
          ? requestError.message
          : "The improved draft could not be completed.");

      if (retryAfter > 0) {
        setDeepSeekCooldownSeconds(retryAfter);
      }

      if (isAxiosError(requestError) && requestError.response?.status === 503) {
        await checkDeepSeekWorkerStatus();
      }

      setImprovementMessage(null);
      setImprovementError(message);
    } finally {
      setImprovingDraft(false);
    }
  }

  async function handleCopy() {
    if (!result) return;

    await navigator.clipboard.writeText(result);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  async function handleCopyFormatted() {
    if (!result) return;

    await navigator.clipboard.writeText(formatSOPForClipboard(result));
    setCopiedFormatted(true);

    setTimeout(() => {
      setCopiedFormatted(false);
    }, 1800);
  }

  function getDraftTitle() {
    const draftForm = resultForm ?? form;
    const titleAnchor =
      draftForm.target_scholarship?.trim() ||
      draftForm.target_degree?.trim() ||
      "Scholarship SOP";

    return `SOP Draft - ${titleAnchor}`.slice(0, 180);
  }

  function getDraftMetadata() {
    const draftForm = resultForm ?? form;
    return [
      draftForm.target_country ? `Target country: ${draftForm.target_country}` : "",
      draftForm.target_degree ? `Target degree: ${draftForm.target_degree}` : "",
      draftForm.field_of_study ? `Field of study: ${draftForm.field_of_study}` : "",
      resultProviderName ? `Generated using: ${resultProviderName}` : "",
    ];
  }

  async function handleDownloadDocx() {
    if (!result) return;

    setDownloadingDocx(true);

    try {
      await downloadSOPAsDocx({
        title: getDraftTitle(),
        text: result,
        metadata: getDraftMetadata(),
      });
    } finally {
      setDownloadingDocx(false);
    }
  }

  async function handleSaveDraft() {
    if (!result || !resultProvider || savedDraftId) {
      return;
    }

    const draftForm = resultForm ?? form;
    const providerLabel = getProviderDisplayName(resultProvider);
    const payload: CreateSOPDraftPayload = {
      title: getDraftTitle(),
      provider: resultProvider,
      provider_label: providerLabel,
      target_scholarship: draftForm.target_scholarship || "",
      target_country: draftForm.target_country || "",
      target_degree: draftForm.target_degree || "",
      field_of_study: draftForm.field_of_study || "",
      academic_background: draftForm.academic_background || "",
      key_strength: draftForm.key_strength || "",
      why_this_scholarship: draftForm.why_scholarship || "",
      future_goal: draftForm.future_goals || "",
      contribution_goal: draftForm.contribution_goal || "",
      notes: draftForm.existing_draft || "",
      sop_text: result,
    };

    setSavingDraft(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const draft = await createSOPDraft(payload);
      setSavedDraftId(draft.id);
      setSaveMessage("Draft saved to your SOP history.");
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError));
    } finally {
      setSavingDraft(false);
    }
  }

  const localOptionDisabled = !aiHealth?.available;
  const puterOptionDisabled = puterStatus !== "ready";
  const deepSeekOptionDisabled = checkingDeepSeekWorker || !deepSeekWorkerStatus?.online;
  const deepSeekCooldownActive = deepSeekCooldownSeconds > 0;
  const generateDisabled =
    loading ||
    !canSubmit ||
    (provider === "local" && localOptionDisabled) ||
    (provider === "puter" && puterOptionDisabled) ||
    (provider === "deepseek" &&
      (deepSeekOptionDisabled || deepSeekCooldownActive || deepSeekActiveJob));
  const improveDraftDisabled =
    !result ||
    improvingDraft ||
    loading ||
    isWaiting ||
    deepSeekActiveJob ||
    (provider === "puter" && puterOptionDisabled) ||
    (provider === "deepseek" && (deepSeekOptionDisabled || deepSeekCooldownActive));
  const resultProviderName = getProviderDisplayName(resultProvider);
  const deepSeekWorkerLabel = checkingDeepSeekWorker
    ? "Checking"
    : deepSeekWorkerStatus?.online
      ? "Ready"
      : "Unavailable";
  const showDeepSeekJobBar = Boolean(
    deepSeekJob && (provider === "deepseek" || deepSeekActiveJob),
  );
  const generateButtonText = loading
    ? "Processing..."
    : provider === "local"
      ? "Generate Server 1"
      : provider === "puter"
        ? "Generate Server 2"
        : deepSeekCooldownActive
          ? `Wait ${formatCooldown(deepSeekCooldownSeconds)}`
          : "Generate Server 3";
  const normalizedScholarshipSearch = scholarshipSearch.trim().toLowerCase();
  const filteredScholarshipItems = scholarshipItems.filter((item) => {
    if (!normalizedScholarshipSearch) return true;
    const haystack = [item.title, item.country, item.degree, item.field].join(" ").toLowerCase();
    return haystack.includes(normalizedScholarshipSearch);
  });

  function handleSelectScholarship(item: ScholarshipPickerItem) {
    setSelectedScholarship(item);
    updateField("target_scholarship", item.title);
    if (item.country) updateField("target_country", item.country);
    if (item.degree) updateField("target_degree", item.degree);
    if (item.field) updateField("field_of_study", item.field);
    setShowScholarshipModal(false);
  }

  return (
    <DashboardShell
      title="AI SOP Generator"
      description="Generate a scholarship Statement of Purpose draft using your profile and the details you provide."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
          <div className="border-b border-ink/10 bg-gradient-to-r from-pine/10 via-white to-saffron/10 px-4 py-3 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  <Sparkles size={14} aria-hidden="true" />
                  Scholars Republic AI Tool
                </div>

                <h2 className="mt-2 text-lg font-bold text-ink md:text-xl">
                  Scholarship SOP generator
                </h2>
                <Link
                  href="/dashboard/ai/sop/history"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pine transition hover:text-pine/80"
                >
                  <History size={14} aria-hidden="true" />
                  View SOP history
                </Link>
              </div>

              <div className="rounded-xl border border-ink/10 bg-white/80 p-3 text-xs text-ink/70 md:max-w-md">
                <div className="flex gap-2">
                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-saffron"
                    aria-hidden="true"
                  />
                  <p className="leading-5">
                    Do not enter passport numbers, CNIC numbers, bank details, or highly sensitive
                    private information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 p-3 md:p-4">
            {checkingAI && (
              <div className="rounded-xl border border-saffron/30 bg-saffron/10 px-3 py-2 text-xs leading-5 text-ink/70">
                Checking draft options...
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                <p>{error}</p>
                {provider === "deepseek" && deepSeekCooldownActive ? (
                  <p className="mt-2 font-semibold">
                    Try again in {formatCooldown(deepSeekCooldownSeconds)}.
                  </p>
                ) : null}
              </div>
            )}

            <section className="rounded-2xl border border-ink/10 bg-cream/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-ink">Draft option</h3>
                <button
                  type="button"
                  onClick={() => {
                    void checkAIHealth();
                    void checkDeepSeekWorkerStatus();
                    loadPuterScript();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink/5"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Refresh
                </button>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <button
                  type="button"
                  disabled={localOptionDisabled}
                  onClick={() => setProvider("local")}
                  className={`rounded-xl border p-3 text-left transition ${
                    provider === "local"
                      ? "border-pine bg-pine/5"
                      : "border-ink/10 bg-white hover:border-pine/30"
                  } ${localOptionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-ink">Server 1</h4>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        aiHealth?.available ? "bg-pine/10 text-pine" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {aiHealth?.available ? "Ready" : "Unavailable"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={puterOptionDisabled}
                  onClick={() => setProvider("puter")}
                  className={`rounded-xl border p-3 text-left transition ${
                    provider === "puter"
                      ? "border-pine bg-pine/5"
                      : "border-ink/10 bg-white hover:border-pine/30"
                  } ${puterOptionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-ink">Server 2</h4>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        puterStatus === "ready"
                          ? "bg-pine/10 text-pine"
                          : puterStatus === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-saffron/15 text-ink/60"
                      }`}
                    >
                      {puterStatus === "ready"
                        ? "Ready"
                        : puterStatus === "failed"
                          ? "Unavailable"
                          : "Loading"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={deepSeekOptionDisabled}
                  onClick={() => setProvider("deepseek")}
                  className={`rounded-xl border p-3 text-left transition ${
                    provider === "deepseek"
                      ? "border-pine bg-pine/5"
                      : "border-ink/10 bg-white hover:border-pine/30"
                  } ${deepSeekOptionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-ink">Server 3</h4>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        checkingDeepSeekWorker
                          ? "bg-saffron/15 text-ink/60"
                          : deepSeekWorkerStatus?.online
                            ? "bg-pine/10 text-pine"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {deepSeekWorkerLabel}
                    </span>
                  </div>
                </button>
              </div>

              {puterStatus === "failed" && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                  Server 2 is unavailable. Check your browser or network and refresh options.
                  <button
                    type="button"
                    onClick={loadPuterScript}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Refresh
                  </button>
                </div>
              )}

              {provider === "deepseek" && deepSeekError && !deepSeekCooldownActive && (
                <div className="mt-3 rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/75">
                  {deepSeekError}
                </div>
              )}

              {provider === "deepseek" &&
              !deepSeekWorkerStatus?.online &&
              !checkingDeepSeekWorker ? (
                <p className="mt-2 text-xs leading-5 text-ink/55">Server 3 is unavailable.</p>
              ) : null}
            </section>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Target scholarship/program
                <button
                  type="button"
                  onClick={() => setShowScholarshipModal(true)}
                  className="inline-flex h-10 items-center justify-between rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal text-ink transition hover:border-pine/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
                >
                  <span className={selectedScholarship ? "text-ink" : "text-ink/55"}>
                    {selectedScholarship?.title || "Choose scholarship"}
                  </span>
                  <span className="text-xs font-semibold text-pine">Choose scholarship</span>
                </button>
                {!selectedScholarship ? (
                  <p className="text-xs font-semibold text-red-700">
                    Please choose the scholarship you are applying for.
                  </p>
                ) : null}
              </label>

              <CompactOptionInput
                id="sop-target-country-options"
                label="Target country"
                options={countryOptions}
                placeholder="China"
                value={form.target_country || ""}
                onChange={(value) => updateField("target_country", value)}
              />

              <label className="grid gap-1 text-sm font-semibold text-ink">
                Target degree *
                <input
                  required
                  value={form.target_degree}
                  onChange={(event) => updateField("target_degree", event.target.value)}
                  placeholder="Master's or PhD"
                  className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <CompactOptionInput
                id="sop-field-options"
                label="Field of study *"
                options={studyFieldOptions}
                placeholder="Artificial Intelligence"
                required
                value={form.field_of_study || ""}
                onChange={(value) => updateField("field_of_study", value)}
              />

              <label className="grid gap-1 text-sm font-semibold text-ink">
                Academic background
                <input
                  value={form.academic_background}
                  onChange={(event) => updateField("academic_background", event.target.value)}
                  placeholder="BS Computer Science, final year"
                  className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-ink">
                Key strength/achievement
                <input
                  value={form.key_strength}
                  onChange={(event) => updateField("key_strength", event.target.value)}
                  placeholder="Relevant project, skill, award, or experience"
                  className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Why this scholarship?
                <textarea
                  value={form.why_scholarship}
                  onChange={(event) => updateField("why_scholarship", event.target.value)}
                  rows={2}
                  placeholder="Why this award fits your goals"
                  className="min-h-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-ink">
                Future goal *
                <textarea
                  value={form.future_goals}
                  onChange={(event) => updateField("future_goals", event.target.value)}
                  rows={2}
                  placeholder="Plans after this degree"
                  className="min-h-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-ink">
                Contribution goal
                <textarea
                  value={form.contribution_goal}
                  onChange={(event) => updateField("contribution_goal", event.target.value)}
                  rows={2}
                  placeholder="How this degree helps your community or field"
                  className="min-h-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Notes or existing draft
                <textarea
                  value={form.existing_draft}
                  onChange={(event) => updateField("existing_draft", event.target.value)}
                  rows={3}
                  placeholder="Add details the draft should use, or paste a rough SOP"
                  className="min-h-24 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-cream/50 p-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs leading-5 text-ink/65">
                <strong className="text-ink">Required:</strong> scholarship selection, target degree,
                field of study, and
                either future goals or an existing draft.
              </div>

              <button
                type="submit"
                disabled={generateDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {generateButtonText}
              </button>
            </div>
          </form>

          {showScholarshipModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
              <div className="w-full max-w-3xl rounded-2xl border border-ink/10 bg-white shadow-soft">
                <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
                  <h3 className="text-sm font-bold text-ink">Choose scholarship</h3>
                  <button
                    type="button"
                    onClick={() => setShowScholarshipModal(false)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-ink/65 hover:bg-ink/5"
                  >
                    Close
                  </button>
                </div>
                <div className="p-4">
                  <input
                    value={scholarshipSearch}
                    onChange={(event) => setScholarshipSearch(event.target.value)}
                    placeholder="Search by title, country, degree, or field"
                    className="h-10 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                  />

                  <div className="mt-3 max-h-[55vh] overflow-y-auto rounded-xl border border-ink/10">
                    {loadingScholarships ? (
                      <p className="px-3 py-3 text-sm text-ink/60">Loading scholarships...</p>
                    ) : filteredScholarshipItems.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-ink/60">
                        No scholarships found. Try a different keyword.
                      </p>
                    ) : (
                      <ul className="divide-y divide-ink/10">
                        {filteredScholarshipItems.map((item) => (
                          <li key={item.slug}>
                            <button
                              type="button"
                              onClick={() => handleSelectScholarship(item)}
                              className="w-full px-3 py-2 text-left hover:bg-cream/50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                                  <p className="mt-1 text-xs text-ink/60">
                                    {item.country || "Country not listed"} · {item.degree || "Degree not listed"} ·{" "}
                                    {item.field || "Field not listed"}
                                  </p>
                                  <p className="mt-1 text-xs text-ink/50">
                                    Deadline: {formatDeadline(item.deadline)}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {item.isSaved ? (
                                    <span className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] font-semibold text-sky">
                                      Saved
                                    </span>
                                  ) : null}
                                  {typeof item.matchScore === "number" ? (
                                    <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[11px] font-semibold text-pine">
                                      Match {Math.round(item.matchScore)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

        </section>

        {provider === "local" && job && (
          <section className="rounded-2xl border border-pine/15 bg-pine/5 p-5 shadow-soft md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                  <Users size={14} aria-hidden="true" />
                  AI queue
                </div>

                <h2 className="mt-3 text-xl font-bold text-ink">Request status: {job.status}</h2>

                <p className="mt-2 text-sm leading-6 text-ink/65">
                  {jobMessage ||
                    `Queue position: ${job.queue_position}. Estimated wait: ${formatWait(
                      job.estimated_wait_seconds,
                    )}.`}
                </p>
              </div>

              {isWaiting && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-pine/20 bg-white px-4 py-3 text-sm font-semibold text-pine">
                  <Clock size={17} aria-hidden="true" />
                  Estimated wait: {formatWait(job.estimated_wait_seconds)}
                </div>
              )}
            </div>
          </section>
        )}

        {showDeepSeekJobBar && deepSeekJob && (
          <section className="flex flex-col gap-2 rounded-2xl border border-pine/15 bg-pine/5 p-3 shadow-soft md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-pine">
                <Users size={14} aria-hidden="true" />
                Server 3
              </span>
              <span className="font-bold capitalize text-ink">
                {deepSeekJob.status === "running" ? "Processing now" : deepSeekJob.status}
              </span>
              <span className="text-ink/45">&middot;</span>
              <span className="text-ink/65">{getDeepSeekProcessingLabel(deepSeekJob)}</span>
              {deepSeekJob.queue_position && deepSeekJob.queue_position > 0 ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink/60">
                  Position #{deepSeekJob.queue_position}
                </span>
              ) : null}
            </div>

            {deepSeekIsWaiting ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pine">
                  <Clock size={14} aria-hidden="true" />
                  Keep open
                </span>
                <button
                  type="button"
                  onClick={() => void cancelDeepSeekJob(deepSeekJob.id)}
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            ) : deepSeekJob.status === "failed" || deepSeekJob.status === "canceled" ? (
              <span className="text-sm font-semibold text-red-700">
                {deepSeekError ||
                  deepSeekJob.user_message ||
                  deepSeekJob.text ||
                  "Your Server 3 request could not be completed."}
              </span>
            ) : null}
          </section>
        )}

        <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft md:p-5">
          <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
                <FileText size={14} aria-hidden="true" />
                Generated output
              </div>

              <h2 className="mt-2 text-xl font-bold text-ink">Generated SOP Draft</h2>

              {result && resultProviderName ? (
                <p className="mt-1 max-w-3xl text-sm leading-6 text-ink/65">
                  Generated using <strong>{resultProviderName}</strong>. Use this as a starting
                  draft and personalize it before submission.
                </p>
              ) : null}

              {provider === "local" &&
                job?.elapsed_seconds !== undefined &&
                job?.elapsed_seconds !== null && (
                  <p className="mt-2 text-xs text-ink/50">
                    Generated in {job.elapsed_seconds} seconds.
                  </p>
                )}

            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={!result || !resultProvider || savingDraft || Boolean(savedDraftId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingDraft ? (
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                ) : savedDraftId ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {savingDraft ? "Saving..." : savedDraftId ? "Saved" : "Save draft"}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <Copy size={17} aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy draft"}
              </button>
              <button
                type="button"
                onClick={() => void handleCopyFormatted()}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copiedFormatted ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <Copy size={17} aria-hidden="true" />
                )}
                {copiedFormatted ? "Copied" : "Copy formatted"}
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadDocx()}
                disabled={!result || downloadingDocx}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloadingDocx ? (
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download size={17} aria-hidden="true" />
                )}
                Download .docx
              </button>
            </div>
          </div>

          {(saveMessage || saveError) && (
            <div
              className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                saveError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-pine/20 bg-pine/5 text-pine"
              }`}
            >
              {saveError || saveMessage}
            </div>
          )}

          <div className="mt-4 min-h-[220px] rounded-2xl border border-ink/10 bg-cream/40 p-4 text-sm leading-7 text-ink">
            {deepSeekIsWaiting && !result ? (
              "Your Server 3 request is being processed. Please keep this page open."
            ) : loading || isWaiting ? (
              "Your SOP request is being processed. Please keep this page open. The result will appear here when ready."
            ) : provider === "deepseek" &&
              !result &&
              (deepSeekJob?.status === "failed" || deepSeekJob?.status === "canceled") ? (
              deepSeekError ||
              deepSeekJob?.user_message ||
              deepSeekJob?.text ||
              "Your Server 3 request could not be completed."
            ) : provider === "local" && job?.status === "failed" ? (
              job.error_message ||
              "This draft option is temporarily unavailable. Try another option."
            ) : result ? (
              <FormattedSOPText text={result} />
            ) : (
              "Your generated SOP will appear here after you submit the form."
            )}
          </div>

          {result ? (
            <div className="mt-3 rounded-2xl border border-ink/10 bg-white p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="grid flex-1 gap-1 text-sm font-semibold text-ink">
                  Improve draft
                  <select
                    value={improvementFocus}
                    onChange={(event) =>
                      setImprovementFocus(event.target.value as SOPImprovementFocus)
                    }
                    className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                  >
                    {sopImprovementOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid flex-[1.5] gap-1 text-sm font-semibold text-ink">
                  Optional instruction
                  <input
                    value={improvementInstruction}
                    onChange={(event) => setImprovementInstruction(event.target.value)}
                    placeholder="Example: make it more specific but do not add fake achievements."
                    className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleImproveDraft()}
                  disabled={improveDraftDisabled}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-pine px-4 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {improvingDraft ? (
                    <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles size={17} aria-hidden="true" />
                  )}
                  {improvingDraft ? "Improving..." : "Improve draft"}
                </button>
              </div>

              {(improvingDraft || improvementMessage || improvementError) && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    improvementError ? "text-red-700" : "text-ink/60"
                  }`}
                >
                  {improvementError ||
                    (improvingDraft
                      ? "Improving draft. Please keep this page open."
                      : improvementMessage)}
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-sm leading-6 text-ink/70">
            <strong>Reminder:</strong> Do not submit AI-generated text directly. Review it
            carefully, make it personal, and remove anything that does not accurately represent your
            background.
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function SOPGeneratorPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <SOPGeneratorContent />
    </ProtectedRoute>
  );
}
