import type {Document,Medicamento,Retirada} from '@/lib/types';
import type {SupplyCycle,SupplyData,SupplyProcess} from './types';
import {validSupplyDate} from './rules';
export type SupplyCycleView='overview'|'documents'|'medications'|'withdrawals';
/** Facts from explicit owned links. No inferred authorization or pickup cadence. */
export function supplyCycleSummary(process:SupplyProcess,cycle:SupplyCycle,data:SupplyData,documents:Document[],medications:Medicamento[],withdrawals:Retirada[],personId:string) {
 if(!personId||process.person_id!==personId||cycle.person_id!==personId||cycle.user_id!==process.user_id||cycle.processo_id!==process.id)return null;
 const own=(r:{person_id?:string;user_id:string;processo_id:string;ciclo_id:string})=>r.person_id===personId&&r.user_id===process.user_id&&r.processo_id===process.id&&r.ciclo_id===cycle.id;
 const medicationIds=new Set(data.itens.filter(own).map(i=>i.medicamento_id));
 const unavailableMedications=[...medicationIds].filter(id=>!medications.some(m=>m.id===id&&m.person_id===personId&&m.user_id===process.user_id)).length;
 const links=data.documentos.filter(own);
 const availableDocuments=new Set(documents.filter(d=>d.person_id===personId&&d.user_id===process.user_id&&d.category_id==='saude').map(d=>d.id));
 const unavailableDocuments=links.filter(l=>!availableDocuments.has(l.document_id)).length;
 const related=withdrawals.filter(r=>r.person_id===personId&&r.user_id===process.user_id&&r.fornecimento_id===process.id&&r.fornecimento_ciclo_id===cycle.id);
 const scheduled=related.filter(r=>r.status==='agendada');
 const next=[...scheduled].filter(r=>validSupplyDate(r.data)).sort((a,b)=>a.data.localeCompare(b.data)||(a.id||'').localeCompare(b.id||''))[0]||null;
 return {medicationCount:medicationIds.size,unavailableMedications,documentCount:links.length,unavailableDocuments,withdrawalCount:related.length,scheduledCount:scheduled.length,next};
}
