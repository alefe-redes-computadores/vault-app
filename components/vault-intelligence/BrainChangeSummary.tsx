"use client";

import { Activity, ArrowUpRight, History } from "lucide-react";
import { brainV5IsSnoozed, brainV5JourneyKey, type BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { brainV5Momentum } from "@/lib/health-intelligence/brain-portfolio";

type Change = { item: BrainV5Alert; label: string; weight: number };

/**
 * M78: 30-day material changes in the *existing*, person-scoped alert ledger.
 * A repeated/updated signal is never called a new diagnosis. No writes, no
 * independent polling, no network or inferred medical conclusion.
 */
export function BrainChangeSummary({records,onOpen}:{
  records: readonly BrainV5Alert[];
  onOpen: (alert: BrainV5Alert) => void;
}) {
  const cutoff = Date.now() - 30 * 86400000;
  const changesByJourney = new Map<string, Change>();
  for (const item of records) {
    if (item.state === "resolved" || brainV5IsSnoozed(item)) continue;
    const timestamp = Date.parse(item.last_detected_at);
    if (!Number.isFinite(timestamp) || timestamp < cutoff || timestamp > Date.now() + 86400000) continue;
    const momentum = brainV5Momentum(item);
    if (momentum === "stable") continue;
    const change: Change = {item,
      label: momentum === "recurrent" ? "Sinal recorrente" :
        momentum === "updated" ? "Evidência atualizada" : "Ainda não revisado",
      weight: momentum === "recurrent" ? 3 : momentum === "updated" ? 2 : 1,
    };
    const journeyKey = brainV5JourneyKey(item);
    const previous = changesByJourney.get(journeyKey);
    if (!previous || change.weight > previous.weight || (change.weight === previous.weight && change.item.last_detected_at > previous.item.last_detected_at)) changesByJourney.set(journeyKey, change);
  }
  const changes = [...changesByJourney.values()];
  changes.sort((a,b)=>b.weight-a.weight || b.item.last_detected_at.localeCompare(a.item.last_detected_at) || a.item.key.localeCompare(b.item.key));
  return <section aria-label="Atualizações do Brain" className="mx-auto mt-3 max-w-2xl rounded-[20px] border border-violet-400/20 bg-violet-400/[.035] p-3.5">
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300" aria-hidden="true"><Activity size={17}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-ink-primary">O que mudou no Brain</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">Janela de 30 dias · histórico registrado, não diagnóstico nem confirmação de cuidado.</p>
      </div>
      {changes.length>0&&<span className="shrink-0 rounded-lg border border-violet-400/20 px-2 py-1 text-xs font-bold tabular-nums text-violet-200" aria-label={`${changes.length} jornadas para revisar`}>{changes.length}</span>}
    </div>
    {changes.length ? <div className="mt-2 space-y-1.5">{changes.slice(0,3).map(({item,label})=><button key={item.key} type="button" onClick={()=>onOpen(item)} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-surface-border/45 bg-surface/60 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <History size={15} className="shrink-0 text-violet-300" aria-hidden="true"/>
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-violet-200">{label}</span><span className="mt-0.5 block truncate text-xs text-ink-primary" title={item.snapshot.titulo}>{item.snapshot.titulo}</span></span>
      <ArrowUpRight size={15} className="shrink-0 text-ink-muted" aria-hidden="true"/>
    </button>)}{changes.length>3&&<p className="px-1 pt-1 text-xs text-ink-muted">Outros {changes.length-3} jornadas continuam acessíveis na lista completa.</p>}</div>
    : <p className="mt-2 text-xs leading-relaxed text-ink-muted">Nenhuma mudança material recente identificada na memória disponível. Isso não comprova ausência de acontecimentos fora do Vault.</p>}
  </section>;
}
