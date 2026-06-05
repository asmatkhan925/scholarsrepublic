"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/60">
        An unexpected error occurred in the admin panel.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-xl bg-pine px-4 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Try again
        </button>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 items-center rounded-xl border border-pine/15 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-mint/40"
        >
          Back to admin
        </Link>
      </div>
    </div>
  );
}
