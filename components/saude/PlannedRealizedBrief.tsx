"use client";

import { memo, useMemo } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildPlannedRealizedSummary } from "@/lib/health-intelligence/planned-realized";

export const PlannedRealizedBrief = memo(function PlannedRealizedBrief({context,onNavigate,compact=false}:{context:HealthInsightContext|null|undefined;onNavigate:(href:string)=>void;compact?:boolean}){
  const summary=useMemo(()=>context?buildPlannedRealizedSummary(context,30):null,[context]);
  if(!summary||summary.planned===0)return null;
  const attention=summary.unresolvedPast+summary.conflicts;
  return <div className={`rounded-xl border ${attention?"border-amber-400/25 bg-amber-400/[.055]":"border-surface-border/65 bg-surface-raised/35"} p-2.5`} aria-label="Planejado e realizado das doses">
    <div className="flex items-center gap-2"><CalendarClock size={14} className={attention?"text-amber-300":"text-emerald-300"}/><strong className="min-w-0 flex-1 text-[11px] text-ink-primary">Planejado × registrado</strong><span className="text-[9px] text-ink-muted">30 dias</span></div>
    <div className={`mt-2 grid ${compact?"grid-cols-3":"grid-cols-4"} gap-1.5 text-center`}>
      <Metric value={summary.taken} label="tomadas" tone="text-emerald-300"/>
      <Metric value={summary.todayPending} label="hoje" tone="text-ice"/>
      <Metric value={summary.unresolvedPast} label="sem desfecho" tone={summary.unresolvedPast?"text-amber-300":"text-ink-muted"}/>
      {!compact?<Metric value={summary.future} label="futuras" tone="text-violet-300"/>:null}
    </div>
    <details className="mt-2 rounded-lg border border-surface-border/60 px-2.5 py-1.5 text-[10px] text-ink-muted">
      <summary className="flex min-h-10 cursor-pointer items-center font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2">Entenda os números dos últimos 30 dias</summary>
      <p className="mt-1.5 leading-relaxed">Tomadas são doses confirmadas. Hoje mostra pendências que ainda precisam de decisão. Futuras são apenas programações: não entram como tomadas.</p>
      <p className="mt-1.5 leading-relaxed">Sem desfecho é ausência de confirmação no período anterior, não uma conclusão médica. Registros ignorados não contam como doses tomadas.</p>
      {summary.conflicts>0?<p className="mt-1.5 text-amber-200">{summary.conflicts} conflito(s) legado(s) exigem conferência no histórico.</p>:null}
    </details>
    <div className="mt-2 flex items-end gap-2"><p className="min-w-0 flex-1 text-[9px] leading-snug text-ink-muted">Sem desfecho significa sem confirmação registrada — não presume falha clínica.{summary.conflicts?` ${summary.conflicts} conflito(s) legado(s) isolado(s).`:""}</p><button type="button" onClick={()=>onNavigate("/saude/medicamentos/historico")} className="flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2">Histórico <ChevronRight size={12}/></button></div>
  </div>;
});
function Metric({value,label,tone}:{value:number;label:string;tone:string}){return <span className="rounded-lg bg-void/25 px-1 py-1.5"><strong className={`block text-sm tabular-nums ${tone}`}>{value}</strong><span className="block truncate text-[8px] text-ink-muted">{label}</span></span>}
