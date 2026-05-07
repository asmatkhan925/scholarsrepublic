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
      description={`Welcome, ${user?.full_name ?? "Admin"}. Opportunity management is available in Django Admin; service request and blog management will be added next.`}
    >
      <PlaceholderPanel
        title="Opportunity management foundation is ready"
        items={[
          "Opportunity management is available in Django Admin for now",
          "Create scholarship opportunities with opportunity_type = scholarship",
          "Only published opportunities appear on public pages",
          "Service request review",
          "Blog publishing",
          "Custom admin opportunity UI will be built later",
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
