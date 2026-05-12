
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";
import { resendVerificationEmail } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";

function verifiedStorageKey(email: string) {
  return `sr_email_verified:${email.trim().toLowerCase()}`;
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

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const didRunRef = useRef(false);

  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking",
  );
  const [message, setMessage] = useState("Verifying your email address...");
  const [loginHref, setLoginHref] = useState("/login");
  const [email, setEmail] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    if (didRunRef.current) {
      return;
    }

    didRunRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const token = params.get("token");
    const safeNextPath = getSafeNextPath(params.get("next"));

    setNextPath(safeNextPath);
    setLoginHref(buildAuthPath("/login", safeNextPath));

    if (!uid || !token) {
      setStatus("error");
      setMessage("This verification link is missing required information.");
      return;
    }

    const verificationPayload = {
      uid,
      token,
    };

    async function runVerification() {
      try {
        const response = await verifyEmail(verificationPayload);
        const destination = buildAuthPath("/login", safeNextPath, {
          verified: "1",
          email: response.email,
        });

        window.localStorage.setItem(
          verifiedStorageKey(response.email),
          String(Date.now()),
        );

        try {
          const channel = new BroadcastChannel("sr_auth");
          channel.postMessage({
            type: "email_verified",
            email: response.email,
          });
          channel.close();
        } catch {
          // BroadcastChannel is optional. localStorage event/focus handling still works.
        }

        setStatus("success");
        setMessage("Email verified successfully. Redirecting you to login...");

        window.setTimeout(() => {
          router.replace(destination);

          window.setTimeout(() => {
            if (!window.location.pathname.startsWith("/login")) {
              window.location.assign(destination);
            }
          }, 700);
        }, 300);
      } catch (error) {
        setStatus("error");
        setMessage(
          getErrorMessage(error) ??
            "This verification link is invalid or expired. Please request a new verification email.",
        );
      }
    }

    void runVerification();
  }, [router, verifyEmail]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownRemaining(getStoredCooldownRemaining(email));
    }, 1000);

    setCooldownRemaining(getStoredCooldownRemaining(email));

    return () => window.clearInterval(timer);
  }, [email]);

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
      storeCooldown(trimmedEmail, response.retry_after_seconds ?? 60);
      setCooldownRemaining(response.retry_after_seconds ?? 60);
    } catch (resendRequestError) {
      const retryAfterSeconds =
        (resendRequestError as {
          response?: { data?: { retry_after_seconds?: number } };
        }).response?.data?.retry_after_seconds ?? 0;

      if (retryAfterSeconds > 0) {
        storeCooldown(trimmedEmail, retryAfterSeconds);
        setCooldownRemaining(retryAfterSeconds);
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

      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Scholars Republic
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Email verification
          </h1>

          <div
            className={`mt-6 rounded-2xl border px-4 py-4 text-sm leading-6 ${
              status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {message}
          </div>

          {status === "error" && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </label>

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
                    : "Send a new verification email"}
              </button>

              <Link
                href={loginHref}
                className="mt-4 inline-flex w-full justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Back to login
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
