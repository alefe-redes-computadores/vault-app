import type {Document,Medicamento,Renovacao,Retirada,Tratamento} from '@/lib/types';
import type {SupplyData} from '@/lib/health-supply/types';
import {buildDocumentMedicationIndex} from '@/lib/health-documents/relations';
/** Read-only projection. Names/dates never establish a clinical relationship. */
export function treatmentCareContext(treatment:Tratamento|null,medications:Medicamento[],documents:Document[],renewals:Renovacao[],withdrawals:Retirada[],supply:SupplyData,userId:string,personId:string) {
  const empty={medications:[] as Medicamento[],documents:[] as Document[],renewals:[] as Renovacao[],withdrawals:[] as Retirada[],processes:[] as SupplyData['processos']};
  if(!treatment?.id||!userId||!personId||treatment.user_id!==userId||treatment.person_id!==personId)return empty;
  const owned=(row:{user_id:string;person_id?:string|null})=>row.user_id===userId&&row.person_id===personId;
  // V228: vínculos explícitos em qualquer direção; mesma regra do dossiê V227.
  const meds=medications.filter(m=>m.id&&owned(m)&&(m.tratamento_ids?.includes(treatment.id!)||treatment.medicamento_ids?.includes(m.id!)));
  const medIds=new Set(meds.map(m=>m.id!));
  const acquisitions=renewals.filter(r=>owned(r)&&medIds.has(r.medicamento_id));
  const docs=documents.filter(d=>d.id&&owned(d)&&d.category_id==='saude');
  const index=buildDocumentMedicationIndex(docs,meds,acquisitions,personId,userId);
  const linkedDocs=docs.filter(d=>(d.entidade_tipo==='tratamento'&&d.entidade_id===treatment.id)||d.metadata?.tratamento_id===treatment.id||(index.get(d.id!)?.length||0)>0);
  const processById=new Map(supply.processos.filter(owned).map(p=>[p.id,p]));
  const cycles=new Map(supply.ciclos.filter(c=>owned(c)&&processById.has(c.processo_id)).map(c=>[c.id,c]));
  const processIds=new Set(supply.itens.filter(i=>owned(i)&&medIds.has(i.medicamento_id)&&processById.has(i.processo_id)&&cycles.get(i.ciclo_id)?.processo_id===i.processo_id).map(i=>i.processo_id));
  const byDate=(a:string|undefined|null,b:string|undefined|null)=>String(b||'').localeCompare(String(a||''));
  return {medications:meds,documents:linkedDocs.sort((a,b)=>byDate(a.created_at,b.created_at)),renewals:acquisitions.sort((a,b)=>byDate(a.data_aquisicao||a.data,b.data_aquisicao||b.data)),withdrawals:withdrawals.filter(w=>owned(w)&&medIds.has(w.medicamento_id)).sort((a,b)=>byDate(a.data,b.data)),processes:[...processIds].map(id=>processById.get(id)!).sort((a,b)=>a.titulo.localeCompare(b.titulo,'pt-BR'))};
}
