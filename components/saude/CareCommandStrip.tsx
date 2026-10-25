"use client";

import { AlertTriangle, CalendarClock, ChevronRight } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export function CareCommandStrip({ command, onNavigate }: { command: CareCommandSnapshot | null; onNavigate: (href: string) => void }) {
  const action = command?.primary;
  if (!action || (action.lane !== "now" && action.lane !== "next")) return null;
  const urgent = action.lane === "now";
  const Icon = urgent ? AlertTriangle : CalendarClock;
  return <button type="button" onClick={() => onNavigate(action.href)} className={`flex w-full items-center gap-3 rounded-[18px] border p-3 text-left active:scale-[.985] ${urgent ? "border-coral/25 bg-coral/[.055]" : "border-amber-300/20 bg-amber-300/[.045]"}`}>
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-coral/12 text-coral" : "bg-amber-300/10 text-amber-300"}`}><Icon size={17}/></span>
    <span className="min-w-0 flex-1"><span className={`block text-[8px] font-bold uppercase tracking-[.14em] ${urgent ? "text-coral" : "text-amber-300"}`}>{urgent ? "Ação pendente" : "Próxima etapa"}</span><strong className="mt-0.5 block line-clamp-1 text-xs text-ink-primary">{action.title}</strong><span className="mt-0.5 block line-clamp-1 text-[9px] text-ink-muted">{action.reason}</span></span>
    <ChevronRight size={15} className="shrink-0 text-ink-faint"/>
  </button>;
}
