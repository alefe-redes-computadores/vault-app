"use client";

import { memo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";

type Props = {
  label: string;
  date: string;
  isHoje: boolean;
  isPassado: boolean;
  isFuturo: boolean;
  description: string;
  onPrevious: () => void;
  onNext: () => void;
  onSelectDate: (date: string) => void;
  onToday: () => void;
};

/** M40: um controle compacto de data, preservando toda a navegação histórica/futura. */
export const TodayDateNavigation = memo(function TodayDateNavigation({
  label, date, isHoje, isPassado, isFuturo, description,
  onPrevious, onNext, onSelectDate, onToday,
}: Props) {
  const temporalLabel = isHoje ? "Hoje" : isPassado ? "Histórico" : isFuturo ? "Planejado" : "Data";
  return <nav className="mt-2 flex min-w-0 items-center gap-2" aria-label="Navegar pela linha do tempo">
    <button type="button" onClick={onPrevious} aria-label="Dia anterior"
      className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/50 bg-surface-raised/60 text-ink-secondary active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <ChevronLeft size={18} aria-hidden="true" />
    </button>
    <label title={label} className="relative flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-surface-border/50 bg-surface-raised/55 px-2 text-ink-primary focus-within:outline focus-within:outline-2 focus-within:outline-ice">
      <CalendarDays size={16} className="shrink-0 text-ice" aria-hidden="true" />
      <span className="min-w-0 truncate text-xs font-semibold" aria-current={isHoje ? "date" : undefined} title={description}>{temporalLabel} · {description}</span>
      <input type="date" aria-label={label} value={date} onChange={event => { if (event.target.value) onSelectDate(event.target.value); }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </label>
    <button type="button" onClick={onNext} aria-label="Próximo dia"
      className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/50 bg-surface-raised/60 text-ink-secondary active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <ChevronRight size={18} aria-hidden="true" />
    </button>
    {!isHoje && <button type="button" onClick={onToday} aria-label="Voltar para hoje" title="Voltar para hoje"
      className="grid size-11 shrink-0 place-items-center rounded-xl border border-ice/35 bg-ice/10 text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <Undo2 size={17} aria-hidden="true" />
    </button>}
  </nav>;
});
