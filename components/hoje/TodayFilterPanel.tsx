"use client";

import { useMemo } from "react";
import { useDismissibleDetails } from "@/hooks/useDismissibleDetails";
import { Check, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { FiltroPeriodo, FiltroStatus } from "@/hooks/useTodayPersistedFilters";

type AppointmentFilter = "todos" | "consultas" | "cirurgias" | "exames" | "retiradas";

type Props = {
  status: FiltroStatus;
  period: FiltroPeriodo;
  appointment: AppointmentFilter;
  showResolved: boolean;
  isToday: boolean;
  isPast: boolean;
  activeCount: number;
  onStatus: (value: FiltroStatus) => void;
  onPeriod: (value: FiltroPeriodo) => void;
  onAppointment: (value: AppointmentFilter) => void;
  onShowResolved: (value: boolean) => void;
  onReset: () => void;
};

const STATUS: Array<{ value: FiltroStatus; label: string }> = [
  { value: "todos", label: "Padrão" },
  { value: "pendentes", label: "Pendentes" },
  { value: "tomados", label: "Tomadas" },
  { value: "ignorados", label: "Ignoradas" },
];
const PERIOD: Array<{ value: FiltroPeriodo; label: string }> = [
  { value: "todos", label: "Dia inteiro" },
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];
const APPOINTMENTS: Array<{ value: AppointmentFilter; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "consultas", label: "Consultas" },
  { value: "cirurgias", label: "Cirurgias" },
  { value: "exames", label: "Exames" },
  { value: "retiradas", label: "Retiradas" },
];

/** M40: filtros de apresentação, nunca alteram estados clínicos ou persistência de doses. */
export function TodayFilterPanel({ status, period, appointment, showResolved, isToday, isPast,
  activeCount, onStatus, onPeriod, onAppointment, onShowResolved, onReset }: Props) {
  const detailsRef = useDismissibleDetails();
  const statusOptions = useMemo(() => STATUS.map(option => option.value === "pendentes"
    ? { ...option, label: isToday ? "Pendentes" : isPast ? "Sem confirmação" : "Previstas" }
    : option), [isToday, isPast]);

  const options = <T extends string,>(values: Array<{value: T; label: string}>, selected: T, select: (value: T) => void) => (
    <div className="flex flex-wrap gap-2">
      {values.map(option => {
        const active = option.value === selected;
        return <button key={option.value} type="button" aria-pressed={active}
          onClick={() => select(option.value)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${active ? "border-ice/45 bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised/50 text-ink-secondary"}`}>
          {active && <Check size={12} aria-hidden="true" />}{option.label}
        </button>;
      })}
    </div>
  );

  return <details ref={detailsRef} data-vault-today-filters className="group relative z-30 shrink-0">
    <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${activeCount ? "border-ice/45 bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised/60 text-ink-secondary"}`}
      aria-label={activeCount ? `Filtros, ${activeCount} ativo${activeCount === 1 ? "" : "s"}` : "Abrir filtros da linha do tempo"}>
      <SlidersHorizontal size={15} aria-hidden="true" />
      <span>Filtros</span>
      {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-ice/20 font-mono text-[10px] tabular-nums">{activeCount}</span>}
    </summary>
    <div className="absolute right-0 top-[calc(100%+8px)] z-40 max-h-[min(66dvh,460px)] w-[min(88vw,360px)] space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-surface-border bg-surface p-3.5 pb-[max(14px,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm font-semibold text-ink-primary">Personalizar visualização</strong>
        <button type="button" onClick={() => { onReset(); }} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><RotateCcw size={13} /> Limpar</button>
      </div>
      <fieldset className="space-y-2"><legend className="mb-1.5 text-[11px] font-semibold text-ink-secondary">Situação das doses</legend>{options(statusOptions, status, onStatus)}</fieldset>
      <fieldset className="space-y-2"><legend className="mb-1.5 text-[11px] font-semibold text-ink-secondary">Período</legend>{options(PERIOD, period, onPeriod)}</fieldset>
      <fieldset className="space-y-2"><legend className="mb-1.5 text-[11px] font-semibold text-ink-secondary">Compromissos</legend>{options(APPOINTMENTS, appointment, onAppointment)}</fieldset>
      {isToday && <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-surface-border/45 bg-surface-raised/40 p-2.5 text-[11px] font-semibold text-ink-secondary">
        <input type="checkbox" checked={showResolved} disabled={status !== "todos"} onChange={event => onShowResolved(event.target.checked)} className="size-4 accent-emerald-400" />
        Mostrar registros concluídos na visualização padrão
      </label>}
      <button type="button" aria-label="Fechar filtros" onClick={() => { if (detailsRef.current) { detailsRef.current.open = false; detailsRef.current.querySelector<HTMLElement>("summary")?.focus(); } }}
        className="min-h-11 w-full rounded-xl bg-ice/15 text-sm font-bold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Fechar filtros</button>
      <p className="text-xs leading-relaxed text-ink-muted">As escolhas são aplicadas imediatamente. Estes filtros não modificam registros ou planejamento.</p>
    </div>
  </details>;
}
