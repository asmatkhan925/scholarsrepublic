"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { SiteHeader } from "@/components/site-header";
import { confirmPasswordReset } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryUid = params.get("uid") ?? "";
    const queryToken = params.get("token") ?? "";

    setUid(queryUid);
    setToken(queryToken);

    if (!queryUid || !queryToken) {
      setError("Password reset link is missing required data.");
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!uid || !token) {
      setError("Password reset link is missing required data.");
      return;
    }

    if (!password || !passwordConfirm) {
      setError("Enter and confirm your new password.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset({
        uid,
        token,
        password,
        password_confirm: passwordConfirm,
      });
      router.replace("/login?reset=1");
    } catch (resetError) {
      setError(
        getErrorMessage(resetError) ??
          "Password reset failed. Please request a new reset link.",
      );
      setLoading(false);
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
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Choose New Password
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter a strong password for your Scholars Republic account.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="StrongPassword123!"
                type="password"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Confirm new password
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="StrongPassword123!"
                type="password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading || !uid || !token}
              className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting password..." : "Reset password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Need a new link?{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Request password reset
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
