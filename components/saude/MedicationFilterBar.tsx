"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";

export type MedicationFilterValue =
  | "todos"
  | "atencao"
  | "continuos"
  | "temporarios"
  | "sos"
  | "controlados"
  | "encerrados";

const PRIMARY: ReadonlyArray<readonly [MedicationFilterValue, string]> = [
  ["todos", "Todos"],
  ["atencao", "Atenção"],
  ["sos", "SOS"],
];
const ADDITIONAL: ReadonlyArray<readonly [MedicationFilterValue, string]> = [
  ["continuos", "Contínuos"],
  ["temporarios", "Por período"],
  ["controlados", "Controlados"],
  ["encerrados", "Encerrados"],
];

/**
 * P15 R9 — Acessibilidade sem scroll horizontal ou dropdown cobrindo cards.
 * A seleção pertence à página; o disclosure só controla apresentação local.
 * Sem consultas remotas, sem armazenamento e sem nova autoridade de filtros.
 */
export function MedicationFilterBar({ value, onChange }: {
  value: MedicationFilterValue;
  onChange: (next: MedicationFilterValue) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const extra = ADDITIONAL.find(([key]) => key === value);
  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [expanded]);
  const choose = (next: MedicationFilterValue) => {
    onChange(next);
    setExpanded(false);
  };
  const controlClass = (selected: boolean, highlighted: boolean) =>
    `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-colors active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transform-none ${
      selected ? highlighted
        ? "border-amber-300/35 bg-amber-300/[.10] text-amber-200"
        : "border-emerald-300/30 bg-emerald-300/[.10] text-emerald-200"
        : "border-surface-border/50 bg-surface-raised/35 text-ink-muted"
    }`;
  return (
    <section className="border-b border-surface-border/25 px-4 py-2.5" aria-label="Filtros de medicamentos">
      <div className="flex min-w-0 items-center gap-1.5">
        {PRIMARY.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={value === key}
            onClick={() => choose(key)}
            className={`${controlClass(value === key, key === "atencao")} min-w-0 flex-1`}>
            {label}
          </button>
        ))}
        <button type="button" aria-expanded={expanded} aria-controls="medication-more-filters"
          onClick={() => setExpanded(previous => !previous)}
          className={`${controlClass(Boolean(extra), false)} max-w-[44%] shrink-0 px-2.5`}
          title={extra ? `Filtro atual: ${extra[1]}` : "Mostrar mais filtros"}>
          <SlidersHorizontal size={14} aria-hidden="true"/>
          <span className="max-w-[7rem] truncate">{extra ? extra[1] : "Mais"}</span>
          <ChevronDown size={13} aria-hidden="true" className={expanded ? "rotate-180" : ""}/>
        </button>
      </div>
      {expanded && (
        <div id="medication-more-filters" ref={panelRef}
          className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-surface-border/35 bg-surface-raised/30 p-2"
          aria-label="Categorias adicionais">
          {ADDITIONAL.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={value === key}
              onClick={() => choose(key)}
              className={`${controlClass(value === key, false)} justify-between text-left`}>
              <span>{label}</span>{value === key && <Check size={14} aria-hidden="true"/>}
            </button>
          ))}
        </div>
      )}
      {extra && !expanded && <p className="sr-only" role="status">Filtro selecionado: {extra[1]}</p>}
    </section>
  );
}
