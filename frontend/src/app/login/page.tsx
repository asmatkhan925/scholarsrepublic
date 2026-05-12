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

function isVerificationError(message: string) {
  return message.toLowerCase().includes("verify your email");
}

function resendStorageKey(email: string) {
  return `sr_verification_resend_until:${email.trim().toLowerCase()}`;
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

  const redirectAfterLogin = useCallback(
    (role: string) => {
      const safeNextPath = getSafeNextPath(nextPath);
      const destination =
        safeNextPath !== "/dashboard"
          ? safeNextPath
          : role === "admin"
            ? "/admin"
            : "/dashboard";

      router.replace(destination);
    },
    [nextPath, router],
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
      setNotice(verificationNotice);
      setNoticeTone("amber");
      setShowResendVerification(true);

      if (queryEmail) {
        startCooldown(queryEmail, 60);
      }
    } else if (verified) {
      setNotice(
        "Email verified successfully. Please enter your password to continue.",
      );
      setNoticeTone("emerald");
    }
  }, [startCooldown]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownRemaining(getStoredCooldownRemaining(email));
    }, 1000);

    setCooldownRemaining(getStoredCooldownRemaining(email));

    return () => window.clearInterval(timer);
  }, [email]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setResendMessage(null);
    setResendError(null);
    setLoading(true);

    try {
      const response = await login({ email, password });
      redirectAfterLogin(response.user.role);
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
