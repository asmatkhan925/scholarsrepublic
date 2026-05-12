"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";
import { resendVerificationEmail } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: "outline";
              size: "large";
              width?: string;
              text?: "signin_with";
              shape?: "rectangular" | "pill";
            },
          ) => void;
        };
      };
    };
  }
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const verificationNotice =
  "Account created. Please check your email to verify your address before logging in. The email may take 1–2 minutes to arrive. Also check spam or promotions.";

function isVerificationError(message: string) {
  return message.toLowerCase().includes("verify your email");
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleRenderedRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [registeredNotice, setRegisteredNotice] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);

  const redirectAfterLogin = useCallback(
    (role: string) => {
      router.push(role === "admin" ? "/admin" : "/dashboard");
    },
    [router],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(registeredNotice ? verificationNotice : null);
    setResendMessage(null);
    setResendError(null);
    setLoading(true);

    try {
      const response = await login({ email, password });
      redirectAfterLogin(response.user.role);
    } catch (authError) {
      const message = getErrorMessage(authError) ?? "Login failed. Please try again.";

      if (isVerificationError(message)) {
        setNotice(
          "Please verify your email address before logging in. Check your inbox, spam, or promotions folder.",
        );
        setShowResendVerification(true);
        setError(null);
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

    setResendLoading(true);

    try {
      const response = await resendVerificationEmail({ email: trimmedEmail });
      setResendMessage(response.detail);
    } catch (resendRequestError) {
      setResendError(
        getErrorMessage(resendRequestError) ??
          "Verification email could not be sent. Please try again later.",
      );
    } finally {
      setResendLoading(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setNotice(null);
      setLoading(true);

      try {
        const response = await loginWithGoogle(credential);
        redirectAfterLogin(response.user.role);
      } catch (authError) {
        setError(getErrorMessage(authError));
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, redirectAfterLogin],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get("email");
    const registered = params.get("registered") === "1";

    if (queryEmail) {
      setEmail(queryEmail);
    }

    setPassword("");

    if (registered) {
      setNotice(verificationNotice);
      setRegisteredNotice(true);
      setShowResendVerification(true);
    }
  }, []);

  useEffect(() => {
    if (
      !googleClientId ||
      !googleScriptReady ||
      !googleButtonRef.current ||
      !window.google ||
      googleRenderedRef.current
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (response.credential) {
          void handleGoogleCredential(response.credential);
        }
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: "320",
      text: "signin_with",
      shape: "pill",
    });

    googleRenderedRef.current = true;
  }, [googleScriptReady, handleGoogleCredential]);

  return (
    <>
      <SiteHeader />

      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleScriptReady(true)}
        />
      )}

      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Scholars Republic
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Login</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to access your dashboard, saved opportunities, application tracker, and AI
              tools.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              <p>{notice}</p>

              {showResendVerification ? (
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={handleResendVerification}
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {resendLoading ? "Sending..." : "Resend verification email"}
                  </button>

                  {resendMessage ? (
                    <p className="text-sm text-emerald-800">{resendMessage}</p>
                  ) : null}

                  {resendError ? <p className="text-sm text-red-700">{resendError}</p> : null}
                </div>
              ) : null}
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

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {googleClientId ? (
            <div className="flex justify-center" ref={googleButtonRef} />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Google login is not configured yet.
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Create your profile
            </Link>
          </p>

          <button
            type="button"
            className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-700"
            onClick={() => {
              setNotice(
                "After registration, check your email and verify your account before logging in.",
              );
              setShowResendVerification(true);
            }}
          >
            I created an account but cannot log in
          </button>
        </section>
      </main>
    </>
  );
}
