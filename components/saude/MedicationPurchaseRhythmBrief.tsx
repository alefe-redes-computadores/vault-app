"use client";

import { CalendarClock, ShieldCheck } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import type { Renovacao } from "@/lib/types";
import { analyzeMedicationPurchaseRhythm, analyzePurchaseRhythms } from "@/lib/health-intelligence/medication-purchase-rhythm";

const dateLabel=(value:string)=>value.split("-").reverse().join("/");

export function MedicationPurchaseRhythmBrief({context,onNavigate}:{context:HealthInsightContext;onNavigate:(href:string)=>void}){
  const today=context.hoje??new Date().toISOString().slice(0,10);
  const rhythms=analyzePurchaseRhythms(context.renovacoes,context.medicamentos.map(item=>item.id).filter((id):id is string=>Boolean(id)),today);
  if(!rhythms.length)return null;
  const next=rhythms[0],med=context.medicamentos.find(item=>item.id===next.medicationId);
  return <button type="button" onClick={()=>onNavigate(`/saude/medicamentos/detalhes?id=${encodeURIComponent(next.medicationId)}`)} className="w-full rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-2.5 text-left" aria-label="Abrir ritmo de planejamento de aquisição"><div className="flex items-center gap-2"><CalendarClock size={14} className="text-cyan-200"/><strong className="min-w-0 flex-1 truncate text-[11px] text-ink-primary">Ritmo de aquisição</strong><span className="text-[9px] text-ink-muted">{rhythms.length} acompanhado(s)</span></div><p className="mt-1.5 truncate text-[10px] text-ink-muted">{med?.nome||"Medicamento"}: {next.nextPlannedDate?`planejado para ${dateLabel(next.nextPlannedDate)}`:next.suggestedDate?`janela sugerida em ${dateLabel(next.suggestedDate)}`:"histórico em formação"}</p><p className="mt-1 flex items-center gap-1 text-[9px] text-ink-faint"><ShieldCheck size={11}/>Sugestão não confirma compra, gasto ou estoque.</p></button>;
}

export function MedicationPurchaseRhythmCard({events,medicationId,todayISO}:{events:readonly Renovacao[];medicationId:string;todayISO:string}){
  const rhythm=analyzeMedicationPurchaseRhythm(events,medicationId,todayISO);
  if(!rhythm.typicalIntervalDays&&!rhythm.nextPlannedDate)return null;
  return <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.045] p-3" aria-label="Ritmo de planejamento de aquisição"><div className="flex items-center gap-2"><CalendarClock size={15} className="text-cyan-200"/><strong className="text-xs text-ink-primary">Ritmo de aquisição</strong></div>{rhythm.typicalIntervalDays?<p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Intervalo típico observado: <strong className="text-ink-primary">{rhythm.typicalIntervalDays} dias</strong>, com confiança {rhythm.confidence}. Próxima janela sugerida: <strong className="text-ink-primary">{dateLabel(rhythm.suggestedDate!)}</strong>.</p>:<p className="mt-2 text-[10px] text-ink-muted">Há planejamento futuro, mas o histórico realizado ainda não permite calcular um intervalo típico.</p>}{rhythm.nextPlannedDate?<p className="mt-1 text-[10px] text-amber-200">Compra já planejada para {dateLabel(rhythm.nextPlannedDate)}{rhythm.coveredByPlanning?" e compatível com a janela observada":""}.</p>:null}<p className="mt-2 flex items-start gap-1 text-[9px] leading-relaxed text-ink-faint"><ShieldCheck size={11} className="mt-0.5 shrink-0"/>Leitura do histórico. Não cria recorrência nem registra compra, gasto ou entrada no estoque.</p></div>;
}
