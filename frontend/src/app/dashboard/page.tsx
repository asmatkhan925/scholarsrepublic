import { DashboardShell } from "@/components/dashboard-shell";
import { PlaceholderPanel } from "@/components/placeholder-panel";

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Your scholarship workspace"
      description="Profile completion, recommendations, saved scholarships, applications, documents, and service requests will appear here as MVP modules are added."
    >
      <PlaceholderPanel
        title="Planned student modules"
        items={[
          "Profile completion",
          "Recommended scholarships",
          "Saved scholarships",
          "Application tracker",
          "Document checklist",
          "Service requests",
        ]}
      />
    </DashboardShell>
  );
}
