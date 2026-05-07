"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login({ email, password });
      router.push(response.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-65px)] max-w-md content-center px-4 py-12">
        <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Login</h1>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Sign in to access your student dashboard, saved opportunities, and future application
            tracking.
          </p>

          {error && (
            <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Email address
              <input
                className="rounded border border-ink/15 px-4 py-3 font-normal outline-none focus:border-pine"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Password
              <input
                className="rounded border border-ink/15 px-4 py-3 font-normal outline-none focus:border-pine"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                type="password"
                required
              />
            </label>
            <button
              className="rounded bg-pine px-4 py-3 font-semibold text-white hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p className="mt-5 text-sm text-ink/65">
            New here?{" "}
            <Link href="/register" className="font-semibold text-pine">
              Create your profile
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
