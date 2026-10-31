"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

type Props = {
  label: string;
  isHoje: boolean;
  isPassado: boolean;
  isFuturo: boolean;
  description: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

/** P14 R4 — Navegação temporal visual, sem criar ou registrar doses. */
export const TodayDateNavigation = memo(function TodayDateNavigation({
  label, isHoje, isPassado, isFuturo, description, onPrevious, onNext, onToday,
}: Props) {
  return <div className="mt-2.5 space-y-2">
    <nav className="flex items-center gap-2" aria-label="Navegação entre dias">
      <button type="button" onClick={onPrevious} aria-label="Dia anterior"
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-surface-border/50 bg-surface-raised text-ink-muted transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <ChevronLeft size={17} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 rounded-xl border border-surface-border/40 bg-surface-raised/60 px-3 py-1.5 text-center">
        <span className="block text-[10px] font-semibold text-ink-primary">{label}</span>
        <span className="mt-0.5 block truncate font-mono text-[9px] text-ink-muted">{isHoje ? "Hoje" : description}</span>
      </div>
      <button type="button" onClick={onNext} aria-label="Próximo dia"
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-surface-border/50 bg-surface-raised text-ink-muted transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <ChevronRight size={17} aria-hidden="true" />
      </button>
      {!isHoje && <button type="button" onClick={onToday}
        className="min-h-10 shrink-0 rounded-xl border border-ice/25 bg-ice/10 px-3 text-[10px] font-bold text-ice active:scale-95">Hoje</button>}
    </nav>
    {!isHoje && <div className="flex items-start gap-2 rounded-xl border border-ice/15 bg-ice/[.045] px-3 py-2.5" role="note">
      <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-ice" />
      <p className="text-[10px] leading-snug text-ink-muted">
        {isPassado
          ? "Histórico: doses sem registro são projeções da rotina, não tomadas confirmadas ou faltas."
          : isFuturo
            ? "Planejamento futuro: doses previstas ainda não podem ser registradas como tomadas."
            : "Consulte os registros para confirmar o período."}
      </p>
    </div>}
  </div>;
});
