"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, FolderHeart, HeartPulse, Pill, ShieldCheck } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { projectCareJourney360 } from "@/lib/health-intelligence/care-journey-360";

type Props = {
  command: CareCommandSnapshot | null | undefined;
  onNavigate: (href: string) => void;
  compact?: boolean;
};

/** Read-only contextual navigation; its parent already owns all underlying data. */
export function CareJourney360({ command, onNavigate, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = projectCareJourney360(command);
  if (!command) return null;
  const first = compact ? 3 : 4;
  const visible = expanded ? items : items.slice(0, first);
  const tone = {
    medications: "text-emerald-300", withdrawals: "text-amber-300", supply: "text-violet-300",
    documents: "text-ice", health: "text-rose-300", acquisitions: "text-sky-300", brain: "text-violet-200",
  } as const;
  return <section aria-label="Mapa do cuidado 360" className="min-w-0 rounded-[20px] border border-surface-border/60 bg-gradient-to-br from-violet-400/[0.045] via-surface to-emerald-400/[0.025] p-3">
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-200"><FolderHeart size={17} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Mapa do cuidado 360</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Áreas conectadas a partir do panorama da pessoa ativa. Os números são registros e planos, não confirmação de ações.</p>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-2 min-[640px]:grid-cols-2">
      {visible.map(item => <button key={item.id} type="button" onClick={() => onNavigate(item.href)}
        className="group flex min-h-[74px] min-w-0 items-start gap-2 rounded-xl border border-surface-border/55 bg-void/20 p-2.5 text-left transition-colors hover:bg-surface-raised/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg bg-surface-raised/60 ${tone[item.id]}`}>
          {item.id === "medications" ? <Pill size={16} aria-hidden="true" /> : item.id === "health" ? <HeartPulse size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold text-ink-primary">{item.count} · {item.title}</span>
          <span className="mt-1 block break-words text-[10px] leading-snug text-ink-muted">{item.detail}</span></span>
        <ArrowUpRight size={14} aria-hidden="true" className="shrink-0 text-ink-faint" />
      </button>)}
    </div>
    {items.length > first && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-border/50 bg-surface-raised/40 px-3 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      {expanded ? "Recolher conexões" : `Explorar mais ${items.length - first} áreas`} <ChevronDown size={15} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
    </button>}
    <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Uma receita, aquisição, retirada e dose são registros independentes. A ausência de dado permanece desconhecida.</p>
  </section>;
}
