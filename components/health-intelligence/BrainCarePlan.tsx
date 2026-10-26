"use client";

import { BrainCircuit, CalendarClock, ChevronRight, CircleDollarSign, MessageCircle, Search } from "lucide-react";
import type { BrainCarePlan as BrainCarePlanModel, BrainCarePlanLane } from "@/lib/health-intelligence/care-plan";
import { useEffect, useState } from "react";
import { compareCarePlan, readCarePlanMemory, writeCarePlanMemory, type CarePlanChange } from "@/lib/health-intelligence/care-plan-memory";

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
  useEffect(() => {
    const previous = readCarePlanMemory(plan.ownerKey);
    setChange(compareCarePlan(previous, plan));
    writeCarePlanMemory(plan);
  }, [plan]);
  const visible = compact ? plan.focus.slice(0, 2) : plan.focus;
  return <section aria-label="Plano do Brain" className="mx-auto mt-4 max-w-2xl overflow-hidden rounded-[22px] border border-violet-400/20 bg-gradient-to-br from-violet-400/[0.07] via-surface to-emerald-400/[0.04]">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><BrainCircuit size={19}/></div>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Plano inteligente de cuidado</h2><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Uma fila única: fato registrado, projeção e padrão para conversar continuam identificados.</p></div>
      <span className="rounded-full border border-violet-400/20 px-2 py-1 font-mono text-[8px] text-violet-200">{plan.items.length} etapas</span>
    </div>
    <div className="grid grid-cols-4 border-y border-surface-border/50 bg-void/20">
      {(Object.keys(laneMeta) as BrainCarePlanLane[]).map(lane => <div key={lane} className="border-r border-surface-border/40 px-1.5 py-2 text-center last:border-r-0"><strong className="block text-sm">{plan.counts[lane]}</strong><span className="mt-0.5 block text-[7px] uppercase tracking-wide text-ink-faint">{laneMeta[lane].label}</span></div>)}
    </div>
    {change ? <div className="border-b border-surface-border/50 px-4 py-2 font-mono text-[8px] uppercase tracking-wide text-ink-faint">{change.label}</div> : null}
    {visible.length ? <div className="space-y-2 p-3">{visible.map(item => {
      const meta = laneMeta[item.lane], Icon = meta.icon;
      return <button key={item.id} type="button" onClick={() => onNavigate(item.href)} className={`flex min-h-[68px] w-full items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.985] ${meta.tone}`}>
        <Icon size={17} className="shrink-0"/><span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-wide opacity-80">{meta.label} · {item.evidenceKind === "recorded" ? "registrado" : item.evidenceKind === "projected" ? "projeção" : item.evidenceKind === "association" ? "associação" : "dado ausente"}</span><strong className="mt-1 block text-xs text-ink-primary">{item.title}</strong><span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-ink-muted">{item.reason}</span><span className="mt-1.5 block font-mono text-[8px] uppercase tracking-wide opacity-70">Prioridade {item.priorityScore} · confiança {item.confidence === "high" ? "alta" : item.confidence === "moderate" ? "moderada" : "limitada"}</span></span><ChevronRight size={16} className="shrink-0 opacity-60"/>
      </button>;
    })}</div> : <div className="p-4 text-xs text-emerald-200">Nenhuma etapa prioritária produzida pelos registros atuais.</div>}
    {!compact ? <div className="flex items-center gap-3 border-t border-surface-border/50 px-4 py-3 text-[9px] text-ink-muted"><CircleDollarSign size={15} className="text-emerald-300"/><span className="min-w-0 flex-1">30 dias: {plan.projectedCost30d > 0 ? `${brl(plan.projectedCost30d)} estimados` : "sem custo projetado conhecido"} · cobertura {plan.projectedCostCoverage30d}%</span></div> : null}
  </section>;
}
