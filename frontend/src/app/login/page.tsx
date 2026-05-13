"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, BookmarkCheck, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { resendVerificationEmail } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";

const verificationNotice =
  "Account created. Please check your email to verify your address before logging in. The email may take 1-2 minutes to arrive. Also check spam or promotions.";

const FRESH_EVENT_WINDOW_MS = 2 * 60 * 1000;

const trustBullets = [
  {
    label: "Verified scholarship opportunities",
    icon: BadgeCheck,
  },
  {
    label: "Saved opportunities and tracker",
    icon: BookmarkCheck,
  },
  {
    label: "Email verification for safer accounts",
    icon: ShieldCheck,
  },
];

function NoticeBox({ children, tone }: { children: ReactNode; tone: "amber" | "emerald" | "red" }) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`}>
      {children}
    </div>
  );
}

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

  window.localStorage.setItem(resendStorageKey(email), String(Date.now() + seconds * 1000));
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
  const [showPassword, setShowPassword] = useState(false);

  const registerHref = useMemo(() => buildAuthPath("/register", nextPath), [nextPath]);

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

  const redirectAfterLogin = useCallback(
    (role: string) => {
      const safeNextPath = getSafeNextPath(nextPath);
      const destination =
        safeNextPath !== "/dashboard" ? safeNextPath : role === "admin" ? "/admin" : "/dashboard";

      router.replace(destination);
    },
    [nextPath, router],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get("email") ?? "";
    const registered = params.get("registered") === "1";
    const verified = params.get("verified") === "1";
    const reset = params.get("reset") === "1";
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
      return;
    }

    if (reset) {
      setNotice("Password reset successfully. Please log in with your new password.");
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
      };
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [email, showVerifiedNotice]);

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
      const message = getErrorMessage(authError) ?? "Login failed. Please try again.";

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
      setResendError(`Please wait ${remaining}s before requesting another verification email.`);
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
        (
          resendRequestError as {
            response?: { data?: { retry_after_seconds?: number } };
          }
        ).response?.data?.retry_after_seconds ?? 0;

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
    <AuthPageShell mainClassName="bg-[#f7faf8] py-8 md:py-10">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-pine/10 bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="bg-emerald-950 px-6 py-8 text-white sm:px-8 md:py-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">
              Scholars Republic
            </p>
            <h1 className="mt-4 max-w-md text-3xl font-bold tracking-tight md:text-4xl">
              Welcome back to Scholars Republic
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-emerald-50/85 md:text-base">
              Access your saved scholarships, application tracker, profile, and AI tools.
            </p>

            <div className="mt-7 grid gap-3">
              {trustBullets.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-emerald-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm leading-6 text-emerald-50/85">
            Use the same verified email you registered with. You will only enter your password after
            your email is verified.
          </div>
        </aside>

        <section className="px-5 py-6 sm:px-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-md">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Student workspace
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Login</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign in with your verified email and password.
              </p>
            </div>

            <div className="grid gap-3">
              {notice ? (
                <NoticeBox tone={noticeTone === "emerald" ? "emerald" : "amber"}>
                  <span className="flex gap-2">
                    {noticeTone === "emerald" ? (
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                    ) : null}
                    <span>{notice}</span>
                  </span>
                </NoticeBox>
              ) : null}

              {error ? <NoticeBox tone="red">{error}</NoticeBox> : null}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <input
                  id="login-email"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative mt-2">
                  <input
                    id="login-password"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-14 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {showResendVerification ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Need a new verification email?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    You can request another verification link after the cooldown. Keep the same
                    email address in the field above.
                  </p>
                </div>

                <div className="mt-3 grid gap-3">
                  {resendMessage ? <NoticeBox tone="emerald">{resendMessage}</NoticeBox> : null}
                  {resendError ? <NoticeBox tone="red">{resendError}</NoticeBox> : null}
                </div>

                <button
                  type="button"
                  disabled={resendLoading || cooldownRemaining > 0}
                  onClick={handleResendVerification}
                  className="mt-4 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendLoading
                    ? "Sending verification email..."
                    : cooldownRemaining > 0
                      ? `Wait ${cooldownRemaining}s before resending`
                      : "Resend verification email"}
                </button>
              </div>
            ) : null}

            <p className="mt-6 text-center text-sm text-slate-600">
              New here?{" "}
              <Link
                href={registerHref}
                className="font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                Create your profile
              </Link>
            </p>
          </div>
        </section>
      </section>
    </AuthPageShell>
  );
}
