"use client";

import { Activity, BrainCircuit, CalendarDays, Heart, Pill } from "lucide-react";

export const todayAreas = {
  doses: { id: "hoje-doses", label: "Doses", Icon: Pill, tone: "text-teal-300" },
  brain: { id: "hoje-brain", label: "Brain", Icon: BrainCircuit, tone: "text-violet-300", daily: true },
  agenda: { id: "hoje-agenda", label: "Agenda", Icon: CalendarDays, tone: "text-sky-300" },
  cuidado: { id: "hoje-cuidado", label: "Cuidado", Icon: Heart, tone: "text-emerald-300" },
  diario: { id: "hoje-diario", label: "Diário", Icon: Activity, tone: "text-rose-300", daily: true },
} satisfies Record<string, { id: string; label: string; Icon: typeof Pill; tone: string; daily?: boolean }>;

const destinations = Object.values(todayAreas);
export function openTodayArea(id: string) {
  const target = document.getElementById(id);
  if (!target) return null;
  for (let element: HTMLElement | null = target; element; element = element.parentElement) {
    if (element instanceof HTMLDetailsElement) element.open = true;
  }
  return target;
}

/** Navigates to existing content without changing the selected day or clinical state. */
export function TodayJourneyRailP5({isToday, dailySections, pendingCount, onInteraction}: {
  isToday: boolean;
  dailySections: boolean;
  pendingCount: number;
  onInteraction: () => void;
}) {
  function jump(id: string) {
    const target = openTodayArea(id);
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
      {destinations.filter(item => !("daily" in item) || dailySections).map(({id, label, Icon, tone}) => (
        <button key={id} type="button" onClick={() => jump(id)}
          aria-label={`Ir para ${label.toLowerCase()}`}
          className="flex min-h-11 min-w-[5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:border-surface-border/70 hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice motion-reduce:transition-none">
          <Icon size={15} className={`shrink-0 ${tone}`} aria-hidden="true"/>
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
