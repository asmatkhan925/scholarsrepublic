"use client";

import { Bell, CalendarClock, Mail, Newspaper } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { NotificationSettings } from "@/features/profile/NotificationSettings";

function NotificationsContent() {
  return (
    <DashboardShell
      title="Notification Preferences"
      description="Control which emails Scholars Republic sends you."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
          <div className="bg-gradient-to-r from-mint/75 via-white to-skyglass px-4 py-4 dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Student dashboard
            </p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink dark:text-white md:text-2xl">
              Notification Preferences
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink/65 dark:text-white/60">
              Choose which emails you receive. You can unsubscribe from individual email types at
              any time — all emails include an unsubscribe link.
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-pine/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3 rounded-2xl border border-pine/8 bg-mint/15 p-4 dark:border-white/8 dark:bg-pine/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
                <Newspaper size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink dark:text-white">Weekly digest</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink/60 dark:text-white/55">
                  Every Monday — upcoming deadlines from your saved list and new scholarships added
                  that week.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-pine/8 bg-skyglass p-4 dark:border-white/8 dark:bg-white/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
                <CalendarClock size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink dark:text-white">Deadline reminders</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink/60 dark:text-white/55">
                  Sent 7 days and 2 days before a saved scholarship closes — so you never miss a
                  deadline.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-pine/8 bg-[#f7faf8] p-4 dark:border-white/8 dark:bg-white/4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine text-white">
                <Mail size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink dark:text-white">Transactional</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink/60 dark:text-white/55">
                  Account emails like email verification and password resets. These cannot be
                  disabled.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-pine/10 pt-5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} className="text-pine" aria-hidden="true" />
              <p className="text-sm font-bold text-ink dark:text-white">Your preferences</p>
            </div>
            <NotificationSettings />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
