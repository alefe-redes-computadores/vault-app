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
  return <details aria-label={isHoje ? "Orientações de hoje" : "Orientações para data selecionada"} className="group mt-2 rounded-2xl border border-surface-border/60 bg-surface-raised/35 px-4 py-2.5 text-xs leading-relaxed text-ink-muted">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <Info size={13} className="shrink-0 text-emerald-300" aria-hidden="true"/>
      <span className="min-w-0 flex-1">{label}</span>
      <ChevronDown size={13} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true"/>
    </summary>
    <p className="pb-2 leading-relaxed">{note}</p>
    {isFuturo && <p className="pb-2 text-amber-200">A previsão não altera estoque e não confirma tomada.</p>}
    {isPassado && <p className="pb-2 text-ice/80">Registros antigos podem exigir revisão manual, sem preencher lacunas automaticamente.</p>}
  </details>;
}
