"use client";
import { useMemo } from "react";
import { CalendarClock, ChevronRight, Pill } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildMedicationContinuityPortfolio } from "@/lib/health-intelligence/medication-workspace";
import { getLocalTodayISO } from "@/lib/health-utils";

export function MedicationContinuityAvatarSummary({ context, onNavigate }: { context: HealthInsightContext | null | undefined; onNavigate: (href: string) => void }) {
  const portfolio = useMemo(() => context ? buildMedicationContinuityPortfolio({ medications: context.medicamentos, renewals: context.renovacoes, withdrawals: context.retiradas, today: context.hoje || getLocalTodayISO() }) : null, [context]);
  if (!portfolio || portfolio.active === 0) return null;
  return <section aria-label="Continuidade dos medicamentos no avatar" className="rounded-2xl border border-surface-border/80 border-l-2 border-l-violet-300/40 bg-surface p-3">
    <div className="flex items-center gap-2"><Pill size={16} className="text-violet-300"/><h3 className="text-sm font-semibold text-ink-primary">Continuidade dos medicamentos</h3><span className="ml-auto text-[10px] text-ink-muted">{portfolio.active} ativo(s)</span></div>
    <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{portfolio.withHistory}</strong><span className="text-[9px] text-ink-muted">Com histórico</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ice">{portfolio.plannedAcquisitions}</strong><span className="text-[9px] text-ink-muted">Compras futuras</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className={`block text-base ${portfolio.overdueWithdrawals ? "text-coral" : "text-amber-300"}`}>{portfolio.pendingWithdrawals}</strong><span className="text-[9px] text-ink-muted">Retiradas abertas</span></div></div>
    {portfolio.overdueWithdrawals > 0 && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-coral"><CalendarClock size={12}/>{portfolio.overdueWithdrawals} retirada(s) atrasada(s) continuam pendentes.</p>}
    <button type="button" onClick={() => onNavigate("/saude/medicamentos")} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-left text-xs font-semibold text-ink-primary"><span className="flex-1">Abrir medicamentos</span><ChevronRight size={14}/></button>
    <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Ausência de registro não é falha clínica. Receita, compra e retirada permanecem separadas.</p>
  </section>;
}
