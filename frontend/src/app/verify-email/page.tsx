"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/errors";

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

    if (!uid || !token) {
      setStatus("error");
      setMessage("This verification link is missing required information.");
      return;
    }

    const verificationPayload = { uid, token };

    async function runVerification() {
      try {
        const response = await verifyEmail(verificationPayload);
        const destination = response.user.role === "admin" ? "/admin" : "/dashboard";

        setStatus("success");
        setMessage("Email verified successfully. Opening your dashboard...");

        window.setTimeout(() => {
          router.replace(destination);

          window.setTimeout(() => {
            if (window.location.pathname !== destination) {
              window.location.assign(destination);
            }
          }, 700);
        }, 300);
      } catch (error) {
        setStatus("error");
        setMessage(getErrorMessage(error) ?? "Email verification failed. Please try again or request a new verification email.");
      }
    }

    void runVerification();
  }, [router, verifyEmail]);

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
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Back to login
            </Link>
          )}
        </section>
      </main>
    </>
  );
}
