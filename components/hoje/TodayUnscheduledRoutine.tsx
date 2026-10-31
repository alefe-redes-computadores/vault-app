"use client";

import { memo } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";

type MedicationPreview = {id?: string | null; nome?: string | null};
type Props = {medications: readonly MedicationPreview[]; onEdit: (id:string)=>void};

/** P14 R4 — Falta de horário é qualidade cadastral; nunca dose não tomada. */
export const TodayUnscheduledRoutine = memo(function TodayUnscheduledRoutine({medications,onEdit}:Props){
  if (!medications.length) return null;
  return <section aria-label="Medicamentos sem horário" className="rounded-2xl border border-amber-400/20 bg-amber-400/[.045] p-3">
    <div className="flex items-start gap-2.5">
      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <strong className="block text-xs font-semibold text-ink-primary">{medications.length} medicamento{medications.length===1?"":"s"} sem horário</strong>
        <p className="mt-1 text-[10px] leading-snug text-ink-muted">Rotinas ativas sem horário válido não entram nas doses pendentes. Confira a programação.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {medications.filter(m=>m.id).map(m=><button key={m.id} type="button" onClick={()=>onEdit(m.id!)}
            className="inline-flex min-h-10 max-w-full items-center gap-1 rounded-xl border border-amber-400/20 bg-void/30 px-3 text-[10px] font-semibold text-amber-200 active:scale-[.98]">
            <span className="truncate">{m.nome || "Medicamento"}</span><ChevronRight size={13} aria-hidden="true"/>
          </button>)}
        </div>
      </div>
    </div>
  </section>;
});
