"use client";

import { Activity, BrainCircuit, CalendarDays, Heart, Pill } from "lucide-react";

const destinations = [
  { id: "hoje-doses", label: "Doses", Icon: Pill },
  { id: "hoje-agenda", label: "Agenda", Icon: CalendarDays },
  { id: "hoje-cuidado", label: "Cuidado", Icon: Heart },
  { id: "hoje-diario", label: "Diário", Icon: Activity, daily: true },
  { id: "hoje-brain", label: "Brain", Icon: BrainCircuit, daily: true },
];

/** Navigates to existing content without changing the selected day or clinical state. */
export function TodayJourneyRailP5({isToday, dailySections, pendingCount, onInteraction}: {
  isToday: boolean;
  dailySections: boolean;
  pendingCount: number;
  onInteraction: () => void;
}) {
  function jump(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    onInteraction();
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <nav data-vault-ia20-p5="today-journey" aria-label="Ir para uma parte do dia"
      className="flex min-w-0 flex-wrap gap-1.5 rounded-2xl border border-surface-border/45 bg-surface/55 p-1.5">
      {destinations.filter(({daily}) => !daily || dailySections).map(({id, label, Icon}) => (
        <button key={id} type="button" onClick={() => jump(id)}
          aria-label={`Ir para ${label.toLowerCase()}`}
          className="flex min-h-11 min-w-[5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:border-surface-border/70 hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice motion-reduce:transition-none">
          <Icon size={15} className="shrink-0 text-ice" aria-hidden="true"/>
          {label}
          {isToday && id === "hoje-doses" && pendingCount > 0 && (
            <span className="shrink-0 rounded-full bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-200"
              aria-label={`${pendingCount} doses pendentes`}>{pendingCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
