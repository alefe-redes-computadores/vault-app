"use client";

import { TrendingUp } from "lucide-react";

type HistoricalDosage = {
  dosagem_antiga: string;
  data_mudanca: string;
  medico_responsavel?: string | null;
};

type Props = {
  className?: string;
  currentDose: string;
  history: readonly HistoricalDosage[];
  formatDose: (dose: string) => string;
  formatDay: (value?: string | null) => string;
};

/** P15 R1 — histórico visual sem escrita: nenhuma dose, estoque ou receita é criada aqui. */
export function MedicationDoseEvolutionTimeline({currentDose,history,formatDose,formatDay,className="vault-deferred"}:Props) {
  if (history.length === 0) return null;
  return (
    <section className={`${className} space-y-3 [content-visibility:auto] [contain-intrinsic-size:250px]`} aria-label="Evolução da dosagem registrada">
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink-primary">
        <TrendingUp size={15} className="text-ice" aria-hidden="true" />
        Evolução da Dosagem
      </h2>
      <div className="rounded-[20px] border border-surface-border/60 bg-surface p-4">
        <ol className="relative ml-3 space-y-6 border-l-2 border-surface-border pb-1">
          <li className="relative pl-6">
            <span className="absolute -left-[9px] top-0 flex size-4 items-center justify-center rounded-full border-2 border-ice bg-surface" aria-hidden="true"><span className="size-1.5 rounded-full bg-ice"/></span>
            <p className="text-sm font-bold text-ice">{formatDose(currentDose)} <span className="ml-1.5 text-[9px] font-normal uppercase text-ink-muted">Atual</span></p>
          </li>
          {[...history].reverse().map((item,index)=>(
            <li key={`${item.data_mudanca}-${index}`} className="relative pl-6 opacity-80">
              <span className="absolute -left-[9px] top-0 flex size-4 items-center justify-center rounded-full border-2 border-surface-border bg-surface" aria-hidden="true"><span className="size-1.5 rounded-full bg-surface-border"/></span>
              <p className="text-sm font-semibold text-ink-primary">{formatDose(item.dosagem_antiga)}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">Alterado em {formatDay(item.data_mudanca)}{item.medico_responsavel ? ` · ${item.medico_responsavel}` : ""}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
