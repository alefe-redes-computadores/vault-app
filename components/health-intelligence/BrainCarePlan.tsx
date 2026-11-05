"use client";

import { BrainCircuit, CalendarClock, ChevronRight, CircleDollarSign, MessageCircle, Search } from "lucide-react";
import type { BrainCarePlan as BrainCarePlanModel, BrainCarePlanLane } from "@/lib/health-intelligence/care-plan";
import { useEffect, useId, useState } from "react";
import { compareCarePlan, readCarePlanMemory, writeCarePlanMemory, type CarePlanChange } from "@/lib/health-intelligence/care-plan-memory";
import { CarePlanHistory } from "./CarePlanHistory";
import { VaultBrainIdentity } from "./VaultBrainIdentity";

const laneMeta: Record<BrainCarePlanLane, { label: string; tone: string; icon: typeof CalendarClock }> = {
  now: { label: "Resolver agora", tone: "border-rose-400/25 bg-rose-400/[0.07] text-rose-200", icon: CalendarClock },
  prepare: { label: "Preparar", tone: "border-amber-400/25 bg-amber-400/[0.07] text-amber-200", icon: CalendarClock },
  discuss: { label: "Conversar", tone: "border-violet-400/25 bg-violet-400/[0.07] text-violet-200", icon: MessageCircle },
  observe: { label: "Completar dados", tone: "border-sky-400/20 bg-sky-400/[0.06] text-sky-200", icon: Search },
};

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function BrainCarePlan({ plan, onNavigate, compact = false }: {
  plan: BrainCarePlanModel;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) {
  const [change, setChange] = useState<CarePlanChange | null>(null);
  const planItemsId = useId();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const previous = readCarePlanMemory(plan.ownerKey);
    setChange(compareCarePlan(previous, plan));
    writeCarePlanMemory(plan);
  }, [plan]);
  const visible = expanded && !compact ? plan.items : plan.focus.slice(0, 2);
  const formatDate = (value?: string | null) => value ? value.split("-").reverse().join("/") : null;
  return <section aria-label="Plano do Brain" className="vault-brain-enter mx-auto mt-4 max-w-2xl overflow-hidden rounded-[24px] border border-surface-border/70 bg-gradient-to-br from-surface-raised/70 via-surface to-emerald-400/[0.035] shadow-sm">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[.07] text-violet-200"><BrainCircuit size={19}/></div>
      <div className="min-w-0 flex-1"><h2 className="text-base font-bold tracking-tight text-ink-primary"><VaultBrainIdentity context="Plano de cuidado" /></h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Uma fila única: fato registrado, projeção e padrão para conversar continuam identificados.</p></div>
      <span className="rounded-full border border-surface-border/70 bg-surface-raised/55 px-2.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-ink-secondary">{plan.items.length} etapas</span>
    </div>
    <details className="group border-y border-surface-border/50 bg-void/15">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-xs font-medium text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">Ver distribuição das etapas <ChevronRight size={14} className="transition-transform motion-reduce:transition-none group-open:rotate-90" aria-hidden="true" /></summary>
      <div className="grid grid-cols-2 border-t border-surface-border/50 min-[390px]:grid-cols-4">
        {(Object.keys(laneMeta) as BrainCarePlanLane[]).map(lane => <div key={lane} className="min-w-0 border-r border-b border-surface-border/40 px-2 py-3 text-center min-[390px]:border-b-0 last:border-r-0"><strong className="block text-sm">{plan.counts[lane]}</strong><span className="mt-1 block text-[10px] font-semibold leading-snug text-ink-muted">{laneMeta[lane].label}</span></div>)}
      </div>
    </details>
    {change ? <div className="border-b border-surface-border/50 px-4 py-2 font-mono text-[8px] uppercase tracking-wide text-ink-faint">{change.label}</div> : null}
    {visible.length ? <div id={planItemsId} className="space-y-2 p-3">{visible.map(item => {
      const meta = laneMeta[item.lane], Icon = meta.icon;
      return <button key={item.id} type="button" onClick={() => onNavigate(item.href)} className={`flex min-h-[68px] w-full items-start gap-2.5 rounded-2xl border p-3 text-left shadow-sm transition-[background-color,border-color] hover:brightness-110 active:brightness-95 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${meta.tone}`}>
        <Icon size={17} className="shrink-0"/><span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-wide opacity-80">{meta.label} · {item.evidenceKind === "recorded" ? "registrado" : item.evidenceKind === "projected" ? "projeção" : item.evidenceKind === "association" ? "associação" : "dado ausente"}</span><strong className="mt-1 block text-sm font-bold leading-snug text-ink-primary">{item.title}</strong>{(item.dueDate || item.supplyRoute || item.relatedCount > 1) && <span className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-ink-muted">{item.dueDate && <span className="rounded-full border border-current/15 px-1.5 py-0.5">{formatDate(item.dueDate)}</span>}{item.supplyRoute && <span className="rounded-full border border-current/15 px-1.5 py-0.5">{item.supplyRoute}</span>}{item.relatedCount > 1 && <span className="rounded-full border border-current/15 px-1.5 py-0.5">+{item.relatedCount - 1} etapa(s) relacionada(s)</span>}</span>}<span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-ink-muted">{item.reason}</span>{item.relatedSteps.length > 1 ? <span className="mt-1 line-clamp-1 block text-[9px] text-ink-muted">Etapas reunidas: {item.relatedSteps.join(" · ")}</span> : null}<span className="mt-2 block font-mono text-[11px] leading-relaxed opacity-80">Prioridade {item.priorityScore} · confiança {item.confidence === "high" ? "alta" : item.confidence === "moderate" ? "moderada" : "limitada"}</span></span><ChevronRight size={16} className="shrink-0 opacity-60"/>
      </button>;
    })}</div> : <div className="p-4 text-xs text-emerald-200">Nenhuma etapa prioritária produzida pelos registros atuais.</div>}
    {!compact && plan.items.length > 2 ? <button type="button" aria-expanded={expanded} aria-controls={visible.length ? planItemsId : undefined} onClick={() => setExpanded(value => !value)} className="mx-3 mb-3 min-h-11 w-[calc(100%-1.5rem)] rounded-xl border border-surface-border bg-surface-raised/35 text-xs font-semibold text-ink-primary transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">{expanded ? "Mostrar somente prioridades" : `Ver plano completo · ${plan.items.length} etapas`}</button> : null}
    {!compact ? <details className="border-t border-surface-border/50"><summary className="min-h-11 cursor-pointer content-center px-4 text-xs font-semibold text-violet-200">Consulta, custos e histórico do plano</summary><div className="border-t border-surface-border/50 px-4 py-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-violet-200"><CalendarClock size={14}/><span>Desde a última consulta</span></div><p className="mt-1 text-xs leading-relaxed text-ink-muted">{plan.consultationWindow.start ? `${plan.consultationWindow.days} dia(s) de registros explícitos` : "Sem consulta realizada anterior identificada"} · {plan.consultationWindow.healthRecords} registro(s) de saúde · {plan.consultationWindow.takenDoses + plan.consultationWindow.ignoredDoses} desfecho(s) de dose · {plan.consultationWindow.realizedWithdrawals} retirada(s)</p><p className="mt-1 text-xs text-ink-faint">Dias sem registro não são tratados como falha ou não adesão.</p></div><div className="flex items-center gap-3 border-t border-surface-border/50 px-4 py-3 text-[9px] text-ink-muted"><CircleDollarSign size={15} className="text-emerald-300"/><span className="min-w-0 flex-1">30 dias: {plan.projectedCost30d > 0 ? `${brl(plan.projectedCost30d)} estimados` : "sem custo projetado conhecido"} · cobertura {plan.projectedCostCoverage30d}%</span></div><div className="p-3 pt-0"><CarePlanHistory ownerKey={plan.ownerKey}/></div></details> : null}
  </section>;
}
