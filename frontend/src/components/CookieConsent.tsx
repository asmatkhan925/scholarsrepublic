"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readCookieConsent, writeCookieConsent } from "@/lib/cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readCookieConsent() === null) {
      setVisible(true);
    }
  }, []);

  function accept() {
    writeCookieConsent("accepted");
    setVisible(false);
  }

  function decline() {
    writeCookieConsent("declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          Optional analytics and advertising scripts stay off unless you accept.{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-pine underline underline-offset-2 hover:text-pine/80"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={decline}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
