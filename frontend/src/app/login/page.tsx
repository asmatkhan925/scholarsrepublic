
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";
import { resendVerificationEmail } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";

const verificationNotice =
  "Account created. Please check your email to verify your address before logging in. The email may take 1–2 minutes to arrive. Also check spam or promotions.";

const FRESH_EVENT_WINDOW_MS = 2 * 60 * 1000;

function isVerificationError(message: string) {
  return message.toLowerCase().includes("verify your email");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resendStorageKey(email: string) {
  return `sr_verification_resend_until:${normalizeEmail(email)}`;
}

function verifiedStorageKey(email: string) {
  return `sr_email_verified:${normalizeEmail(email)}`;
}

function loginSuccessStorageKey(email: string) {
  return `sr_login_success:${normalizeEmail(email)}`;
}

function loginDestinationStorageKey(email: string) {
  return `sr_login_destination:${normalizeEmail(email)}`;
}

function isFreshTimestamp(value: string | null) {
  const timestamp = value ? Number(value) : 0;

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= FRESH_EVENT_WINDOW_MS;
}

function clearAuthTabEvents(email: string) {
  if (!email.trim() || typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(verifiedStorageKey(email));
  window.localStorage.removeItem(loginSuccessStorageKey(email));
  window.localStorage.removeItem(loginDestinationStorageKey(email));
}

function getScholarshipRedirectPath(nextPath: string) {
  const safeNextPath = getSafeNextPath(nextPath);

  if (safeNextPath.startsWith("/scholarships")) {
    return safeNextPath;
  }

  return "/scholarships";
}

function getStoredCooldownRemaining(email: string) {
  if (!email.trim()) {
    return 0;
  }

  const rawUntil = window.localStorage.getItem(resendStorageKey(email));
  const until = rawUntil ? Number(rawUntil) : 0;

  if (!Number.isFinite(until) || until <= Date.now()) {
    return 0;
  }

  return Math.ceil((until - Date.now()) / 1000);
}

function storeCooldown(email: string, seconds: number) {
  if (!email.trim() || seconds <= 0) {
    return;
  }

  window.localStorage.setItem(
    resendStorageKey(email),
    String(Date.now() + seconds * 1000),
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"amber" | "emerald">("amber");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  const registerHref = useMemo(
    () => buildAuthPath("/register", nextPath),
    [nextPath],
  );

  const startCooldown = useCallback((targetEmail: string, seconds: number) => {
    storeCooldown(targetEmail, seconds);
    setCooldownRemaining(seconds);
  }, []);

  const showVerifiedNotice = useCallback(() => {
    setShowResendVerification(false);
    setResendMessage(null);
    setResendError(null);
    setCooldownRemaining(0);
    setNotice("Email verified successfully. Please enter your password to continue.");
    setNoticeTone("emerald");
    setError(null);
  }, []);

  const broadcastLoginSuccess = useCallback((loggedInEmail: string, destination: string) => {
    if (!loggedInEmail.trim()) {
      return;
    }

    window.localStorage.setItem(loginSuccessStorageKey(loggedInEmail), String(Date.now()));
    window.localStorage.setItem(loginDestinationStorageKey(loggedInEmail), destination);

    try {
      const channel = new BroadcastChannel("sr_auth");
      channel.postMessage({
        type: "login_success",
        email: loggedInEmail,
        destination,
        timestamp: Date.now(),
      });
      channel.close();
    } catch {
      // BroadcastChannel is optional; storage events are enough in modern browsers.
    }
  }, []);

  const redirectOriginalTabAfterOtherLogin = useCallback(
    (loggedInEmail: string, destination?: string) => {
      const normalizedLoggedInEmail = normalizeEmail(loggedInEmail);
      const normalizedCurrentEmail = normalizeEmail(email);

      if (!normalizedLoggedInEmail || normalizedLoggedInEmail !== normalizedCurrentEmail) {
        return;
      }

      const storedDestination = window.localStorage.getItem(
        loginDestinationStorageKey(loggedInEmail),
      );

      const finalDestination =
        destination && destination.startsWith("/scholarships")
          ? destination
          : storedDestination && storedDestination.startsWith("/scholarships")
            ? storedDestination
            : "/scholarships";

      router.replace(finalDestination);
    },
    [email, router],
  );

  const redirectAfterLogin = useCallback(
    (role: string, loggedInEmail: string) => {
      const safeNextPath = getSafeNextPath(nextPath);
      const destination =
        safeNextPath !== "/dashboard"
          ? safeNextPath
          : role === "admin"
            ? "/admin"
            : "/dashboard";

      broadcastLoginSuccess(loggedInEmail, getScholarshipRedirectPath(safeNextPath));
      router.replace(destination);
    },
    [broadcastLoginSuccess, nextPath, router],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get("email") ?? "";
    const registered = params.get("registered") === "1";
    const verified = params.get("verified") === "1";
    const safeNextPath = getSafeNextPath(params.get("next"));

    setNextPath(safeNextPath);

    if (queryEmail) {
      setEmail(queryEmail);
    }

    setPassword("");

    if (registered) {
      if (queryEmail) {
        clearAuthTabEvents(queryEmail);
      }

      setNotice(verificationNotice);
      setNoticeTone("amber");
      setShowResendVerification(true);

      if (queryEmail) {
        startCooldown(queryEmail, 60);
      }

      return;
    }

    if (verified) {
      setNotice("Email verified successfully. Please enter your password to continue.");
      setNoticeTone("emerald");
      setShowResendVerification(false);
    }
  }, [startCooldown]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownRemaining(getStoredCooldownRemaining(email));
    }, 1000);

    setCooldownRemaining(getStoredCooldownRemaining(email));

    return () => window.clearInterval(timer);
  }, [email]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (!email.trim()) {
        return;
      }

      if (event.key === verifiedStorageKey(email) && isFreshTimestamp(event.newValue)) {
        showVerifiedNotice();
      }

      if (
        event.key === loginSuccessStorageKey(email) &&
        isFreshTimestamp(event.newValue)
      ) {
        redirectOriginalTabAfterOtherLogin(email);
      }
    }

    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel("sr_auth");
      channel.onmessage = (event) => {
        const eventEmail = String(event.data?.email ?? "");

        if (normalizeEmail(eventEmail) !== normalizeEmail(email)) {
          return;
        }

        if (event.data?.type === "email_verified") {
          showVerifiedNotice();
        }

        if (event.data?.type === "login_success") {
          redirectOriginalTabAfterOtherLogin(
            eventEmail,
            typeof event.data.destination === "string"
              ? event.data.destination
              : undefined,
          );
        }
      };
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [email, redirectOriginalTabAfterOtherLogin, showVerifiedNotice]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setResendMessage(null);
    setResendError(null);
    setLoading(true);

    try {
      const response = await login({ email, password });
      redirectAfterLogin(response.user.role, response.user.email);
    } catch (authError) {
      const message =
        getErrorMessage(authError) ?? "Login failed. Please try again.";

      if (isVerificationError(message)) {
        setError("Please verify your email address before logging in.");
        setShowResendVerification(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const trimmedEmail = email.trim();
    setResendMessage(null);
    setResendError(null);

    if (!trimmedEmail) {
      setResendError("Enter your email address first.");
      return;
    }

    const remaining = getStoredCooldownRemaining(trimmedEmail);
    if (remaining > 0) {
      setCooldownRemaining(remaining);
      setResendError(
        `Please wait ${remaining}s before requesting another verification email.`,
      );
      return;
    }

    setResendLoading(true);

    try {
      const response = await resendVerificationEmail({
        email: trimmedEmail,
        next: nextPath,
      });

      setResendMessage(response.detail);
      startCooldown(trimmedEmail, response.retry_after_seconds ?? 60);
    } catch (resendRequestError) {
      const retryAfterSeconds =
        (resendRequestError as {
          response?: { data?: { retry_after_seconds?: number } };
        }).response?.data?.retry_after_seconds ?? 0;

      if (retryAfterSeconds > 0) {
        startCooldown(trimmedEmail, retryAfterSeconds);
      }

      setResendError(
        getErrorMessage(resendRequestError) ??
          "Verification email could not be sent. Please try again later.",
      );
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Scholars Republic
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Login</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to access your dashboard, saved opportunities, application
              tracker, and AI tools.
            </p>
          </div>

          {notice && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                noticeTone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {notice}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                type="password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {showResendVerification && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-600">
                Did not receive the verification email? Wait at least one minute
                before requesting another one.
              </p>

              {resendMessage && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {resendError}
                </div>
              )}

              <button
                type="button"
                disabled={resendLoading || cooldownRemaining > 0}
                onClick={handleResendVerification}
                className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendLoading
                  ? "Sending..."
                  : cooldownRemaining > 0
                    ? `Wait ${cooldownRemaining}s before resending`
                    : "Resend verification email"}
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{" "}
            <Link
              href={registerHref}
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Create your profile
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
