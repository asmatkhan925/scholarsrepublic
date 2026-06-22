"use client";

import {
  AlertTriangle,
  Bell,
  KeyRound,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { useTheme } from "@/components/theme-provider";
import { NotificationSettings } from "@/features/profile/NotificationSettings";
import { api } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/errors";

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-[1.5rem] border border-pine/10 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]"
    >
      <div className="flex items-start gap-3 border-b border-pine/10 px-5 py-4 dark:border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink dark:text-white">{title}</h2>
          <p className="text-xs leading-relaxed text-ink/55 dark:text-white/45">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr] sm:items-center">
      <label className="text-xs font-semibold text-ink/55 dark:text-white/45">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function ReadonlyField({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-pine/10 bg-[#f7faf8] px-3 py-2 text-sm text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      {value}
    </div>
  );
}

// ── Account section ──────────────────────────────────────────────────────────

function AccountSection() {
  const { user, refreshCurrentUser } = useAuth();
  const [name, setName] = useState(user?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.full_name ?? "");
  }, [user?.full_name]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.patch("/auth/me/", { full_name: name.trim() });
      await refreshCurrentUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const joinedDate = user
    ? new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(
        new Date(user.date_joined as string),
      )
    : "";

  return (
    <Section
      id="settings-account"
      icon={<User size={16} aria-hidden="true" />}
      title="Account"
      description="Your name and email address."
    >
      <form onSubmit={handleSaveName} className="space-y-3">
        <FieldRow label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-lg border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          />
        </FieldRow>
        <FieldRow label="Email">
          <ReadonlyField value={user?.email ?? ""} />
        </FieldRow>
        <FieldRow label="Member since">
          <ReadonlyField value={joinedDate} />
        </FieldRow>
        <FieldRow label="Role">
          <ReadonlyField value={user?.role === "student" ? "Student" : (user?.role ?? "")} />
        </FieldRow>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save name"}
          </button>
          {saved && <span className="text-xs font-semibold text-pine">Saved.</span>}
          {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
        </div>
      </form>
    </Section>
  );
}

// ── Security section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await api.post("/auth/change-password/", {
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      });
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      id="settings-security"
      icon={<KeyRound size={16} aria-hidden="true" />}
      title="Security"
      description="Change your password. You will stay logged in after a successful change."
    >
      <form ref={formRef} onSubmit={handleChangePassword} className="space-y-3">
        <FieldRow label="Current password">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            className="h-9 w-full rounded-lg border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          />
        </FieldRow>
        <FieldRow label="New password">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="h-9 w-full rounded-lg border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          />
        </FieldRow>
        <FieldRow label="Confirm new password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className="h-9 w-full rounded-lg border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          />
        </FieldRow>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:opacity-50"
          >
            {saving ? "Updating…" : "Change password"}
          </button>
          {success && (
            <span className="text-xs font-semibold text-pine">Password changed successfully.</span>
          )}
          {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
        </div>
      </form>
    </Section>
  );
}

// ── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Section
      id="settings-appearance"
      icon={theme === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      title="Appearance"
      description="Choose how the interface looks on this device."
    >
      <div className="flex flex-wrap gap-3">
        {(["light", "dark"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              theme === t
                ? "border-pine bg-pine text-white shadow-sm"
                : "border-pine/15 bg-[#f7faf8] text-ink/70 hover:border-pine/30 hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/20 dark:hover:text-white"
            }`}
          >
            {t === "light" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            {t === "light" ? "Light" : "Dark"}
            {theme === t && <span className="text-xs opacity-75">(active)</span>}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ── Notifications section ────────────────────────────────────────────────────

function NotificationsSection() {
  return (
    <Section
      id="settings-notifications"
      icon={<Bell size={16} aria-hidden="true" />}
      title="Notifications"
      description="Choose which emails Scholars Republic sends you. All emails include an unsubscribe link."
    >
      <div className="grid gap-4 sm:grid-cols-2 mb-4 text-sm">
        <div className="rounded-2xl border border-pine/8 bg-mint/15 p-3 dark:border-white/8 dark:bg-pine/10">
          <p className="font-semibold text-ink dark:text-white">Weekly digest</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/60 dark:text-white/55">
            Every Monday — upcoming deadlines from your saved list and new scholarships added.
          </p>
        </div>
        <div className="rounded-2xl border border-pine/8 bg-skyglass p-3 dark:border-white/8 dark:bg-white/5">
          <p className="font-semibold text-ink dark:text-white">Deadline reminders</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/60 dark:text-white/55">
            Sent 7 days and 2 days before a saved scholarship closes.
          </p>
        </div>
      </div>
      <NotificationSettings />
    </Section>
  );
}

// ── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete("/auth/me/", { data: { password } });
      router.push("/");
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <section
      id="settings-danger"
      className="scroll-mt-6 rounded-[1.5rem] border border-red-200/70 bg-white shadow-soft dark:border-red-400/20 dark:bg-[#181b1d]"
    >
      <div className="flex items-start gap-3 border-b border-red-100 px-5 py-4 dark:border-red-400/15">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
          <AlertTriangle size={16} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Danger zone</h2>
          <p className="text-xs leading-relaxed text-ink/55 dark:text-white/45">
            Permanent actions that cannot be undone.
          </p>
        </div>
      </div>
      <div className="p-5">
        {!open ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-white">Delete account</p>
              <p className="mt-0.5 text-xs text-ink/55 dark:text-white/45">
                Permanently delete your account, profile, saved scholarships, and all application
                data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Delete account
            </button>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Confirm deletion — enter your password to continue.
            </p>
            <p className="text-xs text-ink/55 dark:text-white/45">
              This will permanently delete your account, profile, saved scholarships, and all tracked
              applications. There is no recovery.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Your password"
              required
              className="h-9 w-full rounded-lg border border-red-200 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-red-400/20 dark:bg-[#101214] dark:text-white"
            />
            {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting || !password}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setPassword(""); setError(null); }}
                className="rounded-xl border border-pine/15 bg-[#f7faf8] px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-pine/30 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// ── Page jump nav ────────────────────────────────────────────────────────────

function JumpNav() {
  const items = [
    { label: "Account", href: "#settings-account" },
    { label: "Security", href: "#settings-security" },
    { label: "Appearance", href: "#settings-appearance" },
    { label: "Notifications", href: "#settings-notifications" },
    { label: "Danger zone", href: "#settings-danger" },
  ];
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          className="rounded-full border border-pine/12 bg-[#f7faf8] px-3 py-1 text-xs font-semibold text-ink/65 transition hover:border-pine/30 hover:text-pine dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:text-white"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

function SettingsContent() {
  return (
    <DashboardShell title="Settings" description="Manage your account and preferences." hideHeader>
      <div className="space-y-4">
        {/* Page header */}
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-4 py-4 dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Student dashboard
            </p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
              Settings
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink/65 dark:text-white/60">
              Manage your account, password, appearance, and notification preferences.
            </p>
          </div>
          <div className="border-t border-pine/10 bg-[#f7faf8] px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
            <JumpNav />
          </div>
        </section>

        <AccountSection />
        <SecuritySection />
        <AppearanceSection />
        <NotificationsSection />
        <DangerZone />
      </div>
    </DashboardShell>
  );
}

export function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
