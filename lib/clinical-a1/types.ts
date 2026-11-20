/** A1 / VAULT 360: events declared by a person. Not diagnoses or automatic prescriptions. */
export type A1Source = "relato_pessoal" | "orientacao_profissional" | "documento_revisado";
export type A1PhaseKind = "inicio" | "ajuste" | "pausa" | "retomada" | "conclusao";
export interface A1Record {
  id: string;
  user_id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced?: boolean;
}
export interface A1TreatmentPhase extends A1Record {
  tratamento_id: string;
  tipo: A1PhaseKind;
  data_efetiva: string;
  origem: A1Source;
  profissional_id: string | null;
  titulo: string;
  observacoes: string | null;
}
/** Explicit relation between two existing prescription-only renewal events. Never a stock event. */
export interface A1PrescriptionLink extends A1Record {
  medicamento_id: string;
  renovacao_anterior_id: string;
  renovacao_atual_id: string;
  tipo: "renovacao" | "substituicao";
  origem: A1Source;
  observacoes: string | null;
}
/** Dated location statement. Historical withdrawals never inherit the current location. */
export interface A1SupplyLocation extends A1Record {
  fornecimento_id: string;
  farmacia_id: string | null;
  local_id: string | null;
  inicio_vigencia: string;
  origem: A1Source;
  observacoes: string | null;
}
export type A1LedgerTable = "a1_treatment_phases" | "a1_prescription_links" | "a1_supply_locations";
export const A1_TABLES: readonly A1LedgerTable[] = ["a1_treatment_phases", "a1_prescription_links", "a1_supply_locations"];
export function validCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split("-").map(Number);
  const probe=new Date(Date.UTC(y,m-1,d));
  return probe.getUTCFullYear()===y && probe.getUTCMonth()===m-1 && probe.getUTCDate()===d;
}
export function a1Today(): string {
  const d=new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
export function a1DateBR(value: string): string {
  return validCivilDate(value) ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}` : "Não informada";
}
