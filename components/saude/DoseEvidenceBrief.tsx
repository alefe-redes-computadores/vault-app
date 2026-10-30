"use client";

import { memo } from "react";
import { AlertOctagon, CheckCircle2, ChevronRight, Clock3, Pill } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildDoseMonthMetrics } from "@/lib/health-intelligence/dose-month-metrics";

export const DoseEvidenceBrief = memo(function DoseEvidenceBrief({context,onNavigate,compact=false}:{
  context:HealthInsightContext|null|undefined;
  onNavigate:(href:string)=>void;
  compact?:boolean;
}){
  if(!context?.userId||!context.personId||!context.hoje)return null;
  const result=buildDoseMonthMetrics({logs:context.doseLogs,userId:context.userId,personId:context.personId,today:context.hoje,days:30});
  const total=result.total.taken+result.total.ignored+result.total.unconfirmed+result.total.conflicts;
  if(!total&&!result.total.sos&&!result.total.extra)return null;
  const hasConflict=result.total.conflicts>0;
  return <button type="button" onClick={()=>onNavigate("/saude/medicamentos/historico")} className={`w-full rounded-2xl border text-left ${hasConflict?"border-amber-300/25 bg-amber-300/[.045]":"border-emerald-300/15 bg-emerald-300/[.035]"} ${compact?"p-3":"p-4"}`}>
    <span className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${hasConflict?"bg-amber-300/10 text-amber-300":"bg-emerald-300/10 text-emerald-300"}`}>{hasConflict?<AlertOctagon size={17}/>:<Pill size={17}/>}</span>
      <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Evidência de doses · 30 dias</strong><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{result.total.taken} tomada(s) · {result.total.ignored} não tomada(s) registrada(s) · {result.documentedDays} dia(s) documentado(s)</span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-ink-faint"><span className="inline-flex items-center gap-1"><CheckCircle2 size={10}/>{result.takenOfDecisions===null?"Sem percentual":`${result.takenOfDecisions}% dos desfechos explícitos`}</span>{result.total.unconfirmed>0?<span className="inline-flex items-center gap-1"><Clock3 size={10}/>{result.total.unconfirmed} sem desfecho</span>:null}{hasConflict?<span className="text-amber-300">{result.total.conflicts} conflito(s) para revisar</span>:null}{result.total.pendingSync>0?<span>{result.total.pendingSync} aguardando sincronização</span>:null}</span><span className="mt-1.5 block text-[8px] leading-relaxed text-ink-faint">Ausência de registro não é dose perdida. O percentual considera apenas decisões confirmadas.</span></span>
      <ChevronRight size={14} className="mt-2 shrink-0 text-ink-faint"/>
    </span>
  </button>;
});
