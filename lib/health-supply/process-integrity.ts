import type { Medicamento } from "@/lib/types";
import type { SupplyProcess,SupplyItem } from "./types";
export function findDuplicateSupplyProcess(personId:string,userId:string,input:Pick<SupplyProcess,"origem"|"farmacia_id"|"local_id">,ids:string[],processes:SupplyProcess[],items:SupplyItem[]){
 const wanted=[...new Set(ids)].sort();
 return processes.find(p=>p.person_id===personId&&p.user_id===userId&&p.status==="ativo"&&p.origem===input.origem&&(p.farmacia_id||null)===(input.farmacia_id||null)&&(p.local_id||null)===(input.local_id||null)&&(()=>{
  const existing=[...new Set(items.filter(i=>i.processo_id===p.id&&i.person_id===personId&&i.user_id===userId).map(i=>i.medicamento_id))].sort();
  return existing.length===wanted.length&&existing.every((id,index)=>id===wanted[index]);
 })());
}
export function prescriptionConfigurationReview(med:Pick<Medicamento,"tipo_receita">,requiresPrescription:boolean){
 return !requiresPrescription&&["amarela","azul","branca"].includes(med.tipo_receita||"");
}

/** Prevent a medication from belonging to two active supply processes. */
export function findActiveMedicationConflict(personId:string,userId:string,medicationIds:string[],processes:SupplyProcess[],items:SupplyItem[],exceptId?:string){
 const requested=new Set(medicationIds);
 return processes.find(p=>p.person_id===personId&&p.user_id===userId&&p.status==="ativo"&&p.id!==exceptId&&items.some(i=>i.person_id===personId&&i.user_id===userId&&i.processo_id===p.id&&requested.has(i.medicamento_id)));
}
