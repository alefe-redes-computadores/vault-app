"use client";
import { memo } from "react";
import { Activity, BrainCircuit, CalendarDays, ChevronRight, Database, Watch } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export const PersonalHealthOverview = memo(function PersonalHealthOverview({ command, onNavigate }: { command: CareCommandSnapshot | null | undefined; onNavigate:(href:string)=>void }) {
  if (!command) return null;
  const health=command.health, decision=command.decision;
  const coverageLabel=health.coverage==="recent"?"Cobertura recente":health.coverage==="limited"?"Cobertura parcial":"Sem cobertura recente";
  return <section aria-label="Resumo longitudinal da saúde" className="rounded-[20px] border border-emerald-300/15 bg-[linear-gradient(145deg,rgba(110,231,183,.055),rgba(8,12,19,.4))] p-3">
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><Activity size={17}/></span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-300">Visão longitudinal</p><h2 className="mt-0.5 text-sm font-bold text-ink-primary">{coverageLabel}</h2><p className="mt-1 text-[10px] text-ink-muted">{health.records7d} registros em 7 dias · {health.activeDays30d} dias com dados em 30 dias</p></div>{health.latestDate?<span className="rounded-lg border border-surface-border px-2 py-1 font-mono text-[9px] text-ink-muted">{health.latestDate.split("-").reverse().join("/")}</span>:null}</div>
    <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface/60 p-2"><CalendarDays size={13} className="mx-auto text-ice"/><strong className="mt-1 block text-sm text-ink-primary">{health.records30d}</strong><span className="text-[8px] text-ink-muted">Registros 30d</span></div><div className="rounded-xl bg-surface/60 p-2"><Database size={13} className="mx-auto text-violet-200"/><strong className="mt-1 block text-sm text-ink-primary">{health.metricsObserved}</strong><span className="text-[8px] text-ink-muted">Indicadores</span></div><div className="rounded-xl bg-surface/60 p-2"><Watch size={13} className="mx-auto text-emerald-200"/><strong className="mt-1 block text-sm text-ink-primary">{health.deviceRecords30d}</strong><span className="text-[8px] text-ink-muted">De aparelhos</span></div></div>
    {decision?.href?<button type="button" onClick={()=>onNavigate(decision.href)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-3 text-left"><BrainCircuit size={15} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1"><span className="block text-[8px] font-bold uppercase tracking-wider text-violet-200">Brain · foco atual</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{decision.title}</strong></span><ChevronRight size={14} className="text-ink-muted"/></button>:null}
    <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">{health.note}</p>
  </section>;
});
