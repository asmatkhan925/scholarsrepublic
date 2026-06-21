"use client";

import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { api } from "@/lib/api/client";

type Status = "loading" | "success" | "error";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No unsubscribe token found in the URL.");
      return;
    }

    api
      .get<{ detail: string }>("/auth/unsubscribe/", { params: { token } })
      .then((r) => {
        setStatus("success");
        setMessage(r.data.detail);
      })
      .catch((err) => {
        setStatus("error");
        const detail =
          err?.response?.data?.detail ?? "This link is invalid or has expired.";
        setMessage(detail);
      });
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[1.5rem] border border-pine/10 bg-white p-8 shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
        {status === "loading" && (
          <p className="text-center text-sm text-ink/60 dark:text-white/50">Processing…</p>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle size={40} className="text-pine" />
            <h1 className="text-xl font-bold text-ink dark:text-white">You&apos;re unsubscribed</h1>
            <p className="text-sm leading-relaxed text-ink/65 dark:text-white/55">{message}</p>
            <p className="text-sm text-ink/55 dark:text-white/45">
              You can re-enable notifications anytime from your{" "}
              <Link
                href="/dashboard/profile"
                className="font-medium text-pine underline-offset-2 hover:underline"
              >
                profile settings
              </Link>
              .
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle size={40} className="text-red-400" />
            <h1 className="text-xl font-bold text-ink dark:text-white">Link not valid</h1>
            <p className="text-sm leading-relaxed text-ink/65 dark:text-white/55">{message}</p>
            <p className="text-sm text-ink/55 dark:text-white/45">
              Manage your notifications in your{" "}
              <Link
                href="/dashboard/profile"
                className="font-medium text-pine underline-offset-2 hover:underline"
              >
                profile settings
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
