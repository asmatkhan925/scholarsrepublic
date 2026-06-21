import { UserRound } from "lucide-react";

import { SelectField } from "../fields/SelectField";
import { TextField } from "../fields/TextField";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";
import { PROVINCES } from "@/lib/profile-options";

export function PersonalSection({ form, textField, countryOptions }: SectionProps & { countryOptions: string[] }) {
  const TODAY_DATE = new Date().toISOString().slice(0, 10);
  return (
    <ProfileSection
      id="profile-personal"
      description="Basic contact and location details help match country-specific scholarships."
      icon={<UserRound size={20} aria-hidden="true" />}
      title="Personal details"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="Phone number" type="tel" inputMode="tel" maxLength={20} {...textField("phone_number")} />
        <TextField label="WhatsApp number" type="tel" inputMode="tel" maxLength={20} {...textField("whatsapp_number")} />
        <TextField label="Date of birth" type="date" max={TODAY_DATE} {...textField("date_of_birth")} />
        <SelectField label="Nationality" options={countryOptions} {...textField("nationality")} />
        <SelectField label="Current country" options={countryOptions} {...textField("current_country")} />
        <TextField label="City" {...textField("city")} />
        <SelectField label="Province" options={PROVINCES} {...textField("province")} />
        <TextField label="Domicile" {...textField("domicile")} />
      </div>
    </ProfileSection>
  );
}
