import type { Medicamento,Retirada } from "@/lib/types";
import type { SupplyData } from "./types";
import { isSupplyMedicationEligible } from "./medication-eligibility";
/** Suggestions only: no authorization, recurrence or stock is inferred. */
export function withdrawalSupplySuggestions(pid:string,meds:Medicamento[],withdrawals:Retirada[],data:SupplyData){
 const medications=new Map(meds.filter(m=>m.id&&m.person_id===pid&&isSupplyMedicationEligible(m)).map(m=>[m.id!,m]));
 const latest=new Map<string,Retirada>();
 for(const r of withdrawals){const med=medications.get(r.medicamento_id);
  if(!r.id||!med||r.person_id!==pid||r.user_id!==med.user_id||r.status==="cancelada"||r.status==="nao_realizada")continue;
  const old=latest.get(r.medicamento_id),stamp=r.updated_at||r.created_at||r.data;
  if(!old||stamp>(old.updated_at||old.created_at||old.data))latest.set(r.medicamento_id,r);
 }
 return [...latest.values()].map(withdrawal=>{
  const medication=medications.get(withdrawal.medicamento_id)!;
  const existing=data.processos.find(p=>p.person_id===pid&&p.user_id===withdrawal.user_id&&p.status==="ativo"&&data.itens.some(i=>i.person_id===pid&&i.user_id===withdrawal.user_id&&i.processo_id===p.id&&i.medicamento_id===medication.id));
  return {medication,withdrawal,existing};
 }).sort((a,b)=>a.medication.nome.localeCompare(b.medication.nome,"pt-BR"));
}
