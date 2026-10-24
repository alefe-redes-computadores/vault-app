import type { HealthInsightContext } from "@/lib/health-insights";

export type PlannedRealizedSummary={periodDays:number;planned:number;taken:number;ignored:number;unresolvedPast:number;future:number;documentedOutcomeRate:number|null;note:string};
const valid=(value?:string)=>Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value));
/** Counts only persisted dose events. It never invents expected doses from a medication schedule. */
export function buildPlannedRealizedSummary(context:HealthInsightContext,periodDays=30,today=context.hoje||new Date().toISOString().slice(0,10)):PlannedRealizedSummary{
  const start=new Date(`${today}T12:00:00Z`);start.setUTCDate(start.getUTCDate()-Math.max(1,periodDays)+1);const startDay=start.toISOString().slice(0,10);
  const planned=context.doseLogs.filter(d=>d.person_id===context.personId&&valid(d.data)&&d.data>=startDay&&(d.dose_kind==="scheduled"||d.dose_kind==="planned"||!d.dose_kind));
  const taken=planned.filter(d=>Boolean(d.tomado_em)).length,ignored=planned.filter(d=>!d.tomado_em&&Boolean(d.ignorado_em)).length;
  const unresolvedPast=planned.filter(d=>!d.tomado_em&&!d.ignorado_em&&d.data<today).length,future=planned.filter(d=>!d.tomado_em&&!d.ignorado_em&&d.data>=today).length;
  const outcomes=taken+ignored;
  return {periodDays,planned:planned.length,taken,ignored,unresolvedPast,future,documentedOutcomeRate:outcomes?Math.round(taken/outcomes*100):null,note:"Percentual considera somente eventos com desfecho explícito; ausência de registro não é classificada como dose perdida."};
}
