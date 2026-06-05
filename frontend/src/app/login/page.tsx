"use client";

import Link from "next/link";
import { BadgeCheck, BookmarkCheck, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useLoginForm } from "./useLoginForm";

const trustBullets = [
  { label: "Verified scholarship opportunities", icon: BadgeCheck },
  { label: "Saved opportunities and tracker", icon: BookmarkCheck },
  { label: "Email verification for safer accounts", icon: ShieldCheck },
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

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    error,
    notice,
    noticeTone,
    showResendVerification,
    resendMessage,
    resendError,
    resendLoading,
    cooldownRemaining,
    registerHref,
    handleSubmit,
    handleResendVerification,
  } = useLoginForm();

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
