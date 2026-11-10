/**
 * VAULT M113 · Linhas do tempo e tendências observacionais, em memória.
 * Dados do snapshot já autenticado; zero I/O, zero notificações, zero diagnósticos.
 */
import type { HealthInsightContext } from "@/lib/health-insights";

export type M113EventKind = "medication" | "access" | "physical" | "emotional";
export type M113EvidenceKind = "documented_action" | "reported_state" | "planned_not_completed";
export type M113Event = {
  key: string;
  date: string;
  kind: M113EventKind;
  nature: M113EvidenceKind;
  label: string;
  sourceId: string;
};
export type M113ObservedTrend = {
  key: string;
  label: string;
  previous: number;
  recent: number;
  previousDays: number;
  recentDays: number;
  interpretation: "reported_intensity_increase_only";
};
export type M113Timeline = {
  events: M113Event[];
  trends: M113ObservedTrend[];
  recordedDays: number;
  today: string;
  limitations: readonly string[];
  readOnly: true;
};
const MS = 86400000;
const own = (row: {user_id?:string|null;person_id?:string|null}, ctx:HealthInsightContext) =>
  Boolean(ctx.userId && ctx.personId && row.user_id === ctx.userId && row.person_id === ctx.personId);
const day = (value?: string|null): number|null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y,m,d] = value.split("-").map(Number);
  const t=Date.UTC(y,m-1,d), check=new Date(t);
  return check.getUTCFullYear()===y && check.getUTCMonth()+1===m && check.getUTCDate()===d ? t : null;
};
const normal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g," ");
const clipped = (value: string, max=100) => value.replace(/[\r\n\t]/g," ").trim().slice(0,max);
const limitations = [
  "Eventos aparecem pela data informada nos registros; não representam toda a vida da pessoa.",
  "Dias sem registro não são dias sem sintomas ou sem medicamento.",
  "A ordem dos acontecimentos não demonstra causalidade, agravamento clínico ou risco de suicídio.",
  "Uma retirada agendada não comprova fornecimento; registros não definem dose segura ou conduta clínica.",
] as const;

/** Descritivo: pelo menos 2 dias diferentes e intensidade válida em cada metade de 14 dias. */
export function buildPatternTimelineM113(ctx: HealthInsightContext, today=ctx.hoje || "", limit=48): M113Timeline {
  const t=day(today);
  const empty=():M113Timeline=>({events:[],trends:[],recordedDays:0,today,limitations,readOnly:true});
  if (!ctx.userId || !ctx.personId || t===null) return empty();
  const from=t-29*MS, trendFrom=t-13*MS, previousEnd=t-7*MS;
  const inMonth=(x:string)=>{const stamp=day(x);return stamp!==null && stamp>=from && stamp<=t;};
  const medNames=new Map(ctx.medicamentos.filter(m=>own(m,ctx)&&m.id).map(m=>[m.id!,clipped(m.nome,65)]));
  const seen=new Set<string>(), collected:M113Event[]=[];
  const add=(event:M113Event)=>{
    if (seen.has(event.key)) return;
    seen.add(event.key);
    collected.push(event);
  };
  for(const d of ctx.doseLogs){
    if(!own(d,ctx)||!d.id||!medNames.has(d.medicamento_id)||!inMonth(d.data))continue;
    const taken=Boolean(d.tomado_em&&Number.isFinite(Date.parse(d.tomado_em)));
    const skipped=Boolean(d.ignorado_em&&Number.isFinite(Date.parse(d.ignorado_em)));
    if(taken===skipped || d.dose_kind==="planned")continue;
    const suffix=taken?(d.dose_kind==="extra"||d.dose_kind==="sos"?"dose SOS/extra registrada":"tomada registrada"):"dose explicitamente ignorada";
    add({key:`dose:${d.id}`,sourceId:d.id,date:d.data,kind:"medication",nature:"documented_action",label:`${medNames.get(d.medicamento_id)} · ${suffix}`});
  }
  for(const w of ctx.retiradas){
    if(!own(w,ctx)||!w.id||!medNames.has(w.medicamento_id)||!inMonth(w.data))continue;
    if(w.status!=="nao_realizada"&&w.status!=="realizada"&&w.status!=="agendada")continue;
    const status=w.status==="nao_realizada"?"retirada não realizada":w.status==="realizada"?"retirada registrada como realizada":"retirada agendada (não confirma recebimento)";
    add({key:`pickup:${w.id}`,sourceId:w.id,date:w.data,kind:"access",nature:w.status==="agendada"?"planned_not_completed":"documented_action",label:`${medNames.get(w.medicamento_id)} · ${status}`});
  }
  type Symptom = {label:string;date:string;intensity:number};
  const symptomGroups=new Map<string,Symptom[]>();
  for(const r of ctx.registrosSaude){
    if(!own(r,ctx)||!r.id||!inMonth(r.data))continue;
    const physical=r.categoria==="sintoma"||r.tipo==="sono";
    const emotional=r.categoria==="humor";
    if(!physical&&!emotional)continue;
    const label=clipped(r.nome||r.tipo||"Relato",90);
    add({key:`health:${r.id}`,sourceId:r.id,date:r.data,kind:emotional?"emotional":"physical",nature:"reported_state",label:`${label} · relato pessoal${typeof r.intensidade==="number"&&Number.isInteger(r.intensidade)&&r.intensidade>=0&&r.intensidade<=10?` (${r.intensidade}/10)`:""}`});
    if(r.categoria!=="sintoma"||typeof r.intensidade!=="number"||!Number.isInteger(r.intensidade)||r.intensidade<0||r.intensidade>10)continue;
    const key=normal(r.registro_chave||r.nome||r.tipo||"");
    if(!key)continue;
    const group=symptomGroups.get(key)||[];
    group.push({label,date:r.data,intensity:r.intensidade});symptomGroups.set(key,group);
  }
  const trends:M113ObservedTrend[]=[];
  for(const [key,items] of symptomGroups){
    // One recorded value per day. Latest event for the day wins; do not overcount.
    const distinct=new Map<string,Symptom>();
    for(const item of items) distinct.set(item.date,item);
    const before=[...distinct.values()].filter(r=>{const d=day(r.date)!;return d>=trendFrom&&d<previousEnd;});
    const after=[...distinct.values()].filter(r=>{const d=day(r.date)!;return d>=previousEnd&&d<=t;});
    if(before.length<2||after.length<2)continue;
    const avg=(rows:Symptom[])=>rows.reduce((n,r)=>n+r.intensity,0)/rows.length;
    const previous=avg(before),recent=avg(after);
    if(recent-previous<2)continue;
    trends.push({key,label:clipped(after[0].label,65),previous:Math.round(previous*10)/10,recent:Math.round(recent*10)/10,previousDays:before.length,recentDays:after.length,interpretation:"reported_intensity_increase_only"});
  }
  // Stable order, newest first; only verified events with source IDs.
  collected.sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key));
  const events=collected.slice(0,Math.max(1,Math.min(80,Math.trunc(limit)||48)));
  return {events,trends:trends.sort((a,b)=>b.recent-b.previous-(a.recent-a.previous)||a.key.localeCompare(b.key)).slice(0,4),recordedDays:new Set(collected.map(x=>x.date)).size,today,limitations,readOnly:true};
}
