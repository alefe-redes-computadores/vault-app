"use client";
import { ChevronDown, Info } from "lucide-react";

/** Read-only help: never changes dose, stock, scheduling or status. */
export function TodayTimelineGuide({ isHoje, isPassado, isFuturo }: { isHoje:boolean; isPassado:boolean; isFuturo:boolean }) {
  const label = isFuturo ? "Como interpretar o planejamento" : isPassado ? "Como interpretar o histórico" : "Como interpretar a rotina";
  const note = isFuturo
    ? "Doses futuras são previsões. Ainda não foram tomadas, ignoradas ou retiradas do estoque."
    : isPassado
      ? "Falta de confirmação no histórico não significa uma dose ignorada. Revise o registro antes de concluir."
      : "Pendências mostram horários a revisar. Somente uma confirmação registra tomada; ignorar é uma ação diferente.";
  return <details aria-label={isHoje ? "Orientações de hoje" : "Orientações para data selecionada"} className="group mt-1 rounded-xl border border-surface-border/30 bg-surface/30 px-3 py-1.5 text-[10px] text-ink-muted">
    <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <Info size={13} className="shrink-0 text-ice" aria-hidden="true"/>
      <span className="min-w-0 flex-1">{label}</span>
      <ChevronDown size={13} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true"/>
    </summary>
    <p className="pb-2 leading-relaxed">{note}</p>
  </details>;
}
