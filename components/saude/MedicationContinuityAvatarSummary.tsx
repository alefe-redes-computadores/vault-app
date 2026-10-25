"use client";
import { useMemo } from "react";
import { CalendarClock, ChevronRight, Pill } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildMedicationContinuityPortfolio } from "@/lib/health-intelligence/medication-workspace";
import { getLocalTodayISO } from "@/lib/health-utils";

export function MedicationContinuityAvatarSummary({ context, onNavigate }: { context: HealthInsightContext | null | undefined; onNavigate: (href: string) => void }) {
  const portfolio = useMemo(() => context ? buildMedicationContinuityPortfolio({ medications: context.medicamentos, renewals: context.renovacoes, withdrawals: context.retiradas, today: context.hoje || getLocalTodayISO() }) : null, [context]);
  if (!portfolio || portfolio.active === 0) return null;
  return <details aria-label="Continuidade dos medicamentos no avatar" className="group rounded-2xl border border-surface-border/80 border-l-2 border-l-violet-300/40 bg-surface p-3">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2"><Pill size={16} className="text-violet-300"/><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink-primary">Continuidade dos medicamentos</span><span className="mt-0.5 block text-[10px] text-ink-muted">{portfolio.active} ativo(s) · {portfolio.pendingWithdrawals} retirada(s) aberta(s)</span></span>{portfolio.overdueWithdrawals > 0 && <span className="rounded-full bg-coral/10 px-2 py-1 text-[9px] font-bold text-coral">{portfolio.overdueWithdrawals} atrasada(s)</span>}<ChevronRight size={14} className="transition-transform group-open:rotate-90"/></summary>
    <div className="mt-2 border-t border-surface-border/50 pt-2"><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{portfolio.withHistory}</strong><span className="text-[9px] text-ink-muted">Com histórico</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ice">{portfolio.plannedAcquisitions}</strong><span className="text-[9px] text-ink-muted">Compras futuras</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className={`block text-base ${portfolio.overdueWithdrawals ? "text-coral" : "text-amber-300"}`}>{portfolio.pendingWithdrawals}</strong><span className="text-[9px] text-ink-muted">Retiradas abertas</span></div></div>
      {portfolio.overdueWithdrawals > 0 && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-coral"><CalendarClock size={12}/>{portfolio.overdueWithdrawals} retirada(s) atrasada(s) continuam pendentes.</p>}
      <button type="button" onClick={() => onNavigate("/saude/medicamentos")} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-left text-xs font-semibold text-ink-primary"><span className="flex-1">Abrir medicamentos</span><ChevronRight size={14}/></button>
      <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Ausência de registro não é falha clínica. Receita, compra e retirada permanecem separadas.</p></div>
  </details>;
}
