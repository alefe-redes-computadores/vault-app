/** CI360 P6. No inferred relations: account + person + explicit medication IDs only. */
import type { Consulta, Medicamento } from "@/lib/types";

type OwnerP6 = Pick<Consulta,"user_id"|"person_id">;
type MedP6 = Pick<Medicamento,"id"|"user_id"|"person_id"|"nome"|"dosagem">;
export type ConsultationMedicationEvidenceP6 = Readonly<{
  id: string;
  nome: string;
  dosagem: string;
  source: "consultation_explicit";
}>;
export function safeConsultationMedicationIdsP6(
  selected: readonly string[] | null | undefined,
  owner: OwnerP6,
  medications: readonly MedP6[],
): string[] {
  if (!owner.user_id?.trim() || !owner.person_id?.trim()) return [];
  const allowed = new Set(medications.filter(m=>m.user_id===owner.user_id && m.person_id===owner.person_id && m.id).map(m=>m.id!));
  const out: string[]=[];
  for (const id of selected??[]) {
    if (typeof id!=="string" || !allowed.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length===64) break;
  }
  return out;
}
export function consultationMedicationEvidenceP6(
  consulta: Pick<Consulta,"user_id"|"person_id"|"medicamento_ids">,
  medications:readonly MedP6[],
): ConsultationMedicationEvidenceP6[] {
  const wanted = safeConsultationMedicationIdsP6(consulta.medicamento_ids,consulta,medications);
  const map=new Map(medications.map(m=>[m.id,m]));
  return wanted.map(id=>({id,nome:map.get(id)!.nome,dosagem:map.get(id)!.dosagem,source:"consultation_explicit" as const}));
}
export function consultationThreeVoicesP6(consulta: Pick<Consulta,"percepcao_paciente"|"orientacao_profissional"|"proximos_passos">) {
  const clean=(text?:string|null)=>typeof text==='string'?text.trim().slice(0,16000):"";
  return {
    personal:clean(consulta.percepcao_paciente),
    professional:clean(consulta.orientacao_profissional),
    followUp:clean(consulta.proximos_passos),
  };
}
/** A candidate is never persisted without explicit confirmation. */
export function proposedConsultationLinksP6(input:{
  suggestions:readonly string[]; accepted:readonly string[]; rejected:readonly string[];
  owner:OwnerP6;medications:readonly MedP6[]
}) {
  const valid=safeConsultationMedicationIdsP6(input.suggestions,input.owner,input.medications);
  const excluded=new Set(input.rejected);
  const already=new Set(input.accepted);
  return valid.filter(id=>!excluded.has(id)&&!already.has(id));
}
