"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/errors";

interface NotifPrefs {
  notify_weekly_digest: boolean;
  notify_deadline_reminder: boolean;
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const unsubscribedParam = searchParams?.get("unsubscribed");

  useEffect(() => {
    api
      .get<NotifPrefs>("/auth/notification-preferences/")
      .then((r) => setPrefs(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (unsubscribedParam && prefs !== null) {
      if (unsubscribedParam === "digest") {
        setPrefs((p) => (p ? { ...p, notify_weekly_digest: false } : p));
      } else if (unsubscribedParam === "reminder") {
        setPrefs((p) => (p ? { ...p, notify_deadline_reminder: false } : p));
      }
      setSaved(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsubscribedParam, prefs !== null]);

  async function handleToggle(field: keyof NotifPrefs) {
    if (!prefs) return;
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const result = await api.patch<NotifPrefs>("/auth/notification-preferences/", {
        [field]: updated[field],
      });
      setPrefs(result.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) return null;

  return (
    <div className="mt-3 border-t border-pine/10 pt-3 dark:border-white/10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45 dark:text-white/35">
        Email notifications
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <ToggleRow
          label="Weekly digest"
          description="Upcoming deadlines from your saved list, sent every Monday."
          checked={prefs.notify_weekly_digest}
          disabled={saving}
          onChange={() => handleToggle("notify_weekly_digest")}
        />
        <ToggleRow
          label="2-day deadline reminders"
          description="An email when a saved scholarship closes in 2 days."
          checked={prefs.notify_deadline_reminder}
          disabled={saving}
          onChange={() => handleToggle("notify_deadline_reminder")}
        />
      </div>
      {saved && (
        <p className="mt-2 text-xs font-medium text-pine">Notification preferences saved.</p>
      )}
      {error && (
        <p className="mt-2 text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-pine/8 bg-white p-3 hover:bg-pine/3 dark:border-white/8 dark:bg-white/4 dark:hover:bg-white/6">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2 disabled:opacity-50 ${
          checked ? "bg-pine" : "bg-slate-300 dark:bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink dark:text-white">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink/55 dark:text-white/45">{description}</p>
      </div>
    </label>
  );
}
