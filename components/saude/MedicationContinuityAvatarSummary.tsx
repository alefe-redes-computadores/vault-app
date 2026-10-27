"use client";
import { useMemo } from "react";
import { CalendarClock, ChevronRight, Pill } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildMedicationContinuityPortfolio } from "@/lib/health-intelligence/medication-workspace";
import { getLocalTodayISO } from "@/lib/health-utils";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export function MedicationContinuityAvatarSummary({ context, command, onNavigate }: { context: HealthInsightContext | null | undefined; command?: CareCommandSnapshot | null; onNavigate: (href: string) => void }) {
  const portfolio = useMemo(() => context ? buildMedicationContinuityPortfolio({ medications: context.medicamentos, renewals: context.renovacoes, withdrawals: context.retiradas, today: context.hoje || getLocalTodayISO() }) : null, [context]);
  const routes = useMemo(() => {
    const counts={public:0,private:0,hybrid:0,unknown:0};
    for(const item of command?.readiness.items??[]){if(item.route.mode==="public")counts.public+=1;else if(item.route.mode==="private")counts.private+=1;else if(item.route.mode==="hybrid")counts.hybrid+=1;else counts.unknown+=1;}
    return counts;
  },[command]);
  if (!portfolio || portfolio.active === 0) return null;
  const nextRecorded = command?.plan.items.find(item => item.evidenceKind === "recorded" && (item.lane === "now" || item.lane === "prepare") && Boolean(item.href));
  return <details aria-label="Continuidade dos medicamentos no avatar" className="group rounded-2xl border border-surface-border/80 border-l-2 border-l-violet-300/40 bg-surface p-3">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2"><Pill size={16} className="text-violet-300"/><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink-primary">Continuidade dos medicamentos</span><span className="mt-0.5 block text-[10px] text-ink-muted">{portfolio.active} ativo(s) · {portfolio.pendingWithdrawals} retirada(s) aberta(s)</span></span>{portfolio.overdueWithdrawals > 0 && <span className="rounded-full bg-coral/10 px-2 py-1 text-[9px] font-bold text-coral">{portfolio.overdueWithdrawals} atrasada(s)</span>}<ChevronRight size={14} className="transition-transform group-open:rotate-90"/></summary>
    <div className="mt-2 border-t border-surface-border/50 pt-2"><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{portfolio.withHistory}</strong><span className="text-[9px] text-ink-muted">Com histórico</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className="block text-base text-ice">{portfolio.plannedAcquisitions}</strong><span className="text-[9px] text-ink-muted">Compras futuras</span></div><div className="rounded-xl bg-surface-raised/70 p-2"><strong className={`block text-base ${portfolio.overdueWithdrawals ? "text-coral" : "text-amber-300"}`}>{portfolio.pendingWithdrawals}</strong><span className="text-[9px] text-ink-muted">Retiradas abertas</span></div></div>
      {portfolio.overdueWithdrawals > 0 && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-coral"><CalendarClock size={12}/>{portfolio.overdueWithdrawals} retirada(s) atrasada(s) continuam pendentes.</p>}
      {(routes.public+routes.private+routes.hybrid)>0&&<div className="mt-2 flex flex-wrap gap-1.5 text-[8px]"><span className="rounded-full border border-emerald-300/15 px-2 py-1 text-emerald-200">SUS/público {routes.public}</span><span className="rounded-full border border-amber-300/15 px-2 py-1 text-amber-200">Comprado {routes.private}</span>{routes.hybrid>0&&<span className="rounded-full border border-violet-300/15 px-2 py-1 text-violet-200">Híbrido {routes.hybrid}</span>}{routes.unknown>0&&<span className="rounded-full border border-surface-border px-2 py-1 text-ink-muted">Sem origem {routes.unknown}</span>}</div>}
      {nextRecorded ? <button type="button" onClick={() => onNavigate(nextRecorded.href)} className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.045] px-3 text-left"><CalendarClock size={15} className="shrink-0 text-violet-200"/><span className="min-w-0 flex-1"><span className="block text-[8px] font-bold uppercase tracking-wider text-violet-200">Próximo compromisso registrado</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{nextRecorded.title}</strong><span className="mt-0.5 block truncate text-[9px] text-ink-muted">{nextRecorded.dueDate ? nextRecorded.dueDate.split("-").reverse().join("/") : "Data a revisar"} · abre o registro original</span></span><ChevronRight size={14} className="shrink-0 text-ink-muted"/></button> : null}
      <button type="button" onClick={() => onNavigate("/saude/medicamentos")} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-left text-xs font-semibold text-ink-primary"><span className="flex-1">Abrir medicamentos</span><ChevronRight size={14}/></button>
      <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Ausência de registro não é falha clínica. Receita, compra e retirada permanecem separadas.</p></div>
  </details>;
}
