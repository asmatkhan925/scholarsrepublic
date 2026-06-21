import { Languages } from "lucide-react";

import { BooleanField } from "../fields/BooleanField";
import { SelectField } from "../fields/SelectField";
import { TextField } from "../fields/TextField";
import { HSK_LEVELS } from "../profile-constants";
import { ProfileSection } from "../ProfileSection";
import type { SectionProps } from "./types";

export function TestsSection({ form, textField, booleanField }: SectionProps) {
  const hasAnyScore =
    form.has_ielts ||
    form.has_toefl ||
    form.has_duolingo ||
    form.has_pte ||
    form.has_hsk ||
    form.has_gre ||
    form.has_gmat;

  return (
    <ProfileSection
      id="profile-tests"
      description="Language tests and proficiency certificates can unlock more scholarship options."
      icon={<Languages size={20} aria-hidden="true" />}
      title="Language and tests"
    >
      <div className="grid gap-3">
        <div className="grid gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-pine">Tests and certificates</p>
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
            <BooleanField label="IELTS" {...booleanField("has_ielts")} />
            <BooleanField label="TOEFL" {...booleanField("has_toefl")} />
            <BooleanField label="Duolingo" {...booleanField("has_duolingo")} />
            <BooleanField label="PTE" {...booleanField("has_pte")} />
            <BooleanField label="HSK" {...booleanField("has_hsk")} />
            <BooleanField label="GRE" {...booleanField("has_gre")} />
            <BooleanField label="GMAT" {...booleanField("has_gmat")} />
            <BooleanField label="English proficiency certificate" {...booleanField("english_proficiency_certificate")} />
          </div>
        </div>

        {hasAnyScore && (
          <div className="grid gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-pine">Scores</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {form.has_ielts && <TextField label="IELTS score" type="number" min={0} max={9} step="0.5" {...textField("ielts_score")} />}
              {form.has_toefl && <TextField label="TOEFL score" type="number" min={0} max={120} {...textField("toefl_score")} />}
              {form.has_duolingo && <TextField label="Duolingo score" type="number" min={0} max={160} {...textField("duolingo_score")} />}
              {form.has_pte && <TextField label="PTE score" type="number" min={0} max={90} {...textField("pte_score")} />}
              {form.has_hsk && <SelectField label="HSK level" options={HSK_LEVELS} {...textField("hsk_level")} />}
              {form.has_gre && <TextField label="GRE score" type="number" min={0} max={340} {...textField("gre_score")} />}
              {form.has_gmat && <TextField label="GMAT score" type="number" min={0} max={800} {...textField("gmat_score")} />}
            </div>
          </div>
        )}
      </div>
    </ProfileSection>
  );
}
