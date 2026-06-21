import { BriefcaseBusiness } from "lucide-react";

import { SPECIAL_SCHOLARSHIP_CATEGORIES } from "@/lib/profile-options";
import { BooleanField } from "../fields/BooleanField";
import { MultiCheckboxField } from "../fields/MultiCheckboxField";
import { TextField } from "../fields/TextField";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

export function FundingSection({ form, textField, booleanField, multiField }: SectionProps) {
  return (
    <ProfileSection
      id="profile-funding"
      description="Funding needs and alerts help us prioritize practical opportunities."
      icon={<BriefcaseBusiness size={20} aria-hidden="true" />}
      title="Funding and preferences"
    >
      <div className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <BooleanField label="I need need-based financial support" {...booleanField("need_based_support_required")} />
          <BooleanField label="I can pay application fee" {...booleanField("can_pay_application_fee")} />
          <BooleanField label="I can self-fund partially" {...booleanField("can_self_fund_partial")} />
        </div>

        <TextField label="Maximum application fee USD" type="number" min={0} max={10000} {...textField("max_application_fee_usd")} />

        <MultiCheckboxField
          label="Special scholarship categories"
          helper="Choose any category relevant to your applications."
          options={SPECIAL_SCHOLARSHIP_CATEGORIES}
          {...multiField("special_scholarship_categories")}
        />
      </div>
    </ProfileSection>
  );
}
