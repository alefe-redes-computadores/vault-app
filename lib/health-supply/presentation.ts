import type { Renovacao, Retirada, Document, Medicamento } from "@/lib/types";
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
/** M142: Identity from persisted medication IDs; never infer by document title. */
export function supplyDocumentMedicationId(d: Document): string | null {
  if (d.entidade_tipo === 'medicamento' && typeof d.entidade_id === 'string' && d.entidade_id.trim()) return d.entidade_id.trim();
  const metaId = d.metadata?.medicamento_id;
  return typeof metaId === 'string' && metaId.trim() ? metaId.trim() : null;
}
function isOwnedSupplyDocument(d: Document, pid: string, uid: string): boolean {
  return Boolean(d.id && d.category_id === 'saude' && d.person_id === pid && d.user_id === uid);
}
/** Return ONLY medication-matched candidates. A different medication is never an option. */
/** Explicit persisted IDs only; matches Acervo relations without runtime alias imports. */
function supplyDocumentRelationsM143(rows:Document[],medications:Medicamento[],renewals:Renovacao[],pid:string,uid:string):Map<string,string[]> {
  const ownedDocs=rows.filter(d=>isOwnedSupplyDocument(d,pid,uid));
  const ownedMeds=medications.filter(m=>m.id&&m.person_id===pid&&m.user_id===uid);
  const allowed=new Set(ownedMeds.map(m=>m.id!));
  const indexed=new Map<string,Set<string>>(ownedDocs.map(d=>[d.id!,new Set<string>()]));
  const add=(docId:unknown,medId:unknown)=>{
    if(typeof docId!=="string"||typeof medId!=="string")return;
    const id=medId.trim();
    if(allowed.has(id))indexed.get(docId)?.add(id);
  };
  const ids=(value:unknown):string[]=>{
    if(Array.isArray(value))return value.slice(0,100).filter((x):x is string=>typeof x==='string');
    if(typeof value!=="string"||value.length>4096)return [];
    const v=value.trim();
    if(v.startsWith("[")){try{return ids(JSON.parse(v));}catch{return [];}}
    return v.split(/[,;]+/).slice(0,100);
  };
  const ownedRenewals=renewals.filter(r=>r.user_id===uid&&r.person_id===pid);
  const renewalById=new Map(ownedRenewals.filter(r=>r.id).map(r=>[r.id!,r]));
  for(const med of ownedMeds)add(med.document_id,med.id);
  for(const renewal of ownedRenewals)add(renewal.document_id,renewal.medicamento_id);
  for(const doc of ownedDocs){
    if(doc.entidade_tipo==='medicamento')add(doc.id,doc.entidade_id);
    if(doc.entidade_tipo==='renovacao')add(doc.id,renewalById.get(doc.entidade_id||'')?.medicamento_id);
    for(const field of ['medicamento_id','medication_id','medicamento_ids','medication_ids','linked_medicamento_ids'])
      for(const id of ids(doc.metadata?.[field]))add(doc.id,id);
  }
  return new Map<string,string[]>([...indexed].map(([id,medIds])=>[id,[...medIds]]));
}
export function prioritizedSupplyDocuments(
  rows: Document[], pid: string, uid: string, medicationIds: Set<string>,
  medications?: Medicamento[], renewals: Renovacao[] = []
): Document[] {
  // Reuse the exact explicit document/renewal/medication identity used by Acervo.
  // The legacy four-argument caller is kept for backwards-compatible contracts.
  const related = medications ? supplyDocumentRelationsM143(rows,medications,renewals,pid,uid) : null;
  return rows.filter(d => {
    if (!isOwnedSupplyDocument(d,pid,uid) || !medicationIds.size) return false;
    if (related) return (related.get(d.id || '') || []).some(id => medicationIds.has(id));
    const id = supplyDocumentMedicationId(d);
    return !!id && medicationIds.has(id);
  }).sort((a,b) => b.created_at.localeCompare(a.created_at) || a.title.localeCompare(b.title,'pt-BR'));
}
/** Explicit secondary review: unclassified health records are never mixed with matched candidates. */
export function unassignedSupplyDocuments(
  rows: Document[], pid: string, uid: string,
  medications?: Medicamento[], renewals: Renovacao[] = []
): Document[] {
  const related = medications ? supplyDocumentRelationsM143(rows,medications,renewals,pid,uid) : null;
  return rows.filter(d => isOwnedSupplyDocument(d,pid,uid) &&
    (related ? !(related.get(d.id || '') || []).length : !supplyDocumentMedicationId(d)))
    .sort((a,b) => b.created_at.localeCompare(a.created_at) || a.title.localeCompare(b.title,'pt-BR'));
}

export function monthlySupplyReference(amount:number, months:number) { return Number.isFinite(amount)&&amount>0&&Number.isInteger(months)&&months>0&&months<=24 ? amount/months : null; }
export function supplyDocumentLabel(d:Document) {
 const added=new Date(d.created_at);
 const date=Number.isFinite(added.getTime())?added.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'data de cadastro indisponível';
 const emitted=typeof d.metadata?.data_emissao==='string'?d.metadata.data_emissao:typeof d.metadata?.data_receita==='string'?d.metadata.data_receita:null;
 return `${d.title} · ${d.type==='receita'?'Receita':d.type==='lme'?'LME':d.type} · ${emitted?`Data informada: ${emitted}`:`Adicionado: ${date}`} · ${d.attachments?.length||0} anexo(s)`;
}

export function indexSupplyMedicationIds(pid:string,uid:string,processes:Array<{id:string;person_id:string;user_id:string}>,items:Array<{processo_id:string;medicamento_id:string;person_id:string;user_id:string}>) {
 const output=new Map<string,Set<string>>();if(!pid||!uid)return output;
 for(const process of processes)if(process.person_id===pid&&process.user_id===uid)output.set(process.id,new Set());
 for(const item of items)if(item.person_id===pid&&item.user_id===uid)output.get(item.processo_id)?.add(item.medicamento_id);
 return output;
}
