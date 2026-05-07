import { DashboardShell } from "@/components/dashboard-shell";
import { PlaceholderPanel } from "@/components/placeholder-panel";

export default function AdminPage() {
  return (
    <DashboardShell
      mode="admin"
      title="Admin control room"
      description="Django Admin is the first management surface. This custom dashboard will become useful after scholarships, services, users, and blog APIs are implemented."
    >
      <PlaceholderPanel
        title="Planned admin modules"
        items={[
          "Scholarship CRUD",
          "Student management",
          "Service request review",
          "Manual payment status",
          "Blog publishing",
          "Verification workflow",
        ]}
      />
    </DashboardShell>
  );
}
