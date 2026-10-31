"use client";

import { memo } from "react";
import { AlertCircle, Check } from "lucide-react";

type Props = {
  hours: readonly string[];
  taken: ReadonlySet<string>;
  ignored: ReadonlySet<string>;
};

/** Somente leitura: os conjuntos chegam da autoridade de slots da página. */
export const MedicationDoseHourChips = memo(function MedicationDoseHourChips({ hours, taken, ignored }: Props) {
  if (hours.length === 0) {
    return (
      <p className="border-t border-surface-border/50 pt-4 text-xs text-amber-400">
        Este medicamento está marcado como contínuo, mas não possui horários configurados.
      </p>
    );
  }
  return (
    <div className="border-t border-surface-border/50 pt-4">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-ink-muted">Horários configurados</p>
      <ul className="flex flex-wrap gap-2" aria-label="Estado dos horários configurados">
        {hours.map(horario => {
          const tomada = taken.has(horario);
          const ignorada = !tomada && ignored.has(horario);
          const label = tomada ? "tomada registrada" : ignorada ? "ignorada" : "sem confirmação";
          return (
            <li key={horario} aria-label={`${horario}: ${label}`} title={label}
              className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold ${tomada
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                : ignorada
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                  : "border-surface-border bg-surface-raised text-ink-muted"}`}>
              {tomada ? <Check size={11} aria-hidden="true" /> : ignorada ? <AlertCircle size={11} aria-hidden="true" /> : null}
              <span>{horario}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
