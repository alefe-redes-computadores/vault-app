"use client";

import { Activity, ChevronRight } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { CareCommandStrip } from "@/components/saude/CareCommandStrip";

type BrainFallback = { insightId: string; headline: string; title: string; supporting: number };

export function TodayActionCenter({ pendingDoses, command, brainFallback, onOpenDoses, onNavigate, showDoseShortcut = true }: {
  pendingDoses: number;
  command: CareCommandSnapshot | null;
  brainFallback?: BrainFallback | null;
  onOpenDoses: () => void;
  onNavigate: (href: string) => void;
  showDoseShortcut?: boolean;
}) {
  // CareCommandStrip only shows actionable now/prepare steps. Do not hide an
  // existing fallback because an unrelated "observe" decision exists.
  const actionable = command?.decision?.lane === "now" || command?.decision?.lane === "prepare";
  return (
    <section aria-label="Prioridades de hoje" className="space-y-2">
      {showDoseShortcut && pendingDoses > 0 ? <button type="button" onClick={onOpenDoses} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[16px] border border-amber-400/25 bg-amber-400/[0.055] px-3 py-2 text-left transition-colors active:bg-amber-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 motion-reduce:transition-none" aria-label={`Ir para ${pendingDoses} dose${pendingDoses === 1 ? "" : "s"} pendente${pendingDoses === 1 ? "" : "s"} de hoje`}>
        <span className="min-w-0"><strong className="block text-sm text-amber-300">{pendingDoses} dose{pendingDoses === 1 ? "" : "s"} pendente{pendingDoses === 1 ? "" : "s"}</strong><span className="block text-[11px] leading-relaxed text-ink-muted">Abrir horários e revisar cada medicamento</span></span><ChevronRight size={18} className="shrink-0 text-amber-300" aria-hidden="true"/>
      </button> : null}

      <CareCommandStrip command={command} onNavigate={onNavigate} insightHref="/inteligencia?return_to=%2Fhoje#insight-decisoes" />

      {!actionable && brainFallback ? <button type="button" onClick={() => onNavigate(`/inteligencia/alertas?insight=${encodeURIComponent(brainFallback.insightId)}&return_to=${encodeURIComponent("/hoje")}`)} className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-violet-400/20 bg-gradient-to-r from-violet-400/[0.07] to-surface p-3 text-left active:scale-[0.985] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Activity size={17}/></span>
        <span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-[.14em] text-violet-300">Briefing do cuidado</span><strong className="mt-0.5 block line-clamp-2 break-words text-xs leading-snug text-ink-primary">{brainFallback.headline}</strong><span className="mt-1 block line-clamp-2 break-words text-[11px] leading-snug text-ink-muted">{brainFallback.title}{brainFallback.supporting ? ` · ${brainFallback.supporting} sinal(is) agrupado(s)` : ""}</span></span><ChevronRight size={15} className="shrink-0 text-violet-300"/>
      </button> : null}
    </section>
  );
}
