import type { StudentProfilePayload } from "@/types/profile";
import type { FieldName, ArrayField } from "../profile-constants";

export interface SectionProps {
  form: StudentProfilePayload;
  textField: (name: FieldName) => { value: StudentProfilePayload[FieldName]; onChange: (value: string) => void };
  booleanField: (name: FieldName) => { checked: boolean; onChange: (value: boolean) => void };
  multiField: (name: ArrayField) => { values: string[]; onToggle: (value: string) => void };
  commaField: (name: ArrayField) => { values: string[]; onChange: (value: string[]) => void };
  setField: <K extends FieldName>(name: K, value: StudentProfilePayload[K]) => void;
}
