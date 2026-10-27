"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, ChevronDown, ChevronRight, CloudOff, Pill } from "lucide-react";
import { db } from "@/lib/db";
import { buildDoseMonthMetrics } from "@/lib/health-intelligence/dose-month-metrics";
import type { DoseLog } from "@/lib/types";
import type { HealthInsightContext } from "@/lib/health-insights";
import { PlannedRealizedBrief } from "./PlannedRealizedBrief";
import { UpcomingDoseAgenda } from "./UpcomingDoseAgenda";

const ms=(value:string)=>Date.parse(`${value}T00:00:00.000Z`);
const periodStart=(today:string,days:number)=>new Date(ms(today)-(days-1)*86400000).toISOString().slice(0,10);

/** Zero extra DB subscriptions until the user expands the timeline. */
export function DoseMonthOverview({personId,userId,today,context,onNavigate}:{personId:string;userId:string;today:string;context?:HealthInsightContext|null;onNavigate?:(href:string)=>void}) {
 const [expanded,setExpanded]=useState(false);
 const router=useRouter();
 return <section className="overflow-hidden rounded-2xl border border-surface-border/70 bg-surface" aria-label="Linha do tempo das doses registradas">
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} className="flex min-h-12 w-full items-center gap-3 px-3 py-3 text-left">
   <CalendarDays size={18} className="shrink-0 text-emerald-300"/><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Histórico de doses</strong><span className="block text-[10px] text-ink-muted">Calendário de confirmações e registros · sem presumir doses perdidas</span></span>
   <ChevronDown size={16} className={`shrink-0 text-ink-muted transition-transform ${expanded?"rotate-180":""}`}/>
  </button>
  {expanded && <><div className="space-y-2 border-t border-surface-border/60 px-3 pt-3"><PlannedRealizedBrief context={context} onNavigate={onNavigate||((href)=>router.push(href))}/><UpcomingDoseAgenda context={context} onNavigate={onNavigate||((href)=>router.push(href))}/></div><DoseMonthBody personId={personId} userId={userId} today={today}/></>}
 </section>;
}
function DoseMonthBody({personId,userId,today}:{personId:string;userId:string;today:string}){
 const router=useRouter();
 const [period,setPeriod]=useState<7|30|90>(30);
 const start=useMemo(()=>periodStart(today,period),[today,period]);
 const data=useLiveQuery(async()=>{
  if(!userId||!personId)return {userId,personId,items:[] as DoseLog[]};
  const items=await db.doseLogs.where("[user_id+person_id+data]").between([userId,personId,start],[userId,personId,today],true,true).toArray();
  return {userId,personId,items};
 },[userId,personId,start,today]);
 const owned=data?.userId===userId&&data?.personId===personId;
 const result=useMemo(()=>buildDoseMonthMetrics({logs:owned?data?.items??[]:[],userId,personId,today,days:period}),[owned,data?.items,userId,personId,today,period]);
 return <div className="space-y-3 border-t border-surface-border/60 px-3 pb-3 pt-3">
  <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-ink-muted">Período registrado</p><div className="flex gap-1" role="group" aria-label="Período do histórico">{([7,30,90] as const).map(n=><button type="button" key={n} onClick={()=>setPeriod(n)} aria-pressed={period===n} className={`min-h-9 rounded-lg border px-2 text-[10px] font-semibold ${period===n?"border-emerald-300/40 bg-emerald-300/10 text-emerald-200":"border-surface-border text-ink-muted"}`}>{n}d</button>)}</div></div>
  {!owned?<p role="status" className="text-xs text-ink-muted">Carregando histórico local desta pessoa…</p>:<>
   <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-raised p-2"><strong className="block text-lg text-emerald-300">{result.total.taken}</strong><span className="text-[9px] text-ink-muted">Tomadas registradas</span></div><div className="rounded-xl bg-surface-raised p-2"><strong className="block text-lg text-amber-300">{result.total.ignored}</strong><span className="text-[9px] text-ink-muted">Ignoradas registradas</span></div><div className="rounded-xl bg-surface-raised p-2"><strong className="block text-lg text-ink-primary">{result.documentedDays}</strong><span className="text-[9px] text-ink-muted">Dias documentados</span></div></div>
   <div className="grid grid-cols-7 gap-1.5" aria-label={`${period} dias de registros de dose`}>
    {result.days.map(day=>{const count=day.taken+day.ignored+day.unconfirmed+day.conflicts+day.sos+day.extra;const tone=day.conflicts>0?"border-coral/40 bg-coral/10 text-coral":day.ignored>0?"border-amber-400/40 bg-amber-400/10 text-amber-200":day.taken>0?"border-emerald-400/30 bg-emerald-400/10 text-emerald-200":count>0?"border-surface-border bg-surface-raised text-ink-primary":"border-surface-border/30 text-ink-faint";return <button type="button" key={day.date} onClick={()=>router.push(`/hoje?data=${encodeURIComponent(day.date)}`)} title={`${day.date}: ${day.taken} tomadas, ${day.ignored} ignoradas, ${day.unconfirmed} sem confirmação registrada, ${day.conflicts} inconsistente(s), ${day.sos} SOS, ${day.extra} extras`} aria-label={`Abrir ${day.date}, ${count} registro(s)`} className={`relative flex min-h-10 items-center justify-center rounded-lg border text-[11px] font-semibold ${tone}`}>{day.date.slice(8)}{count>0&&<span className="absolute bottom-1 size-1 rounded-full bg-current"/>}</button>})}
   </div>
   <p className="text-[10px] leading-relaxed text-ink-muted">{result.total.unconfirmed} registro(s) explícito(s) sem confirmação · {result.total.conflicts} conflito(s) legados · {result.total.sos} SOS · {result.total.extra} extra(s). Dias sem registros não são classificados como falhas. Toque num dia para abrir a agenda.</p>
   {result.total.pendingSync>0&&<p className="flex items-center gap-1.5 text-[10px] text-amber-300"><CloudOff size={13}/>{result.total.pendingSync} registro(s) locais aguardando sincronização</p>}
   {result.decisions>0&&<p className="flex items-center gap-1.5 text-[10px] text-ink-muted"><Pill size={12}/>Entre {result.decisions} decisões de dose programada registradas: {result.takenOfDecisions}% tomadas. Não equivale à adesão total prescrita.</p>}
  </>}
  <button type="button" onClick={()=>router.push("/saude/medicamentos")} className="flex min-h-10 w-full items-center justify-between rounded-xl border border-surface-border px-3 text-xs text-ink-primary"><span>Ver medicamentos e estoque</span><ChevronRight size={15}/></button>
 </div>;
}
