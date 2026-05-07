"use client";

import { ArrowRight } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";

function StudentDashboardContent() {
  const { user } = useAuth();

  return (
    <DashboardShell
      title={`Welcome, ${user?.full_name ?? "Student"}`}
      description="Your student dashboard is ready. Profile, recommendations, saved scholarships, and applications will be added next."
    >
      <section className="rounded border border-ink/10 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">
          Your student dashboard is ready.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
          Create your profile, personalized recommendations, saved
          opportunities, and application tracking will arrive in the next MVP
          phases.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white opacity-80"
        >
          Complete Profile Coming Soon
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <StudentDashboardContent />
    </ProtectedRoute>
  );
}
