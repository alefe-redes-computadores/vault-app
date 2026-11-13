/** Uma decisão operacional de APRESENTAÇÃO; motor clínico e dados originais intactos. */
import {isUsoSOSM144,type MedicationLikeM144} from './medicationNormalizers';
export type ActionKindM144='dose_agora'|'retirada_atrasada'|'estoque_revisar'|'receita_revisar'|'agendada_hoje'|'planejamento'|'em_dia';
export type ActionDetailM144={kind:'operacional'|'estoque'|'documental'|'brain'|'regulatorio';label:string};
export type ActionResolutionM144={primaryBadge:ActionKindM144;label:string;isAttention:boolean;isPlanning:boolean;secondaryDetails:ActionDetailM144[]};
export type DoseSlotM144={horario?:string|null;data?:string|null;tomado_em?:string|null;ignorado_em?:string|null;dose_kind?:string|null};
const timeOK=(value:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
/** Doses futuras não são vencidas. SOS somente pode ter slot EXPLICITAMENTE programado. */
export function medicineDueNowM144(med:MedicationLikeM144,doseLogs:readonly DoseSlotM144[],today:string,nowHHMM:string):{due:boolean;future:boolean}{
 if(med.status==='descontinuado'||!timeOK(nowHHMM))return {due:false,future:false};
 const sos=isUsoSOSM144(med), temporary=['temporario','ciclo_curto'].includes(String(med.tipo_uso||med.regime_uso||''));
 const eligible=(slot:DoseSlotM144)=>slot.data===today&&timeOK(String(slot.horario||''))&&!slot.tomado_em&&!slot.ignorado_em&&
  (sos?slot.dose_kind==='scheduled':temporary?slot.dose_kind==='planned'||slot.dose_kind==='scheduled':slot.dose_kind==='planned'||slot.dose_kind==='scheduled');
 const explicit=doseLogs.filter(eligible);
 const knownTimes=explicit.map(x=>String(x.horario));
 if(!sos&&!temporary){
  const hours=(med as MedicationLikeM144&{estoque_horarios?:string[]}).estoque_horarios||[];
  const resolved=new Set(doseLogs.filter(x=>x.data===today&&(x.tomado_em||x.ignorado_em)).map(x=>String(x.horario)));
  for(const h of hours)if(timeOK(h)&&!resolved.has(h))knownTimes.push(h);
 }
 return {due:knownTimes.some(h=>h<=nowHHMM),future:knownTimes.some(h=>h>nowHHMM)};
}
export function resolveMedicationActionM144(input:{medication:MedicationLikeM144;careStage?:string|null;doseNow?:boolean;futureDose?:boolean;regulatoryAlerts?:readonly string[];brainObservations?:readonly string[]}):ActionResolutionM144{
 const {medication:m,careStage:stage}=input;
 const details:ActionDetailM144[]=[...(input.regulatoryAlerts||[]).map(label=>({kind:'regulatorio' as const,label})),...(input.brainObservations||[]).map(label=>({kind:'brain' as const,label}))];
 const inactive=m.status==='descontinuado';
 let primaryBadge:ActionKindM144='em_dia';
 if(!inactive&&input.doseNow)primaryBadge='dose_agora';
 else if(!inactive&&stage==='withdrawal_overdue')primaryBadge='retirada_atrasada';
 else if(!inactive&&['acquisition_needed','stock_review'].includes(stage||''))primaryBadge='estoque_revisar';
 else if(!inactive&&stage==='prescription_needed')primaryBadge='receita_revisar';
 else if(!inactive&&['withdrawal_planned','acquisition_planned'].includes(stage||''))primaryBadge='planejamento';
 else if(!inactive&&input.futureDose)primaryBadge='agendada_hoje';
 const label:Record<ActionKindM144,string>={dose_agora:'Dose no horário',retirada_atrasada:'Retirada a revisar',estoque_revisar:'Estoque a revisar',receita_revisar:'Receita a revisar',agendada_hoje:'Agendada hoje',planejamento:'Planejamento',em_dia:inactive?'Fora da rotina':'Em dia'};
 return {primaryBadge,label:label[primaryBadge],isAttention:['dose_agora','retirada_atrasada','estoque_revisar','receita_revisar'].includes(primaryBadge),isPlanning:['agendada_hoje','planejamento'].includes(primaryBadge),secondaryDetails:details};
}
