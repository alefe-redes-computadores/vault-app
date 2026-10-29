"use client";
import { BrainCircuit, CalendarClock, CheckCircle2, ChevronRight, Pill, Zap } from "lucide-react";
import type { MedicationPortfolio } from "@/lib/health-intelligence/medication-portfolio";
import type { BrainCarePlan } from "@/lib/health-intelligence/care-plan";

export function MedicationPortfolioOverview({ portfolio, decision, doses, onNavigate }: {
  portfolio: MedicationPortfolio | null | undefined;
  decision?: BrainCarePlan["decision"];
  doses: { total: number; completed: number; ignored: number };
  onNavigate: (href: string) => void;
}) {
  if (!portfolio) return null;
  const percent = doses.total > 0 ? Math.round((doses.completed / doses.total) * 100) : null;
  return <section aria-label="Resumo operacional dos medicamentos" className="mb-3 rounded-[18px] border border-surface-border/45 bg-surface p-3 shadow-sm">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"><Pill size={17}/></span>
      <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-faint">Portfólio de cuidado</p><p className="mt-0.5 text-sm font-bold text-ink-primary">{portfolio.needsAction ? `${portfolio.needsAction} medicamento(s) pedem ação` : "Rotina sem ação comprovada agora"}</p><p className="mt-1 text-[10px] text-ink-muted">{portfolio.active} ativos · {portfolio.continuous} contínuos · {portfolio.temporary} por período · {portfolio.asNeeded} SOS</p></div>
      <span className={`rounded-xl px-2.5 py-1.5 text-xs font-black tabular-nums ${percent === 100 ? "bg-emerald-400/10 text-emerald-400" : "bg-ice/10 text-ice"}`}>{percent === null ? "—" : `${percent}%`}</span>
    </div>
    {doses.total > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{width:`${Math.min(100, percent || 0)}%`}}/></div>}
    <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold">
      <span className="rounded-full border border-emerald-300/15 px-2 py-1 text-emerald-200"><CheckCircle2 size={10} className="mr-1 inline"/>{doses.completed}/{doses.total} hoje</span>
      {portfolio.temporaryCoursesOpen > 0 && <span className="rounded-full border border-violet-300/15 px-2 py-1 text-violet-200"><CalendarClock size={10} className="mr-1 inline"/>{portfolio.temporaryCoursesOpen} período(s) · {portfolio.temporaryDosesOpen} abertas</span>}
      {portfolio.asNeeded > 0 && <span className="rounded-full border border-amber-300/15 px-2 py-1 text-amber-200"><Zap size={10} className="mr-1 inline"/>{portfolio.asNeeded} SOS</span>}
      {doses.ignored > 0 && <span className="rounded-full border border-amber-300/15 px-2 py-1 text-amber-200">{doses.ignored} ignorada(s)</span>}
    </div>
    {decision?.href && <button type="button" onClick={() => onNavigate(decision.href!)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-3 text-left"><BrainCircuit size={15} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1"><span className="block text-[8px] font-bold uppercase tracking-wider text-violet-200">Próxima decisão comprovada</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{decision.title}</strong></span><ChevronRight size={14} className="shrink-0 text-ink-muted"/></button>}
    <details className="mt-1"><summary className="min-h-9 cursor-pointer py-2 text-[9px] font-semibold text-ink-muted">Entender origens e estados</summary><p className="text-[9px] leading-relaxed text-ink-muted">SUS/público {portfolio.routes.public} · comprado {portfolio.routes.private} · híbrido {portfolio.routes.hybrid} · sem origem comprovada {portfolio.routes.unknown}. {portfolio.note}</p></details>
  </section>;
}
