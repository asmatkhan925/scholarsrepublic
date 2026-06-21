import React from "react";
import { FileText } from "lucide-react";

import { BooleanField } from "../fields/BooleanField";
import { CommaField } from "../fields/CommaField";
import { TextField } from "../fields/TextField";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

const TODAY_DATE = new Date().toISOString().slice(0, 10);

function DocGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-pine">{label}</p>
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

export function DocumentsSection({ form, textField, booleanField, commaField }: SectionProps) {
  return (
    <ProfileSection
      id="profile-documents"
      description="Documents decide whether you can apply quickly when deadlines are near."
      icon={<FileText size={20} aria-hidden="true" />}
      title="Documents"
    >
      <div className="grid gap-3">
        <DocGroup label="Identity">
          <BooleanField label="CNIC" {...booleanField("has_cnic")} />
          <BooleanField label="Domicile" {...booleanField("has_domicile")} />
          <BooleanField label="Passport" {...booleanField("has_passport")} />
          {form.has_passport && (
            <TextField label="Passport expiry date" type="date" min={TODAY_DATE} {...textField("passport_expiry_date")} />
          )}
        </DocGroup>

        <DocGroup label="Academic">
          <BooleanField label="Transcript" {...booleanField("has_transcript")} />
          <BooleanField label="Degree" {...booleanField("has_degree")} />
          <BooleanField label="CV" {...booleanField("has_cv")} />
          <BooleanField label="SOP" {...booleanField("has_sop")} />
          <BooleanField label="Study plan" {...booleanField("has_study_plan")} />
          <BooleanField label="Research proposal" {...booleanField("has_research_proposal")} />
          <BooleanField label="Publications" {...booleanField("has_publications")} />
          <BooleanField label="Recommendation letters" {...booleanField("has_recommendation_letters")} />
          {form.has_recommendation_letters && (
            <TextField label="Number of letters" type="number" min={0} max={20} {...textField("recommendation_letters_count")} />
          )}
        </DocGroup>

        <DocGroup label="Language">
          <BooleanField label="English proficiency letter" {...booleanField("has_english_proficiency_letter")} />
        </DocGroup>

        <DocGroup label="Financial">
          <BooleanField label="Income certificate" {...booleanField("has_income_certificate")} />
          <BooleanField label="Bank statement" {...booleanField("has_bank_statement")} />
        </DocGroup>

        <DocGroup label="Other">
          <BooleanField label="Police clearance" {...booleanField("has_police_clearance")} />
          <BooleanField label="Medical certificate" {...booleanField("has_medical_certificate")} />
        </DocGroup>

        <CommaField
          label="Additional documents"
          helper="Add any extra documents you already have."
          {...commaField("additional_documents")}
        />
      </div>
    </ProfileSection>
  );
}
