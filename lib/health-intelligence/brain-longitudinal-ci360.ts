import {classifyDoseRealization} from '../dose-slot-authority';
/** CI360 P3 / B05.2+B05.4+B05.5: longitudinal, estritamente observacional.
 * Nao diagnostica, nao atribui causalidade, nao presume adesao ou falta de dose.
 * Leitura da pessoa e conta ativa; sem banco, escrita ou nova fonte de dados.
 */
import type { HealthInsightContext } from "@/lib/health-insights";

export type BrainLongitudinalPeriodCI360 = 7 | 30;
export type BrainAxisCI360 = "dor" | "humor" | "energia" | "apetite";
export type BrainAxisEvidenceCI360 = {
  axis: BrainAxisCI360;
  label: string;
  currentSamples: number;
  previousSamples: number;
  currentDays: number;
  previousDays: number;
  currentAverage: number | null;
  previousAverage: number | null;
  delta: number | null;
  comparison: "documented" | "insufficient";
};
export type BrainWindowEvidenceCI360 = {
  periodDays: BrainLongitudinalPeriodCI360;
  from: string;
  through: string;
  previousFrom: string;
  previousThrough: string;
  confirmedScheduled: number;
  confirmedSos: number;
  confirmedExtra: number;
  confirmedUnspecified: number;
  confirmedPlanned: number;
  explicitlyIgnored: number;
  plannedExcluded: number;
  conflictsExcluded: number;
  unverifiedClockExcluded: number;
  futureClockExcluded: number;
  pendingSync: number;
  confirmedDays: number;
  healthRecordDays: number;
  documentedDays: number;
  previousDocumentedDays: number;
  previousConfirmed: number;
  appointmentsRecorded: number;
  withdrawalsCompleted: number;
  withdrawalsOpen: number;
  axes: readonly BrainAxisEvidenceCI360[];
  daily: ReadonlyArray<{day:string; confirmed:number; sos:number; record:boolean}>;
};
export type BrainLongitudinalCI360 = {
  state: "ready" | "unavailable";
  reason: string | null;
  provenance: "active_person_local_snapshot";
  asOfISO: string;
  periods: ReadonlyArray<BrainWindowEvidenceCI360>;
  note: string;
};
const DAY=86_400_000;
const TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const AXES:ReadonlyArray<{key:BrainAxisCI360;label:string}>= [
  {key:"dor",label:"Dor"},{key:"humor",label:"Humor"},
  {key:"energia",label:"Energia"},{key:"apetite",label:"Apetite"},
];
function dayValue(value:unknown):value is string {
  if (typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+"T12:00:00Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function dayShift(value:string,offset:number):string {
  return new Date(Date.parse(value+"T12:00:00Z")+offset*DAY).toISOString().slice(0,10);
}
function instant(value:unknown):number|null {
  if (typeof value!=="string"||!TIMESTAMP.test(value))return null;
  const t=Date.parse(value);return Number.isFinite(t)?t:null;
}
function normalized(value:string):string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function axisOf(value:string):BrainAxisCI360|null {
  const text=` ${normalized(value)} `;
  return AXES.find(a=>text.includes(` ${a.key} `))?.key??null;
}
const average=(values:readonly number[])=>values.length?Math.round(values.reduce((s,v)=>s+v,0)/values.length*10)/10:null;
const empty=(asOfISO:string,reason:string):BrainLongitudinalCI360=>({
 state:"unavailable",reason,provenance:"active_person_local_snapshot",asOfISO,periods:[],
 note:"Sem dados suficientes nao significa ausência de sintomas, doses ou risco.",
});
/** Uma fotografia de dois pares de janelas 7/30 dias, comparáveis somente se amostra/temporalidade permitem. */
export function buildBrainLongitudinalCI360(context:HealthInsightContext|null|undefined,asOfISO:string):BrainLongitudinalCI360 {
 const now=instant(asOfISO);
 if (!context?.userId||!context.personId||!dayValue(context.hoje)||now===null)
   return empty(asOfISO,"Pessoa, dia clinico ou instante de referencia nao confirmados.");
 const userId=context.userId,personId=context.personId,day=context.hoje;
 const ids=new Set(context.medicamentos.filter(m=>m.user_id===userId&&m.person_id===personId&&m.id).map(m=>m.id!));
 const trackedLogs=context.doseLogs.filter(l=>l.user_id===userId&&l.person_id===personId&&l.id&&ids.has(l.medicamento_id));
 const seenLogs=new Set<string>();
 const logs=trackedLogs.filter(l=>{if(seenLogs.has(l.id!))return false;seenLogs.add(l.id!);return true;});
 const seenRecords=new Set<string>();
 const records=context.registrosSaude.filter(r=>r.user_id===userId&&r.person_id===personId&&r.id&&dayValue(r.data)).filter(r=>{
   if(seenRecords.has(r.id!))return false;seenRecords.add(r.id!);return true;
 });
 const appointments=context.consultas.filter(c=>c.user_id===userId&&c.person_id===personId&&c.id&&dayValue(c.data));
 const withdrawals=context.retiradas.filter(r=>r.user_id===userId&&r.person_id===personId&&r.id&&dayValue(r.data));
 const seenAppointments=new Set<string>(),seenWithdrawals=new Set<string>();
 const uniqueAppointments=appointments.filter(a=>{if(seenAppointments.has(a.id!))return false;seenAppointments.add(a.id!);return true;});
 const uniqueWithdrawals=withdrawals.filter(w=>{if(seenWithdrawals.has(w.id!))return false;seenWithdrawals.add(w.id!);return true;});
 function window(periodDays:BrainLongitudinalPeriodCI360):BrainWindowEvidenceCI360 {
  const from=dayShift(day,-periodDays+1),previousFrom=dayShift(day,-2*periodDays+1),previousThrough=dayShift(from,-1);
  const activeRecords=records.filter(r=>r.data>=from&&r.data<=day),pastRecords=records.filter(r=>r.data>=previousFrom&&r.data<=previousThrough);
  const currentRecordsDays=new Set(activeRecords.map(r=>r.data)),pastRecordDays=new Set(pastRecords.map(r=>r.data));
  const currentDoseDays=new Set<string>(),pastDoseDays=new Set<string>();
  const daily=new Map<string,{confirmed:number;sos:number}>();
  let scheduled=0,sos=0,extra=0,unspecified=0,confirmedPlanned=0,ignored=0,planned=0,conflict=0,unknownClock=0,futureClock=0,pendingSync=0,previousConfirmed=0;
  for (const log of logs) {
   const d=log.data;if(!dayValue(d))continue;
   const current=d>=from&&d<=day,prior=d>=previousFrom&&d<=previousThrough;
   if(!current&&!prior)continue;
   const evidence=classifyDoseRealization(log);
   if(evidence.state==='conflict'){if(current)conflict++;continue;}
   if(evidence.state==='unknown'){if(current)unknownClock++;continue;}
   if(evidence.state==='pending'){if(current&&log.dose_kind==='planned')planned++;continue;}
   const t=instant(evidence.confirmedAt);
   if(t===null){if(current)unknownClock++;continue;}
   if(t>now!){if(current)futureClock++;continue;}
   if(evidence.state==='ignored'){if(current){ignored++;currentDoseDays.add(d)}else pastDoseDays.add(d);continue;}
   if(prior){previousConfirmed++;pastDoseDays.add(d);continue;}
   currentDoseDays.add(d);
   const previous=daily.get(d)??{confirmed:0,sos:0};previous.confirmed++;
   if(log.dose_kind==="sos"){sos++;previous.sos++}
   else if(log.dose_kind==="extra")extra++;
   else if(log.dose_kind==="scheduled")scheduled++;
   else if(log.dose_kind==="planned")confirmedPlanned++;
   else unspecified++;
   daily.set(d,previous);
   if(log.synced===false)pendingSync++;
  }
  const axes:BrainAxisEvidenceCI360[]=AXES.map(axis=>{
   const samples=(source:typeof records)=>source.filter(r=>axisOf([r.registro_chave,r.tipo,r.nome].filter(Boolean).join(" "))===axis.key &&
     typeof r.valor_numerico==="number"&&Number.isFinite(r.valor_numerico)&&r.valor_numerico>=0&&r.valor_numerico<=10);
   const current=samples(activeRecords),previous=samples(pastRecords);
   const currentDays=new Set(current.map(r=>r.data)).size,previousDays=new Set(previous.map(r=>r.data)).size;
   const curr=average(current.map(r=>r.valor_numerico!)),prev=average(previous.map(r=>r.valor_numerico!));
   const comparable=current.length>=3&&previous.length>=3&&currentDays>=2&&previousDays>=2&&curr!==null&&prev!==null;
   return {axis:axis.key,label:axis.label,currentSamples:current.length,previousSamples:previous.length,
    currentDays,previousDays,currentAverage:curr,previousAverage:prev,
    delta:comparable?Math.round((curr!-prev!)*10)/10:null,comparison:comparable?"documented":"insufficient"};
  });
  const days=Array.from({length:periodDays},(_,i)=>{const date=dayShift(from,i),item=daily.get(date);return {day:date,confirmed:item?.confirmed??0,sos:item?.sos??0,record:currentRecordsDays.has(date)};});
  return {periodDays,from,through:day,previousFrom,previousThrough,
   confirmedScheduled:scheduled,confirmedSos:sos,confirmedExtra:extra,confirmedUnspecified:unspecified,confirmedPlanned,
   explicitlyIgnored:ignored,plannedExcluded:planned,conflictsExcluded:conflict,unverifiedClockExcluded:unknownClock,futureClockExcluded:futureClock,
   pendingSync,confirmedDays:currentDoseDays.size,healthRecordDays:currentRecordsDays.size,
   documentedDays:new Set([...currentDoseDays,...currentRecordsDays]).size,
   previousDocumentedDays:new Set([...pastDoseDays,...pastRecordDays]).size,
   previousConfirmed,
   appointmentsRecorded:uniqueAppointments.filter(a=>a.data>=from&&a.data<=day).length,
   withdrawalsCompleted:uniqueWithdrawals.filter(r=>r.data>=from&&r.data<=day&&r.status==="realizada").length,
   withdrawalsOpen:uniqueWithdrawals.filter(r=>r.data>=from&&r.data<=day&&r.status==="agendada"&&!r.realizada_em&&!r.renovacao_realizada_id).length,
   axes,daily:days};
 }
 return {state:"ready",reason:null,provenance:"active_person_local_snapshot",asOfISO,
   periods:[window(7),window(30)],
   note:"Doses confirmadas, eventos ignorados e agendamentos sao fatos diferentes. Comparações dos quatro eixos descrevem respostas registradas, nao piora, melhora clinica, adesao ou causalidade. Ausencia de registro significa desconhecido."};
}
