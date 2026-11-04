"use client";

import { TrendingUp } from "lucide-react";
import { useState } from "react";

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
  const [showOlder,setShowOlder]=useState(false);
  if (history.length === 0) return null;
  // Only recent changes mount immediately; old changes stay available by disclosure.
  const newestFirst = [...history].reverse();
  const recent = newestFirst.slice(0, 3);
  const older = newestFirst.slice(3);
  const historyRows = (items: typeof newestFirst, offset: number) => items.map((item,index)=>(
    <li key={`${item.data_mudanca}-${offset+index}`} className="relative pl-6 opacity-80">
      <span className="absolute -left-[9px] top-0 flex size-4 items-center justify-center rounded-full border-2 border-surface-border bg-surface" aria-hidden="true"><span className="size-1.5 rounded-full bg-surface-border"/></span>
      <p className="break-words text-sm font-semibold text-ink-primary">{formatDose(item.dosagem_antiga)}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">Alterado em {formatDay(item.data_mudanca)}{item.medico_responsavel ? ` · ${item.medico_responsavel}` : ""}</p>
    </li>
  ));
  return (
    <section className={`${className} space-y-3 [content-visibility:auto] [contain-intrinsic-size:250px]`} aria-label="Evolução da dosagem registrada">
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink-primary">
        <TrendingUp size={15} className="text-emerald-300" aria-hidden="true" />
        Evolução da Dosagem
      </h2>
      <p className="px-1 text-[11px] leading-relaxed text-ink-muted">{history.length} alteração(ões) de dosagem registrada(s). A linha abaixo apresenta o valor atual informado e os anteriores, sem avaliar resposta clínica.</p>
      <div className="rounded-[18px] border border-surface-border/60 bg-surface p-3.5">
        <ol className="relative ml-3 space-y-4 border-l-2 border-surface-border pb-1">
          <li className="relative pl-6">
            <span className="absolute -left-[9px] top-0 flex size-4 items-center justify-center rounded-full border-2 border-ice bg-surface" aria-hidden="true"><span className="size-1.5 rounded-full bg-ice"/></span>
            <p className="break-words text-sm font-bold text-ice">{formatDose(currentDose)} <span className="ml-1.5 text-[9px] font-normal uppercase text-ink-muted">Atual</span></p>
          </li>
          {historyRows(recent,0)}
        </ol>
        {older.length>0 && <details onToggle={event=>setShowOlder(event.currentTarget.open)} className="mt-3 rounded-xl border border-surface-border/50 px-3 py-2">
          <summary className="flex min-h-10 cursor-pointer items-center text-xs font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
            Ver {older.length} alteração(ões) mais antiga(s)
          </summary>
          {showOlder && <ol className="ml-3 space-y-5 border-l-2 border-surface-border pt-4 pb-1" aria-label="Dosagens antigas">
            {historyRows(older,3)}
          </ol>}
        </details>}
      </div>
    </section>
  );
}
