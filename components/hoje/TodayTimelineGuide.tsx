"use client";
import { Info } from "lucide-react";
import { useDismissibleDetails } from "@/hooks/useDismissibleDetails";

/** M40: a explicação não ocupa uma linha inteira antes da rotina. */
export function TodayTimelineGuide({ isHoje, isPassado, isFuturo }: { isHoje:boolean; isPassado:boolean; isFuturo:boolean }) {
  const detailsRef = useDismissibleDetails();
  const label = isFuturo ? "Como interpretar o planejamento" : isPassado ? "Como interpretar o histórico" : "Como interpretar a rotina";
  const note = isFuturo
    ? "Doses futuras são previsões. Ainda não foram tomadas, ignoradas ou retiradas do estoque."
    : isPassado
      ? "Falta de confirmação no histórico não significa uma dose ignorada. Revise o registro antes de concluir."
      : "Pendências mostram horários a revisar. Somente uma confirmação registra tomada; ignorar é uma ação diferente.";
  return <details ref={detailsRef} className="group relative z-30 shrink-0">
    <summary aria-label={label} title={label} className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-surface-border/50 bg-surface-raised/60 text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <Info size={16} aria-hidden="true" />
    </summary>
    <div role="note" className="absolute right-0 top-[calc(100%+8px)] z-40 max-h-[min(56dvh,300px)] w-[min(83vw,320px)] overflow-y-auto overscroll-contain rounded-xl border border-surface-border bg-surface p-3 text-[11px] leading-relaxed text-ink-secondary shadow-2xl">
      <strong className="mb-1 block text-xs text-ink-primary">{label}</strong>
      <p>{note}</p>
      {isFuturo && <p className="mt-2 text-amber-200">A previsão não altera estoque nem confirma tomada.</p>}
      {isPassado && <p className="mt-2 text-ice/80">Registros antigos podem exigir revisão manual.</p>}
    </div>
  </details>;
}
