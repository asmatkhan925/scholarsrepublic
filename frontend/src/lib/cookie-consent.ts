export const COOKIE_CONSENT_STORAGE_KEY = "sr_cookie_consent";
export const COOKIE_CONSENT_CHANGED_EVENT = "sr-cookie-consent-changed";

export type CookieConsentValue = "accepted" | "declined";
export type CookieConsentState = CookieConsentValue | null;

export function readCookieConsent(): CookieConsentState {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (raw === "accepted" || raw === "declined") {
      return raw;
    }
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }

  return null;
}

export function writeCookieConsent(value: CookieConsentValue) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
  } catch {
    // Keep the current page responsive even if persistence is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<CookieConsentValue>(COOKIE_CONSENT_CHANGED_EVENT, {
      detail: value,
    }),
  );
}
