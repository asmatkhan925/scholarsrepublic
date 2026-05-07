"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlaceholderPanel } from "@/components/placeholder-panel";

function AdminDashboardContent() {
  const { user } = useAuth();

  return (
    <DashboardShell
      mode="admin"
      title="Admin Dashboard"
      description={`Welcome, ${user?.full_name ?? "Admin"}. Scholarship, service request, and blog management will be added next.`}
    >
      <PlaceholderPanel
        title="Management areas coming next"
        items={[
          "Scholarship management",
          "Service request review",
          "Blog publishing",
          "Student account visibility",
          "Manual payment status",
          "Verification workflow",
        ]}
      />
    </DashboardShell>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
