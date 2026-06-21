import { Bell } from "lucide-react";

import { BooleanField } from "../fields/BooleanField";
import { NotificationSettings } from "../NotificationSettings";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

export function AlertsSection({ form, booleanField }: SectionProps) {
  return (
    <ProfileSection
      id="profile-consent"
      description="Control alerts and consent for using your profile to calculate scholarship matches."
      icon={<Bell size={20} aria-hidden="true" />}
      title="Alerts and consent"
    >
      <div className="grid gap-2 md:grid-cols-2">
        <BooleanField label="Email alerts enabled" {...booleanField("email_alerts_enabled")} />
        <BooleanField label="WhatsApp alerts enabled" {...booleanField("whatsapp_alerts_enabled")} />
        <BooleanField label="I agree to use this profile for scholarship matching" {...booleanField("profile_data_consent")} />
        <BooleanField label="AI autofill reviewed" {...booleanField("ai_autofill_reviewed")} />
      </div>
      <NotificationSettings />
    </ProfileSection>
  );
}
