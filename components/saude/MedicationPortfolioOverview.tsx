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
  const total = Math.max(0, doses.total);
  const completed = Math.max(0, Math.min(total, doses.completed));
  const ignored = Math.max(0, Math.min(total - completed, doses.ignored));
  const pending = Math.max(0, total - completed - ignored);
  const percent = total > 0 ? Math.round((completed / total) * 100) : null;
  return <section aria-label="Resumo operacional dos medicamentos" className="mb-3 rounded-[18px] border border-surface-border/45 bg-surface p-3 shadow-sm">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"><Pill size={17}/></span>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Panorama do cuidado</p><p className="mt-0.5 text-sm font-bold text-ink-primary">{portfolio.needsAction ? `${portfolio.needsAction} medicamento(s) pedem ação` : "Rotina sem ação comprovada agora"}</p><p className="mt-1 text-xs leading-relaxed text-ink-muted">Resumo do Brain · critérios próprios de acompanhamento</p></div>
      <span className={`rounded-xl px-2.5 py-1.5 text-xs font-black tabular-nums ${percent === 100 ? "bg-emerald-400/10 text-emerald-400" : "bg-ice/10 text-ice"}`}>{percent === null ? "—" : `${percent}%`}</span>
    </div>
    {total > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{width:`${Math.min(100, percent || 0)}%`}}/></div>}
    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
      <span className="rounded-full border border-emerald-300/15 px-2 py-1 text-emerald-200"><CheckCircle2 size={10} className="mr-1 inline"/>{completed}/{total} tomadas hoje</span>
      {portfolio.temporaryCoursesOpen > 0 && <span className="rounded-full border border-violet-300/15 px-2 py-1 text-violet-200"><CalendarClock size={10} className="mr-1 inline"/>{portfolio.temporaryCoursesOpen} período(s) · {portfolio.temporaryDosesOpen} abertas</span>}
      {portfolio.asNeeded > 0 && <span className="rounded-full border border-amber-300/15 px-2 py-1 text-amber-200"><Zap size={10} className="mr-1 inline"/>{portfolio.asNeeded} SOS</span>}
      {ignored > 0 && <span className="rounded-full border border-amber-300/15 px-2 py-1 text-amber-200">{ignored} ignorada(s), não tomadas</span>}
      {pending > 0 && <span className="rounded-full border border-cyan-300/15 px-2 py-1 text-cyan-200">{pending} a revisar</span>}
    </div>
    {decision?.href && <button type="button" onClick={() => onNavigate(decision.href!)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><BrainCircuit size={15} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-violet-200">Próxima decisão comprovada</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{decision.title}</strong></span><ChevronRight size={14} className="shrink-0 text-ink-muted"/></button>}
    <details className="mt-1"><summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Entender origens, doses e estados</summary><p className="mb-1 text-xs leading-relaxed text-ink-muted">Na visão do Brain: {portfolio.active} ativos · {portfolio.continuous} contínuos · {portfolio.temporary} por período · {portfolio.asNeeded} SOS. A lista da página pode usar outros critérios; os totais não devem ser somados.</p><p className="mb-1 text-xs leading-relaxed text-ink-muted">O percentual considera somente doses marcadas como tomadas. Ignoradas e pendentes não contam como tomadas. Quando não há doses programadas, o percentual não é estimado.</p><p className="text-xs leading-relaxed text-ink-muted">SUS/público {portfolio.routes.public} · comprado {portfolio.routes.private} · híbrido {portfolio.routes.hybrid} · sem origem comprovada {portfolio.routes.unknown}. {portfolio.note}</p></details>
  </section>;
}
