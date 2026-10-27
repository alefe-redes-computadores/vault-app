"use client";

import { useMemo } from "react";
import { CalendarPlus2, ChevronRight, FileClock } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildPrescriptionPlanningPortfolio } from "@/lib/health-intelligence/prescription-planning";

const dateLabel = (value: string) => value.split("-").reverse().join("/");

export function PrescriptionPlanningBrief({ context, onNavigate, compact = false }: { context: HealthInsightContext | null | undefined; onNavigate: (href: string) => void; compact?: boolean }) {
  const portfolio = useMemo(() => context ? buildPrescriptionPlanningPortfolio(context) : null, [context]);
  if (!portfolio?.items.length) return null;
  const visible = portfolio.items.slice(0, compact ? 2 : 4);
  return <section aria-label="Planejamento de novas receitas" className={`rounded-2xl border ${portfolio.due ? "border-amber-300/25 bg-amber-300/[.045]" : "border-violet-300/20 bg-violet-300/[.035]"} p-3`}>
    <div className="flex items-start gap-2.5"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${portfolio.due ? "bg-amber-300/10 text-amber-200" : "bg-violet-300/10 text-violet-200"}`}><FileClock size={16}/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Próximas receitas</strong><span className="mt-0.5 block text-[9px] leading-relaxed text-ink-muted">Datas escolhidas para solicitar; nenhum documento foi criado ainda.</span></span><span className="rounded-full border border-current/15 px-2 py-1 text-[8px] text-ink-muted">{portfolio.items.length}</span></div>
    <div className="mt-3 space-y-1.5">{visible.map(item => <button key={item.medicationId} type="button" onClick={() => onNavigate(item.href)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border/60 bg-surface/65 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><CalendarPlus2 size={13} className={item.due ? "text-amber-300" : "text-violet-300"}/><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-ink-primary">{item.medicationName}</strong><span className="text-[8px] text-ink-muted">{item.due ? "Solicitação prevista" : "Planejada"} · {dateLabel(item.date)}</span></span><ChevronRight size={13} className="text-ink-faint"/></button>)}</div>
    <p className="mt-2 text-[8px] leading-relaxed text-ink-faint">Planejamento não vale como receita recebida, compra, retirada ou entrada no estoque.</p>
  </section>;
}
