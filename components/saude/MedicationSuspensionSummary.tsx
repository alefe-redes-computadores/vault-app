"use client";

import { ArrowRightLeft, ChevronRight } from "lucide-react";

type Replacement = { id?: string | null; name: string; dosage: string };
type Props = {
  discontinuedAt: string;
  reason?: string | null;
  physician?: string | null;
  replacement?: Replacement | null;
  onOpenReplacement: () => void;
};

/** P15 R5: suspensão é histórico, não nova dose, baixa de estoque nem confirmação de substituição. */
export function MedicationSuspensionSummary({ discontinuedAt, reason, physician, replacement, onOpenReplacement }: Props) {
  return (
    <div className="space-y-3 rounded-[20px] border border-coral/20 bg-coral/5 p-4">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wide text-coral">Medicamento suspenso</p>
        <p className="mt-1 text-sm font-semibold text-ink-primary">{discontinuedAt}</p>
      </div>
      {reason && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Motivo registrado</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-primary">{reason}</p>
        </div>
      )}
      {physician && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Médico relacionado</p>
          <p className="mt-1 break-words text-sm font-semibold text-ink-primary">{physician}</p>
        </div>
      )}
      {replacement && (
        <button type="button" onClick={onOpenReplacement} disabled={!replacement.id}
          aria-label={replacement.id ? `Ver medicamento substituto: ${replacement.name}` : `Medicamento substituto sem vínculo navegável: ${replacement.name}`}
          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-left transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400" aria-hidden="true"><ArrowRightLeft size={16} /></span>
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wide text-emerald-400">Substituído por</span>
              <span className="block break-words text-sm font-bold text-ink-primary">{replacement.name} {replacement.dosage}</span>
            </span>
          </span>
          {replacement.id ? <ChevronRight size={17} className="shrink-0 text-emerald-400" aria-hidden="true" /> : <span className="shrink-0 text-[10px] text-ink-muted">Sem vínculo</span>}
        </button>
      )}
    </div>
  );
}
