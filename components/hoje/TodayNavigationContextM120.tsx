"use client";

import { ArrowUpLeft, CalendarClock, SlidersHorizontal } from "lucide-react";
import { todayContextLabelM120, type TodayStatusM120, type TodayPeriodM120 } from "@/lib/navigation/today-context-m120";

export function TodayNavigationContextM120({
  status, period, time, isPast, isFuture, origin, showContext, onBack, onOpenFilters,
}: {
  status: TodayStatusM120;
  period: TodayPeriodM120;
  time: string | null;
  isPast: boolean;
  isFuture: boolean;
  origin: string | null;
  showContext: boolean;
  onBack: () => void;
  onOpenFilters: () => void;
}) {
  if (!showContext) return null;
  const labels = todayContextLabelM120({ status, period, time, isPast, isFuture });
  return (
    <div role="status" aria-label="Contexto de navegação da linha do tempo" className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-ice/20 bg-ice/[0.045] px-3 py-2 text-[11px] text-ink-secondary">
      <CalendarClock size={15} className="shrink-0 text-ice" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-snug">{labels.length ? labels.join(" · ") : "Você está na linha do tempo do dia selecionado"}</span>
      <button type="button" onClick={onOpenFilters} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-surface-border/60 bg-surface/70 px-2 text-[11px] font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice" aria-label="Abrir filtros da linha do tempo">
        <SlidersHorizontal size={13} aria-hidden="true" /> Filtros
      </button>
      {origin && <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-ice underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <ArrowUpLeft size={13} aria-hidden="true" /> Voltar à origem
      </button>}
    </div>
  );
}
