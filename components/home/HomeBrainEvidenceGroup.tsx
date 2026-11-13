"use client";

import { Activity, AlertCircle, ChevronRight, Pill } from "lucide-react";
import { useState } from "react";
import type { HealthInsight } from "@/lib/health-insights";
import { highestHomeBrainSeverity } from "@/lib/home/brain-evidence-groups";

type Props = {
  insights: HealthInsight[];
  onOpen: (insight: HealthInsight) => void;
};

/** Um cartão por medicamento, todas as observações e evidências continuam individuais. */
export function HomeBrainEvidenceGroup({ insights, onOpen }: Props) {
  const [expandedM143,setExpandedM143]=useState(false);
  if (insights.length < 2) return null;
  const primary = highestHomeBrainSeverity(insights);
  const firstTitle = insights[0].titulo || "Medicamento";
  const match = firstTitle.match(/^([^:]{1,72}):\s+/);
  // O título só dá nome ao grupo; o vínculo é sempre pelo entidadeId no agrupador.
  const medicationLabel = match?.[1] || "Medicamento";
  const severity = primary?.gravidadeSeguranca;
  const severe = severity === "critica" || severity === "importante";
  const border = severity === "critica" ? "border-red-400/35 bg-red-400/[0.055]" :
    severity === "importante" ? "border-coral/30 bg-coral/[0.04]" :
    severity === "atencao" ? "border-amber-400/25 bg-amber-400/[0.04]" :
    "border-violet-400/20 bg-violet-400/[0.035]";
  const tone = severity === "critica" ? "text-red-300" : severity === "importante" ? "text-coral" :
    severity === "atencao" ? "text-amber-300" : "text-violet-300";
  return (
    <section role="group" aria-label={`${medicationLabel}: ${insights.length} observações distintas do Brain`}
      className={`min-w-0 overflow-hidden rounded-[16px] border ${border}`}>
      <div className="flex min-w-0 items-center gap-2 border-b border-surface-border/30 px-3 py-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl bg-surface-raised/60 ${tone}`} aria-hidden="true">
          <Pill size={16}/>
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-[13px] text-ink-primary">{medicationLabel}</strong>
          <span className="text-[10px] text-ink-muted">{insights.length} observações distintas · mesmo medicamento</span>
        </span>
        <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold ${tone}`}>
          {severe ? <AlertCircle size={13} aria-hidden="true"/> : <Activity size={13} aria-hidden="true"/>}
          {severity === "critica" ? "Crítica" : severity === "importante" ? "Importante" : severity === "atencao" ? "Atenção" : "Análise"}
        </span>
      </div>
      <div className="divide-y divide-surface-border/25">
        {insights.map((insight, index) => {
          const title = insight.titulo.startsWith(`${medicationLabel}: `)
            ? insight.titulo.slice(medicationLabel.length + 2) : insight.titulo;
          const severityText = insight.gravidadeSeguranca === "critica" ? "Crítica" :
            insight.gravidadeSeguranca === "importante" ? "Importante" :
            insight.gravidadeSeguranca === "atencao" ? "Atenção" : "Observação";
          return (
            <button type="button" key={`${insight.id}:${index}`}
              onClick={() => onOpen(insight)}
              aria-label={`Abrir observação ${index + 1} de ${insights.length}: ${insight.titulo}. ${severityText}`}
              className={`${insights.length>3 && index>=2 && !expandedM143 ? 'hidden' : 'flex'} min-h-11 w-full min-w-0 items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised/50 active:bg-surface-raised motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300`}>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold leading-snug text-ink-primary">{title}</span>
                <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-ink-muted">{insight.mensagem}</span>
                <span className="mt-1 block text-[10px] text-ink-faint">{severityText} · confiança {insight.confianca} · amostra {insight.amostra}</span>
              </span>
              <ChevronRight size={14} className="mt-1 shrink-0 text-violet-300" aria-hidden="true"/>
            </button>
          );
        })}
      </div>
      {insights.length>3 && <button type="button" aria-expanded={expandedM143}
        onClick={()=>setExpandedM143(value=>!value)}
        className="min-h-11 w-full border-t border-surface-border/30 px-3 py-2 text-left text-xs font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
        {expandedM143 ? 'Recolher evidências adicionais' : `Ver mais ${insights.length-2} evidências deste medicamento`}
      </button>}
    </section>
  );
}
