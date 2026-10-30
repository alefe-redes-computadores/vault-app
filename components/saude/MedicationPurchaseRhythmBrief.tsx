"use client";

import { memo } from "react";
import { CalendarClock, ShieldCheck, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import type { Renovacao } from "@/lib/types";
import { analyzeMedicationPurchaseRhythm, analyzePurchaseRhythms } from "@/lib/health-intelligence/medication-purchase-rhythm";

const dateLabel=(value:string)=>value.split("-").reverse().join("/");

export const MedicationPurchaseRhythmBrief = memo(function MedicationPurchaseRhythmBrief({context,onNavigate}:{context:HealthInsightContext;onNavigate:(href:string)=>void}){
  const today=context.hoje??new Date().toISOString().slice(0,10);
  const rhythms=analyzePurchaseRhythms(context.renovacoes,context.medicamentos.map(item=>item.id).filter((id):id is string=>Boolean(id)),today);
  if(!rhythms.length)return null;
  const next=rhythms[0],med=context.medicamentos.find(item=>item.id===next.medicationId);
  const plannedCount=rhythms.filter(item=>Boolean(item.nextPlannedDate)).length;
  const suggestedOnly=rhythms.filter(item=>!item.nextPlannedDate&&Boolean(item.suggestedDate)).length;
  const nameFor=(id:string)=>context.medicamentos.find(item=>item.id===id)?.nome||"Medicamento";
  const rhythmLabel=(item:typeof next)=>item.nextPlannedDate?`Compra planejada para ${dateLabel(item.nextPlannedDate)}`:item.suggestedDate?`Janela sugerida: ${dateLabel(item.suggestedDate)}`:"Histórico em formação";
  return <section className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-2.5" aria-label="Ritmo de planejamento de aquisição">
    <div className="flex items-center gap-2"><CalendarClock size={14} className="text-cyan-200"/><strong className="min-w-0 flex-1 text-[11px] text-ink-primary">Ritmo de aquisição</strong><span className="text-[9px] text-ink-muted">{rhythms.length} acompanhado(s)</span></div>
    <p className="mt-1 text-[9px] text-ink-faint">{plannedCount} com compra futura registrada · {suggestedOnly} apenas com janela sugerida. Sugestões não criam compras.</p>
    <button type="button" onClick={()=>onNavigate(`/saude/medicamentos/detalhes?id=${encodeURIComponent(next.medicationId)}`)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg border border-surface-border/60 bg-surface-raised/50 px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label={`Abrir medicamento ${nameFor(next.medicationId)}`}><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-ink-primary">{med?.nome||"Medicamento"}</span><span className="block text-[10px] text-ink-muted">{rhythmLabel(next)}</span></span><ChevronRight size={14} className="shrink-0 text-cyan-200"/></button>
    {rhythms.length>1?<details className="mt-2 rounded-lg border border-surface-border/60"><summary className="flex min-h-11 cursor-pointer items-center px-2.5 text-[10px] font-semibold text-cyan-200 focus-visible:outline focus-visible:outline-2">Ver todos os {rhythms.length} medicamentos acompanhados</summary><div className="space-y-1 border-t border-surface-border/60 p-1.5">{rhythms.slice(1).map(item=><button key={item.medicationId} type="button" onClick={()=>onNavigate(`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicationId)}`)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-ink-primary">{nameFor(item.medicationId)}</span><span className="block text-[9px] text-ink-muted">{rhythmLabel(item)}</span></span><ChevronRight size={13}/></button>)}</div></details>:null}
    <p className="mt-2 flex items-center gap-1 text-[9px] text-ink-faint"><ShieldCheck size={11}/>Sugestão não confirma compra, gasto ou estoque.</p>
  </section>;
});

export function MedicationPurchaseRhythmCard({events,medicationId,todayISO}:{events:readonly Renovacao[];medicationId:string;todayISO:string}){
  const rhythm=analyzeMedicationPurchaseRhythm(events,medicationId,todayISO);
  if(!rhythm.typicalIntervalDays&&!rhythm.nextPlannedDate)return null;
  return <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.045] p-3" aria-label="Ritmo de planejamento de aquisição"><div className="flex items-center gap-2"><CalendarClock size={15} className="text-cyan-200"/><strong className="text-xs text-ink-primary">Ritmo de aquisição</strong></div>{rhythm.typicalIntervalDays?<p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Intervalo típico observado: <strong className="text-ink-primary">{rhythm.typicalIntervalDays} dias</strong>, com confiança {rhythm.confidence}. Próxima janela sugerida: <strong className="text-ink-primary">{dateLabel(rhythm.suggestedDate!)}</strong>.</p>:<p className="mt-2 text-[10px] text-ink-muted">Há planejamento futuro, mas o histórico realizado ainda não permite calcular um intervalo típico.</p>}{rhythm.nextPlannedDate?<p className="mt-1 text-[10px] text-amber-200">Compra já planejada para {dateLabel(rhythm.nextPlannedDate)}{rhythm.coveredByPlanning?" e compatível com a janela observada":""}.</p>:null}<p className="mt-2 flex items-start gap-1 text-[9px] leading-relaxed text-ink-faint"><ShieldCheck size={11} className="mt-0.5 shrink-0"/>Leitura do histórico. Não cria recorrência nem registra compra, gasto ou entrada no estoque.</p></div>;
}
