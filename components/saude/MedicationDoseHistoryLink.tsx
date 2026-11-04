"use client";

import { CalendarDays, ChevronRight } from "lucide-react";

/** Keep the dose authority/history route unchanged; this only displays its navigation. */
export function MedicationDoseHistoryLink({onOpen}:{onOpen:()=>void}) {
  return <button type="button" onClick={onOpen}
    className="vault-deferred flex min-h-12 w-full items-center justify-between gap-3 rounded-[16px] border border-surface-border/60 bg-surface/75 px-3 py-2 text-left transition-colors motion-reduce:transition-none active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ink-secondary"><CalendarDays size={18}/></span>
      <span className="min-w-0">
        <strong className="block text-xs font-bold text-ink-primary">Histórico e calendário de doses</strong>
        <span className="mt-0.5 block break-words text-[10px] leading-snug text-ink-muted">Veja tomadas, horários, SOS e dias sem confirmação</span>
      </span>
    </span>
    <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true"/>
  </button>;
}
