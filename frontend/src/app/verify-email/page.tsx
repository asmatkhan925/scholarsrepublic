
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";

const REDIRECT_DELAY_MS = 3000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function verifiedStorageKey(email: string) {
  return `sr_email_verified:${normalizeEmail(email)}`;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const didRunRef = useRef(false);

  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking",
  );
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    if (didRunRef.current) {
      return;
    }

    didRunRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const token = params.get("token");
    const nextPath = getSafeNextPath(params.get("next"));
    const registerDestination = buildAuthPath("/register", nextPath);

    function redirectToRegister() {
      window.setTimeout(() => {
        router.replace(registerDestination);

        window.setTimeout(() => {
          if (!window.location.pathname.startsWith("/register")) {
            window.location.assign(registerDestination);
          }
        }, 700);
      }, REDIRECT_DELAY_MS);
    }

    if (!uid || !token) {
      setStatus("error");
      setMessage(
        "This verification link is missing required information. Redirecting you to registration...",
      );
      redirectToRegister();
      return;
    }

    const verificationPayload = {
      uid,
      token,
    };

    async function runVerification() {
      try {
        const response = await verifyEmail(verificationPayload);
        const loginDestination = buildAuthPath("/login", nextPath, {
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
            timestamp: Date.now(),
          });
          channel.close();
        } catch {
          // BroadcastChannel is optional.
        }

        setStatus("success");
        setMessage("Email verified successfully. Redirecting you to login...");

        window.setTimeout(() => {
          router.replace(loginDestination);

          window.setTimeout(() => {
            if (!window.location.pathname.startsWith("/login")) {
              window.location.assign(loginDestination);
            }
          }, 700);
        }, 300);
      } catch (error) {
        setStatus("error");
        setMessage(
          `${
            getErrorMessage(error) ??
            "This verification link is invalid or expired."
          } Redirecting you to registration...`,
        );
        redirectToRegister();
      }
    }

    void runVerification();
  }, [router, verifyEmail]);

  return (
    <>
      <SiteHeader variant="auth" />

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
        </section>
      </main>
      <SiteFooter variant="auth" />
    </>
  );
}
