import type { Renovacao, Retirada, Document } from "@/lib/types";
import type { SupplyProcess } from "./types";

/** An explicit missing ID must never silently open a different health record. */
export function resolveProcessSelection(processes: SupplyProcess[], selected: string) {
  return selected ? processes.find(p => p.id === selected) : processes[0];
}

/** Only confirmed private purchases; prescriptions/free dispensations are not costs. */
export function purchaseHistory(rows: Renovacao[], pid: string, uid: string, ids: Set<string>) {
  return rows.filter(r => r.id && r.person_id === pid && r.user_id === uid && ids.has(r.medicamento_id) &&
    r.tipo_aquisicao === "comprado" && typeof r.preco === "number" && Number.isFinite(r.preco) && r.preco >= 0)
    .sort((a,b) => (b.data_aquisicao || b.data).localeCompare(a.data_aquisicao || a.data) || (a.id || "").localeCompare(b.id || ""));
}

/** Match by registered IDs and ownership, never medication names or inferred dates. */
export function compatibleCycleWithdrawals(rows: Retirada[], pid:string, uid:string, processId:string, cycleId:string, medicationIds:Set<string>) {
  return rows.filter(r=>r.id && r.person_id===pid && r.user_id===uid && medicationIds.has(r.medicamento_id) && (!r.fornecimento_id || r.fornecimento_id===processId) && (!r.fornecimento_ciclo_id || r.fornecimento_ciclo_id===cycleId)).sort((a,b)=>b.data.localeCompare(a.data));
}
export function documentMedicationId(ids:string[], withdrawalMedicationId?:string) {
  if (withdrawalMedicationId) return ids.includes(withdrawalMedicationId) ? withdrawalMedicationId : "";
  return ids.length===1 ? ids[0] : "";
}
export function prioritizedSupplyDocuments(rows:Document[],pid:string,uid:string,medicationIds:Set<string>) {
  const related=(d:Document)=>d.entidade_tipo==='medicamento' && medicationIds.has(d.entidade_id||'') || typeof d.metadata?.medicamento_id==='string' && medicationIds.has(d.metadata.medicamento_id);
  return rows.filter(d=>d.id && d.category_id==='saude' && d.person_id===pid && d.user_id===uid).sort((a,b)=>Number(related(b))-Number(related(a)) || a.title.localeCompare(b.title,'pt-BR'));
}

export function monthlySupplyReference(amount:number, months:number) { return Number.isFinite(amount)&&amount>0&&Number.isInteger(months)&&months>0&&months<=24 ? amount/months : null; }
export function supplyDocumentLabel(d:Document) {
 const added=new Date(d.created_at);
 const date=Number.isFinite(added.getTime())?added.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'data de cadastro indisponível';
 const emitted=typeof d.metadata?.data_emissao==='string'?d.metadata.data_emissao:typeof d.metadata?.data_receita==='string'?d.metadata.data_receita:null;
 return `${d.title} · ${d.type==='receita'?'Receita':d.type==='lme'?'LME':d.type} · ${emitted?`Data informada: ${emitted}`:`Adicionado: ${date}`} · ${d.attachments?.length||0} anexo(s)`;
}
