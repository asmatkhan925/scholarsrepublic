import { Target } from "lucide-react";

import {
  APPLICATION_FEE_PREFERENCES,
  FUNDING_PREFERENCES,
  LANGUAGE_INSTRUCTION_PREFERENCES,
  STUDY_MODE_PREFERENCES,
  TARGET_DEGREE_LEVELS,
} from "@/lib/profile-options";
import type { CountryRegionMap, FieldCategoryMap } from "../profile-constants";
import { CountryRegionPicker } from "../fields/CountryRegionPicker";
import { SelectField } from "../fields/SelectField";
import { StudyFieldMultiPicker } from "../fields/StudyFieldMultiPicker";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

export function TargetsSection({
  form,
  textField,
  setField,
  countryRegions,
  studyFieldCategories,
  preferredIntakeOptions,
}: SectionProps & {
  countryRegions: CountryRegionMap;
  studyFieldCategories: FieldCategoryMap;
  preferredIntakeOptions: string[];
}) {
  return (
    <ProfileSection
      id="profile-targets"
      description="Tell Scholars Republic what you want, so recommendations stay focused."
      icon={<Target size={20} aria-hidden="true" />}
      title="Scholarship targets"
    >
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Target degree level" options={TARGET_DEGREE_LEVELS} {...textField("target_degree_level")} />
          <SelectField label="Preferred intake" options={preferredIntakeOptions} {...textField("preferred_intake")} />
          <SelectField label="Study mode" options={STUDY_MODE_PREFERENCES} {...textField("study_mode_preference")} />
          <SelectField label="Funding preference" options={FUNDING_PREFERENCES} {...textField("funding_preference")} />
          <SelectField label="Application fee preference" options={APPLICATION_FEE_PREFERENCES} {...textField("application_fee_preference")} />
          <SelectField label="Language preference" options={LANGUAGE_INSTRUCTION_PREFERENCES} {...textField("language_instruction_preference")} />
        </div>

        <CountryRegionPicker
          label="Target countries"
          values={form.target_countries}
          countryRegions={countryRegions}
          onChange={(value) => setField("target_countries", value)}
        />

        <StudyFieldMultiPicker
          label="Target fields"
          values={form.target_fields}
          fieldCategories={studyFieldCategories}
          onChange={(value) => setField("target_fields", value)}
        />
      </div>
    </ProfileSection>
  );
}
