import type { HealthInsightContext } from "@/lib/health-insights";

export type PlannedRealizedSummary={
  periodDays:number; planned:number; taken:number; ignored:number; unresolvedPast:number;
  todayPending:number; future:number; conflicts:number; excludedInvalid:number;
  documentedOutcomeRate:number|null; note:string;
};
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const TIME_RE=/^([01]\d|2[0-3]):[0-5]\d$/;
const DAY=86_400_000;
const dayAt=(day:string)=>Date.parse(`${day}T12:00:00.000Z`);
const moveDay=(day:string,offset:number)=>new Date(dayAt(day)+offset*DAY).toISOString().slice(0,10);

/** Unique persisted schedule slots only; never infers prescribed doses. */
export function buildPlannedRealizedSummary(context:HealthInsightContext,periodDays=30,today=context.hoje||new Date().toISOString().slice(0,10)):PlannedRealizedSummary{
  const length=Math.min(90,Math.max(1,Math.floor(periodDays)));
  const safeToday=DATE_RE.test(today)?today:new Date().toISOString().slice(0,10);
  const startDay=moveDay(safeToday,-length+1),futureEnd=moveDay(safeToday,length);
  const slots=new Map<string,HealthInsightContext["doseLogs"]>();
  let excludedInvalid=0;
  for(const row of context.doseLogs){
    if(row.person_id!==context.personId)continue;
    const kind=row.dose_kind||"scheduled";
    if(kind!=="scheduled"&&kind!=="planned")continue;
    if(!DATE_RE.test(row.data)||!TIME_RE.test(String(row.horario||"").slice(0,5))){excludedInvalid++;continue;}
    if(row.data<startDay||row.data>futureEnd)continue;
    const hour=String(row.horario).slice(0,5),key=`${row.medicamento_id}|${row.data}|${hour}`;
    const group=slots.get(key)||[];group.push(row);slots.set(key,group);
  }
  let taken=0,ignored=0,unresolvedPast=0,todayPending=0,future=0,conflicts=0;
  for(const group of slots.values()){
    const hasTaken=group.some(row=>Boolean(row.tomado_em));
    const hasIgnored=group.some(row=>Boolean(row.ignorado_em));
    const date=group[0].data;
    if(hasTaken&&hasIgnored){conflicts++;continue;}
    if(hasTaken){taken++;continue;}
    if(hasIgnored){ignored++;continue;}
    if(date<safeToday)unresolvedPast++;
    else if(date===safeToday)todayPending++;
    else future++;
  }
  const outcomes=taken+ignored;
  return {periodDays:length,planned:slots.size,taken,ignored,unresolvedPast,todayPending,future,conflicts,excludedInvalid,
    documentedOutcomeRate:outcomes?Math.round(taken/outcomes*100):null,
    note:"Percentual usa apenas desfechos explícitos. Sem registro não é dose perdida; pendências de hoje, passadas e futuras permanecem separadas."};
}
