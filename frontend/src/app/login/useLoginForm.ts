"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { resendVerificationEmail } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { buildAuthPath, getSafeNextPath } from "@/lib/redirects";

export const verificationNotice =
  "Account created. Please check your email to verify your address before logging in. The email may take 1-2 minutes to arrive. Also check spam or promotions.";

const FRESH_EVENT_WINDOW_MS = 2 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resendStorageKey(email: string) {
  return `sr_verification_resend_until:${normalizeEmail(email)}`;
}

function verifiedStorageKey(email: string) {
  return `sr_email_verified:${normalizeEmail(email)}`;
}

function isFreshTimestamp(value: string | null) {
  const timestamp = value ? Number(value) : 0;
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= FRESH_EVENT_WINDOW_MS;
}

function clearAuthTabEvents(email: string) {
  if (!email.trim() || typeof window === "undefined") return;
  window.localStorage.removeItem(verifiedStorageKey(email));
}

function getStoredCooldownRemaining(email: string) {
  if (!email.trim()) return 0;
  const rawUntil = window.localStorage.getItem(resendStorageKey(email));
  const until = rawUntil ? Number(rawUntil) : 0;
  if (!Number.isFinite(until) || until <= Date.now()) return 0;
  return Math.ceil((until - Date.now()) / 1000);
}

function storeCooldown(email: string, seconds: number) {
  if (!email.trim() || seconds <= 0) return;
  window.localStorage.setItem(resendStorageKey(email), String(Date.now() + seconds * 1000));
}

function isVerificationError(message: string) {
  return message.toLowerCase().includes("verify your email");
}

export function useLoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"amber" | "emerald">("amber");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const registerHref = useMemo(() => buildAuthPath("/register", nextPath), [nextPath]);

  const startCooldown = useCallback((targetEmail: string, seconds: number) => {
    storeCooldown(targetEmail, seconds);
    setCooldownRemaining(seconds);
  }, []);

  const showVerifiedNotice = useCallback(() => {
    setShowResendVerification(false);
    setResendMessage(null);
    setResendError(null);
    setCooldownRemaining(0);
    setNotice("Email verified successfully. Please enter your password to continue.");
    setNoticeTone("emerald");
    setError(null);
  }, []);

  const redirectAfterLogin = useCallback(
    (role: string) => {
      const safeNextPath = getSafeNextPath(nextPath);
      const destination =
        safeNextPath !== "/dashboard"
          ? safeNextPath
          : role === "admin"
            ? "/dashboard/admin"
            : "/dashboard";
      router.replace(destination);
    },
    [nextPath, router],
  );

  // Initialise from URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get("email") ?? "";
    const registered = params.get("registered") === "1";
    const verified = params.get("verified") === "1";
    const reset = params.get("reset") === "1";
    const safeNextPath = getSafeNextPath(params.get("next"));

    setNextPath(safeNextPath);
    if (queryEmail) setEmail(queryEmail);
    setPassword("");

    if (registered) {
      if (queryEmail) clearAuthTabEvents(queryEmail);
      setNotice(verificationNotice);
      setNoticeTone("amber");
      setShowResendVerification(true);
      if (queryEmail) startCooldown(queryEmail, 60);
      return;
    }

    if (verified) {
      setNotice("Email verified successfully. Please enter your password to continue.");
      setNoticeTone("emerald");
      return;
    }

    if (reset) {
      setNotice("Password reset successfully. Please log in with your new password.");
      setNoticeTone("emerald");
    }
  }, [startCooldown]);

  // Tick the resend cooldown counter
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownRemaining(getStoredCooldownRemaining(email));
    }, 1000);
    setCooldownRemaining(getStoredCooldownRemaining(email));
    return () => window.clearInterval(timer);
  }, [email]);

  // Cross-tab email-verified notification via storage events and BroadcastChannel
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (!email.trim()) return;
      if (event.key === verifiedStorageKey(email) && isFreshTimestamp(event.newValue)) {
        showVerifiedNotice();
      }
    }

    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("sr_auth");
      channel.onmessage = (event) => {
        const eventEmail = String(event.data?.email ?? "");
        if (normalizeEmail(eventEmail) !== normalizeEmail(email)) return;
        if (event.data?.type === "email_verified") showVerifiedNotice();
      };
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [email, showVerifiedNotice]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setResendMessage(null);
    setResendError(null);
    setLoading(true);

    try {
      const response = await login({ email, password });
      redirectAfterLogin(response.user.role);
    } catch (authError) {
      const message = getErrorMessage(authError) ?? "Login failed. Please try again.";
      if (isVerificationError(message)) {
        setError("Please verify your email address before logging in.");
        setShowResendVerification(true);
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

    const remaining = getStoredCooldownRemaining(trimmedEmail);
    if (remaining > 0) {
      setCooldownRemaining(remaining);
      setResendError(`Please wait ${remaining}s before requesting another verification email.`);
      return;
    }

    setResendLoading(true);

    try {
      const response = await resendVerificationEmail({ email: trimmedEmail, next: nextPath });
      setResendMessage(response.detail);
      startCooldown(trimmedEmail, response.retry_after_seconds ?? 60);
    } catch (resendRequestError) {
      const retryAfterSeconds =
        (
          resendRequestError as {
            response?: { data?: { retry_after_seconds?: number } };
          }
        ).response?.data?.retry_after_seconds ?? 0;

      if (retryAfterSeconds > 0) startCooldown(trimmedEmail, retryAfterSeconds);

      setResendError(
        getErrorMessage(resendRequestError) ??
          "Verification email could not be sent. Please try again later.",
      );
    } finally {
      setResendLoading(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    error,
    notice,
    noticeTone,
    showResendVerification,
    resendMessage,
    resendError,
    resendLoading,
    cooldownRemaining,
    registerHref,
    handleSubmit,
    handleResendVerification,
  };
}
