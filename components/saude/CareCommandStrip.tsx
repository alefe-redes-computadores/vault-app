"use client";

import { useId, useState } from "react";
import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

const confidenceLabel = { high: "alta", moderate: "moderada", limited: "limitada" } as const;

export function CareCommandStrip({ command, onNavigate }: { command: CareCommandSnapshot | null; onNavigate: (href: string) => void }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const evidenceId = useId();
  const action = command?.decision;
  if (!action || (action.lane !== "now" && action.lane !== "prepare")) return null;

  const urgent = action.lane === "now";
  const Icon = urgent ? AlertTriangle : CalendarClock;
  const evidenceLabel = action.evidenceKind === "recorded" ? "registro" : action.evidenceKind === "projected" ? "projeção" : action.evidenceKind === "association" ? "associação cautelosa" : "dado incompleto";
  const caveat = action.evidenceKind === "association" ? "Coincidência temporal não prova causa." : action.evidenceKind === "projected" ? "Estimativa não é evento realizado." : action.evidenceKind === "missing_data" ? "Ausência de informação não prova falta clínica." : "Registro existente; confirme a situação na origem.";
  const date = action.dueDate ? action.dueDate.split("-").reverse().join("/") : null;
  const meta = [date, action.supplyRoute, action.relatedCount > 1 ? `${action.relatedCount} etapas unificadas` : ""].filter(Boolean).join(" · ");

  return (
    <section aria-label="Próxima ação sugerida pelo Brain" className={`overflow-hidden rounded-[18px] border ${urgent ? "border-coral/25 bg-coral/[.055]" : "border-amber-300/20 bg-amber-300/[.045]"}`}>
      <button type="button" onClick={() => onNavigate(action.href)} aria-label={`Abrir próxima etapa do Brain: ${action.title}. Confiança ${confidenceLabel[action.confidence]}`} className="flex min-h-14 w-full items-center gap-3 rounded-[18px] p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 active:scale-[.985]">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-coral/12 text-coral" : "bg-amber-300/10 text-amber-300"}`}><Icon size={17}/></span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[8px] font-bold uppercase tracking-[.14em] ${urgent ? "text-coral" : "text-amber-300"}`}>{urgent ? "Ação pendente" : "Preparar em seguida"}</span>
          <strong className="mt-0.5 block line-clamp-1 text-xs text-ink-primary">{action.title}</strong>
          <span className="mt-0.5 block line-clamp-1 text-[9px] text-ink-muted">{action.reason}</span>
          {meta ? <span className="mt-1 block truncate text-[8px] text-ink-faint">{meta}</span> : null}
          <span className="mt-1 block text-[8px] font-semibold text-violet-200">Base: {evidenceLabel} · confiança {confidenceLabel[action.confidence]}</span>
        </span>
        <ChevronRight size={15} className="shrink-0 text-ink-faint"/>
      </button>
      <button type="button" aria-expanded={evidenceOpen} aria-controls={evidenceId} onClick={() => setEvidenceOpen(value => !value)} className="flex min-h-11 w-full items-center gap-2 border-t border-surface-border/30 px-3 text-left text-[10px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
        <ShieldCheck size={13} className="text-violet-300"/><span className="flex-1">Evidências e limites da sugestão</span><ChevronDown size={14} className={`transition-transform ${evidenceOpen ? "rotate-180" : ""}`}/>
      </button>
      {evidenceOpen ? <div id={evidenceId} className="space-y-1 border-t border-surface-border/30 px-3 py-3 text-[9px] leading-relaxed text-ink-muted">
        <p>{caveat}</p>
        <p>Prioridade {action.priorityScore} · confiança {confidenceLabel[action.confidence]}. Abrir esta etapa não registra automaticamente dose, receita, compra ou retirada.</p>
      </div> : null}
    </section>
  );
}
