"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileWarning, Gauge, ListChecks } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { getProfileCompletion } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ProfileCompletion } from "@/types/profile";

function StudentDashboardContent() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCompletion() {
      try {
        const data = await getProfileCompletion();
        if (mounted) {
          setCompletion(data);
        }
      } catch (requestError) {
        if (mounted) {
          setError(getErrorMessage(requestError));
        }
      }
    }

    void loadCompletion();

    return () => {
      mounted = false;
    };
  }, []);

  const completionPercent = completion?.completion_percentage ?? 0;
  const readinessScore = completion?.scholarship_readiness_score ?? 0;
  const readinessLevel = completion?.readiness_level ?? "Low";
  const missingFields = completion?.missing_profile_fields ?? [];
  const missingDocuments = completion?.missing_core_documents ?? [];

  return (
    <DashboardShell
      title={`Welcome, ${user?.full_name ?? "Student"}`}
      description="Your scholarship readiness profile helps Scholars Republic recommend better opportunities and show what documents you still need."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3 text-pine">
            <Gauge size={22} aria-hidden="true" />
            <h2 className="font-semibold text-ink">Profile completion</h2>
          </div>
          <p className="mt-5 text-4xl font-semibold text-ink">{completionPercent}%</p>
          <div className="mt-4 h-2 rounded bg-skyglass">
            <div className="h-2 rounded bg-pine" style={{ width: `${completionPercent}%` }} />
          </div>
        </section>

        <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3 text-pine">
            <ListChecks size={22} aria-hidden="true" />
            <h2 className="font-semibold text-ink">Scholarship readiness</h2>
          </div>
          <p className="mt-5 text-4xl font-semibold text-ink">
            {readinessScore}
            <span className="text-lg text-ink/55">/100</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-pine">{readinessLevel} readiness</p>
        </section>

        <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3 text-pine">
            <FileWarning size={22} aria-hidden="true" />
            <h2 className="font-semibold text-ink">Next best step</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/70">
            Add your education, target countries, documents, and consent to improve future
            scholarship recommendations.
          </p>
          <Link
            href="/dashboard/profile"
            className="mt-5 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            {completionPercent > 0 ? "Update Profile" : "Complete Profile"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>

      {error && (
        <p className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded border border-ink/10 bg-white p-5">
          <h2 className="font-semibold text-ink">Missing profile fields</h2>
          {missingFields.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm text-ink/70">
              {missingFields.slice(0, 8).map((item) => (
                <li key={item} className="rounded bg-skyglass px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink/70">Your key profile fields are complete.</p>
          )}
        </section>

        <section className="rounded border border-ink/10 bg-white p-5">
          <h2 className="font-semibold text-ink">Missing core documents</h2>
          {missingDocuments.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm text-ink/70">
              {missingDocuments.slice(0, 8).map((item) => (
                <li key={item} className="rounded bg-skyglass px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink/70">
              Your important application documents look ready.
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="font-semibold text-ink">Recommended Scholarships</h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            See scholarship opportunities ranked by your profile, documents, and preferences.
          </p>
          <Link
            href="/dashboard/recommendations"
            className="mt-5 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            View Recommendations
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="font-semibold text-ink">Saved Opportunities</h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            View scholarships and opportunities you saved for later.
          </p>
          <Link
            href="/dashboard/saved"
            className="mt-5 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            View Saved
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section className="rounded border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="font-semibold text-ink">Application Tracker</h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            Track preparation, applied, interview, and result status.
          </p>
          <Link
            href="/dashboard/applications"
            className="mt-5 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90"
          >
            View Applications
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentDashboardContent />
    </ProtectedRoute>
  );
}
