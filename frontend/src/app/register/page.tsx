"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(params.get("next")));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const cleanedNextPath = getSafeNextPath(nextPath);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        password_confirm: passwordConfirm,
        next: cleanedNextPath,
      });

      const params = new URLSearchParams({
        registered: "1",
        email,
      });

      if (cleanedNextPath !== "/dashboard") {
        params.set("next", cleanedNextPath);
      }

      router.replace(`/login?${params.toString()}`);
    } catch (authError) {
      setError(
        getErrorMessage(authError) ?? "Registration failed. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader variant="auth" />

      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Scholars Republic
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Create Free Profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Register as a student. You will need to verify your email before
              logging in.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ali Khan"
                required
              />
            </label>

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
                placeholder="StrongPassword123!"
                type="password"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Confirm password
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
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating profile..." : "Register"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link
              href={buildAuthPath("/login", nextPath)}
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Login
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter variant="auth" />
    </>
  );
}
