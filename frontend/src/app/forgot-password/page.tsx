"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { requestPasswordReset } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

const RESET_REQUEST_SUCCESS_MESSAGE =
  "If an account exists for this email, we sent password reset instructions. Please check your inbox and spam folder.";

const RESET_REQUEST_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownRemaining((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (cooldownRemaining > 0) {
      return;
    }

    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset({ email });
      setMessage(RESET_REQUEST_SUCCESS_MESSAGE);
      setCooldownRemaining(RESET_REQUEST_COOLDOWN_SECONDS);
    } catch (resetError) {
      setError(getErrorMessage(resetError) ?? "Password reset request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Scholars Republic
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Reset Password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your account email and we will send a secure reset link if the account exists.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            For security, we cannot confirm whether an email is registered.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            {message}
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

          <button
            type="submit"
            disabled={loading || cooldownRemaining > 0}
            className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Sending reset link..."
              : cooldownRemaining > 0
                ? `Try again in ${cooldownRemaining}s`
                : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Login
          </Link>
        </p>
      </section>
    </AuthPageShell>
  );
}
