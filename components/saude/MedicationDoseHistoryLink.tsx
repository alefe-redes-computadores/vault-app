"use client";

import { CalendarDays, ChevronRight } from "lucide-react";

/** Keep the dose authority/history route unchanged; this only displays its navigation. */
export function MedicationDoseHistoryLink({onOpen}:{onOpen:()=>void}) {
  return <button type="button" onClick={onOpen}
    className="vault-deferred flex min-h-14 w-full items-center justify-between gap-4 rounded-[20px] border border-ice/20 bg-gradient-to-r from-ice/10 to-surface px-3.5 py-3 text-left shadow-sm transition-all active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"><CalendarDays size={18}/></span>
      <span className="min-w-0">
        <strong className="block text-sm font-bold text-ink-primary">Histórico e calendário de doses</strong>
        <span className="mt-0.5 block text-[10px] text-ink-muted">Veja tomadas, horários, SOS e dias sem confirmação</span>
      </span>
    </span>
    <ChevronRight size={16} className="shrink-0 text-ice"/>
  </button>;
}
