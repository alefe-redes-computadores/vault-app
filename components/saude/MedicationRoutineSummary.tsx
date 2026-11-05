"use client";

import { memo } from "react";
import { Clock } from "lucide-react";
import { MedicationDoseHourChips } from "@/components/saude/MedicationDoseHourChips";

type LastDose = { date: string; time: string };

type Props = {
  sos: boolean;
  takenToday: number;
  todayQuantity: string;
  todayQuantityLabel: string;
  todayQuantityPartial: boolean;
  takenLast7Days: number;
  last7DaysQuantity: string;
  last7DaysQuantityPartial: boolean;
  resolvedToday: number;
  plannedToday: number;
  takenScheduledToday: number;
  ignoredScheduledToday: number;
  quantityPerDose: string | null;
  doseUnit: string;
  hours: readonly string[];
  takenHours: ReadonlySet<string>;
  ignoredHours: ReadonlySet<string>;
  lastDose: LastDose | null;
  hasStockControl: boolean;
};

/** P15 R6: exclusivamente apresentação. SOS não cria slot; ignorada não vira tomada. */
export const MedicationRoutineSummary = memo(function MedicationRoutineSummary(props: Props) {
  const {
    sos, takenToday, todayQuantity, todayQuantityLabel, todayQuantityPartial,
    takenLast7Days, last7DaysQuantity, last7DaysQuantityPartial,
    resolvedToday, plannedToday, takenScheduledToday, ignoredScheduledToday,
    quantityPerDose, doseUnit, hours, takenHours, ignoredHours, lastDose, hasStockControl,
  } = props;
  const plannedSafe = Number.isFinite(plannedToday) ? Math.max(0, plannedToday) : 0;
  const resolvedSafe = Number.isFinite(resolvedToday) ? Math.max(0, resolvedToday) : 0;
  const barNow = Math.min(resolvedSafe, plannedSafe);
  const visualPercent = plannedSafe > 0 ? Math.min(100, Math.round(100 * barNow / plannedSafe)) : 0;
  return (
    <div className="rounded-[18px] border border-surface-border/60 bg-surface p-3.5" aria-label={sos ? "Resumo de tomadas SOS registradas" : "Resumo da rotina programada"}>
      {sos ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl bg-surface-raised/60 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Tomadas hoje</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink-primary">{takenToday}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-surface-raised/60 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">{todayQuantityLabel}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink-primary">{todayQuantity}</p>
              {todayQuantityPartial && <p className="mt-0.5 text-[9px] text-amber-400">* existem tomadas sem quantidade registrada</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border/50 pt-4 text-xs">
            <span className="text-ink-muted">Últimos 7 dias</span>
            <span className="font-semibold tabular-nums text-ink-primary">
              {takenLast7Days} tomada{takenLast7Days === 1 ? "" : "s"} · {last7DaysQuantity} {doseUnit}
            </span>
          </div>
          {last7DaysQuantityPartial && (
            <p className="text-[9px] leading-relaxed text-ink-faint">
              A soma de quantidade é parcial porque nem todas as tomadas possuem quantidade registrada.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl bg-surface-raised/60 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Hoje</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink-primary">{resolvedToday}/{plannedToday}</p>
              <p className="mt-0.5 text-[10px] text-ink-muted">horários com desfecho registrado</p>
              {plannedSafe > 0 && <div className="mt-2" role="progressbar" aria-label="Horários programados resolvidos" aria-valuemin={0} aria-valuemax={plannedSafe} aria-valuenow={barNow} aria-valuetext={`${resolvedToday} de ${plannedToday} horários resolvidos`}>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-border/60"><div className="h-full rounded-full bg-ice transition-[width] motion-reduce:transition-none" style={{ width: `${visualPercent}%` }} /></div>
              </div>}
              {plannedToday > 0 && (
                <p className="mt-1 text-[9px] text-ink-faint">
                  {takenScheduledToday} tomada{takenScheduledToday === 1 ? "" : "s"} · {ignoredScheduledToday} ignorada{ignoredScheduledToday === 1 ? "" : "s"}
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-xl bg-surface-raised/60 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Por dose</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink-primary">{quantityPerDose ?? "—"}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{quantityPerDose !== null ? doseUnit : "quantidade não configurada"}</p>
            </div>
          </div>
          <MedicationDoseHourChips hours={hours} taken={takenHours} ignored={ignoredHours} />
        </div>
      )}
      {lastDose && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-surface-border/50 pt-3 text-[10px] text-ink-muted">
          <Clock size={11} className="text-ice" aria-hidden="true" />
          Última tomada registrada: <b className="text-ink-primary">{lastDose.date} às {lastDose.time}</b>
        </div>
      )}
      {!hasStockControl && (
        <p className="mt-2 text-center text-[9px] leading-relaxed text-ink-faint">
          A dose será registrada normalmente mesmo sem controle de estoque.
        </p>
      )}
    </div>
  );
});
