import { BookOpen } from "lucide-react";

import { COMMON_SKILLS } from "@/lib/profile-options";
import { BooleanField } from "../fields/BooleanField";
import { CommaField } from "../fields/CommaField";
import { MultiCheckboxField } from "../fields/MultiCheckboxField";
import { TextField } from "../fields/TextField";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

export function ResearchSection({ form, textField, booleanField, multiField, commaField }: SectionProps) {
  return (
    <ProfileSection
      id="profile-research"
      description="Research, skills, work, and links help for graduate and research scholarships."
      icon={<BookOpen size={20} aria-hidden="true" />}
      title="Research and experience"
    >
      <div className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <BooleanField label="Research experience" {...booleanField("has_research_experience")} />
          <BooleanField label="Supervisor acceptance" {...booleanField("has_supervisor_acceptance")} />
          <BooleanField label="Internship experience" {...booleanField("has_internship_experience")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Publications count" type="number" min={0} max={500} {...textField("publications_count")} />
          <TextField label="Supervisor country" {...textField("supervisor_country")} />
          <TextField label="Supervisor university" {...textField("supervisor_university")} />
          <TextField label="Work experience years" type="number" min={0} max={60} step="0.5" {...textField("work_experience_years")} />
          <TextField label="LinkedIn URL" type="text" inputMode="url" placeholder="linkedin.com/in/your-name" {...textField("linkedin_url")} />
          <TextField label="Portfolio URL" type="text" inputMode="url" placeholder="your-portfolio.com" {...textField("portfolio_url")} />
          <TextField label="GitHub URL" type="text" inputMode="url" placeholder="github.com/username" {...textField("github_url")} />
        </div>

        <CommaField label="Research interests" helper="Example: AI, public health, renewable energy" {...commaField("research_interests")} />

        <MultiCheckboxField
          label="Skills"
          helper="Select skills that strengthen your applications."
          options={COMMON_SKILLS}
          {...multiField("skills")}
        />
      </div>
    </ProfileSection>
  );
}
