"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import {
  COOKIE_CONSENT_CHANGED_EVENT,
  type CookieConsentState,
  type CookieConsentValue,
  readCookieConsent,
} from "@/lib/cookie-consent";

type ConsentScriptsProps = {
  adsenseClient?: string;
  gaMeasurementId?: string;
};

function isConsentValue(value: unknown): value is CookieConsentValue {
  return value === "accepted" || value === "declined";
}

export function ConsentScripts({
  adsenseClient,
  gaMeasurementId,
}: ConsentScriptsProps) {
  const [consent, setConsent] = useState<CookieConsentState>(null);

  useEffect(() => {
    setConsent(readCookieConsent());

    function handleConsentChange(event: Event) {
      const nextConsent =
        event instanceof CustomEvent && isConsentValue(event.detail)
          ? event.detail
          : readCookieConsent();
      setConsent(nextConsent);
    }

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChange);
    };
  }, []);

  if (consent !== "accepted") {
    return null;
  }

  return (
    <>
      {adsenseClient ? (
        <Script
          id="google-adsense-loader"
          strategy="afterInteractive"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          crossOrigin="anonymous"
        />
      ) : null}

      {gaMeasurementId ? (
        <>
          <Script
            id="google-analytics-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          />
          <Script id="google-analytics-config" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
