import type { Document, Medicamento, Tratamento } from '@/lib/types';
import type { SupplyCycle, SupplyData, SupplyProcess } from './types';
import { validSupplyDate } from './rules';
import { isSupplyMedicationEligible } from './medication-eligibility';
import { preparationStart } from './overview';
export function treatmentSupplyMedicationIds(t:Tratamento, medications:Medicamento[],pid:string,uid:string) {
 if(!t.id||t.person_id!==pid||t.user_id!==uid)return [];
 return medications.filter(m=>m.id && m.person_id===pid && m.user_id===uid && isSupplyMedicationEligible(m) && ((t.medicamento_ids||[]).includes(m.id) || (m.tratamento_ids||[]).includes(t.id||''))).map(m=>m.id!);
}
export function cycleDocumentContext(process:SupplyProcess,cycle:SupplyCycle,data:SupplyData,documents:Document[]) {
 if(cycle.processo_id!==process.id||cycle.person_id!==process.person_id||cycle.user_id!==process.user_id)return {lmeLinked:0,lmeDelivered:0,confirmed:false,prepareRenewalFrom:null};
 const lme=data.documentos.filter(l=>l.tipo==='lme'&&l.ciclo_id===cycle.id&&l.processo_id===process.id&&l.person_id===process.person_id&&l.user_id===process.user_id&&documents.some(d=>d.id===l.document_id&&d.person_id===process.person_id&&d.user_id===process.user_id&&d.category_id==='saude'));
 const confirmed=cycle.status==='autorizado' && validSupplyDate(cycle.inicio) && validSupplyDate(cycle.fim) && cycle.fim>=cycle.inicio;
 return {lmeLinked:lme.length,lmeDelivered:lme.filter(l=>l.estado==='entregue').length,confirmed,prepareRenewalFrom:confirmed?preparationStart(cycle.fim!,process.antecedencia_dias):null};
}

export function matchesSupplyTreatment(t:Tratamento, medications:Medicamento[], medicationIds:Set<string>,pid:string,uid:string) {
 if(!t.id||t.person_id!==pid||t.user_id!==uid)return false;
 return (t.medicamento_ids||[]).some(id=>medicationIds.has(id)) || medications.some(m=>m.person_id===pid&&m.user_id===uid&&medicationIds.has(m.id||'')&&(m.tratamento_ids||[]).includes(t.id!));
}
