import {validDay,validHour,validInstant,type CenterRow,type Scope} from './center-view';
export const civilDoseInstant=(date:string,hour:string,asOf:string)=>{if(!validDay(date)||!validHour(hour)||!validInstant(asOf))throw Error('Data ou horário inválido.');const d=new Date(`${date}T${hour}:00`);if(!Number.isFinite(d.valueOf())||d.getFullYear()!==Number(date.slice(0,4))||d.getMonth()+1!==Number(date.slice(5,7))||d.getDate()!==Number(date.slice(8,10))||d.getHours()!==Number(hour.slice(0,2))||d.getMinutes()!==Number(hour.slice(3,5)))throw Error('Horário local inexistente.');const offset=d.getTimezoneOffset();const possibleOffsets=new Set([new Date(d.valueOf()-86400000).getTimezoneOffset(),new Date(d.valueOf()+86400000).getTimezoneOffset()]);for(const alternate of possibleOffsets){if(alternate===offset)continue;const other=new Date(d.valueOf()+(alternate-offset)*60000);if(other.getFullYear()===d.getFullYear()&&other.getMonth()===d.getMonth()&&other.getDate()===d.getDate()&&other.getHours()===d.getHours()&&other.getMinutes()===d.getMinutes())throw Error('Horário local ambíguo; confira o instante real.');}if(d.valueOf()>Date.parse(asOf))throw Error('Horário real não pode estar no futuro.');return d.toISOString();};
export type ReviewMode='scheduled'|'now'|'custom'|'ignored';
/** Draft intent only. The existing repository and clinical guards must revalidate it inside the write. */
export function buildReviewIntent(input:{scope:Scope;day:string;today:string;asOf:string;rows:readonly CenterRow[];mode:ReviewMode;customDay?:string;customHour?:string;reason?:string}){
  const {scope,day,today,asOf,rows,mode}=input;
  if(!scope.user_id||!scope.person_id||!validDay(day)||!validDay(today)||day>today||!validInstant(asOf)||!rows.length)throw Error('Contexto de revisão inválido.');
  if(!['scheduled','now','custom','ignored'].includes(mode))throw Error('Ação inválida.');
  if(mode==='now'&&day!==today)throw Error('Escolha uma data e hora reais para a revisão histórica.');
  if(mode==='ignored'&&rows.length!==1)throw Error('Revise individualmente a dose não tomada.');
  const seen=new Set<string>(),slots=new Set<string>();
  const civilInstant=(date:string,hour:string)=>civilDoseInstant(date,hour,asOf);
  const custom=mode==='custom'?civilInstant(input.customDay??'',input.customHour??''):null;
  const reason=input.reason?.trim();if(reason&&reason.length>500)throw Error('Motivo muito longo.');
  return rows.map(row=>{
    const slot=JSON.stringify([row.medication_id,row.day,row.hour]);
    if(row.user_id!==scope.user_id||row.person_id!==scope.person_id||row.day!==day||!row.key||!row.medication_id||!validHour(row.hour)||seen.has(row.key)||slots.has(slot))throw Error('Identidade ou escopo inválido.');
    seen.add(row.key);slots.add(slot);
    if(!row.routine||!['overdue','due_now','unconfirmed'].includes(row.status))throw Error('Dose requer revisão no fluxo existente.');
    if(rows.length>1&&(!row.eligible||!row.routine||row.stock!=='available'||day!==today||!['overdue','due_now'].includes(row.status)))throw Error('Lote contém dose não elegível.');
    if(mode==='ignored'){if(!['overdue','due_now','unconfirmed'].includes(row.status))throw Error('Revise a situação antes de ignorar.');civilInstant(day,row.hour);}
    return {key:row.key,medicationId:row.medication_id,day,hour:row.hour,status:mode==='ignored'?'ignored' as const:'taken' as const,actualAt:mode==='ignored'?null:mode==='scheduled'?civilInstant(day,row.hour):mode==='now'?new Date(asOf).toISOString():custom,reason:mode==='ignored'?reason??null:null};
  });
}
