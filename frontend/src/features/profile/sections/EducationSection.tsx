import { GraduationCap } from "lucide-react";

import { EDUCATION_LEVELS, GRADING_SYSTEMS, RESULT_STATUSES } from "@/lib/profile-options";
import type { FieldCategoryMap } from "../profile-constants";
import { StudyFieldSelect } from "../fields/StudyFieldSelect";
import { SelectField } from "../fields/SelectField";
import { TextField } from "../fields/TextField";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

export function EducationSection({
  form,
  textField,
  setField,
  studyFieldCategories,
}: SectionProps & { studyFieldCategories: FieldCategoryMap }) {
  return (
    <ProfileSection
      id="profile-education"
      description="Education details are heavily used for scholarship eligibility and match scoring."
      icon={<GraduationCap size={20} aria-hidden="true" />}
      title="Education"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Current education level" options={EDUCATION_LEVELS} {...textField("current_education_level")} />
        <TextField label="Current institution" {...textField("current_institution")} />
        <StudyFieldSelect
          label="Current field of study"
          value={String(form.current_field_of_study || "")}
          fieldCategories={studyFieldCategories}
          onChange={(value) => setField("current_field_of_study", value)}
        />
        <TextField label="Graduation year" type="number" min={1900} max={2100} {...textField("graduation_year")} />
        <SelectField label="Result status" options={RESULT_STATUSES} {...textField("result_status")} />
        <SelectField label="Grading system" options={GRADING_SYSTEMS} {...textField("grading_system")} />
        <TextField label="CGPA" type="number" min={0} max={5} step="0.01" {...textField("cgpa")} />
        <TextField label="Percentage" type="number" min={0} max={100} step="0.01" {...textField("percentage")} />
        <TextField label="Division" {...textField("division")} />
      </div>
    </ProfileSection>
  );
}
