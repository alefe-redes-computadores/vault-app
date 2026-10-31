"use client";

import { BrainCircuit, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Pill, Zap } from "lucide-react";
import type { MedicationPortfolio } from "@/lib/health-intelligence/medication-portfolio";
import type { BrainCarePlan } from "@/lib/health-intelligence/care-plan";

/**
 * P9 — compacto por padrão, evidências detalhadas por opção do usuário.
 * Contagens do Brain e do calendário clínico permanecem autoridades distintas.
 */
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
  return (
    <section aria-label="Resumo operacional dos medicamentos" className="mb-2.5 rounded-2xl border border-surface-border/50 bg-surface/70 px-3 py-2.5 shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ice/10 text-ice"><Pill size={17}/></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Seu cuidado</p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-ink-primary">
            {portfolio.active} ativo{portfolio.active===1?"":"s"}
            <span className="mx-1.5 text-ink-faint" aria-hidden="true">·</span>
            <span className={portfolio.needsAction>0?"text-amber-300":"text-emerald-300"}>{portfolio.needsAction} em atenção</span>
          </p>
        </div>
        <div className="shrink-0 text-right" aria-label={total>0?`${completed} de ${total} doses confirmadas hoje`:"Sem doses programadas no resumo de hoje"}>
          <span className="block text-sm font-bold tabular-nums text-ink-primary">{total>0?`${completed}/${total}`:"—"}</span>
          <span className="block text-[9px] text-ink-muted">tomadas hoje</span>
        </div>
      </div>
      {total > 0 && <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised" aria-label={`${percent}% das doses confirmadas hoje`}><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width:`${Math.min(100, percent || 0)}%` }}/></div>}
      {(ignored > 0 || pending > 0) && <p className="mt-1.5 text-[10px] leading-snug text-ink-muted">
        {pending > 0 ? `${pending} a revisar` : ""}
        {pending > 0 && ignored > 0 ? " · " : ""}
        {ignored > 0 ? `${ignored} ignorada${ignored===1?"":"s"}, não tomada${ignored===1?"":"s"}` : ""}
      </p>}
      {decision?.href && <button type="button" onClick={() => onNavigate(decision.href!)} className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
        <BrainCircuit size={15} className="shrink-0 text-violet-300"/>
        <span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-wide text-violet-200">Próxima decisão comprovada</span><strong className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-ink-primary">{decision.title}</strong></span>
        <ChevronRight size={14} className="shrink-0 text-ink-muted"/>
      </button>}
      <details className="group mt-1 border-t border-surface-border/30 pt-1">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
          Entender origens, doses e estados <ChevronDown size={13} className="transition-transform group-open:rotate-180"/>
        </summary>
        <div className="space-y-1.5 pb-1 text-[11px] leading-relaxed text-ink-muted">
          <div className="flex flex-wrap gap-1.5 font-semibold">
            {portfolio.temporaryCoursesOpen > 0 && <span className="rounded-full border border-violet-300/15 px-2 py-1 text-violet-200"><CalendarClock size={11} className="mr-1 inline"/>{portfolio.temporaryCoursesOpen} período(s) · {portfolio.temporaryDosesOpen} abertas</span>}
            {portfolio.asNeeded > 0 && <span className="rounded-full border border-amber-300/15 px-2 py-1 text-amber-200"><Zap size={11} className="mr-1 inline"/>{portfolio.asNeeded} SOS</span>}
            {total > 0 && <span className="rounded-full border border-emerald-300/15 px-2 py-1 text-emerald-200"><CheckCircle2 size={11} className="mr-1 inline"/>{completed}/{total} tomadas hoje</span>}
          </div>
          <p>Na visão do Brain: {portfolio.active} ativos · {portfolio.continuous} contínuos · {portfolio.temporary} por período · {portfolio.asNeeded} SOS. São critérios próprios de acompanhamento; não some essas categorias.</p>
          <p>O percentual considera somente doses marcadas como tomadas. Ignoradas e pendentes não contam como tomadas. Quando não há doses programadas, o percentual não é estimado.</p>
          <p>SUS/público {portfolio.routes.public} · comprado {portfolio.routes.private} · híbrido {portfolio.routes.hybrid} · sem origem comprovada {portfolio.routes.unknown}. {portfolio.note}</p>
        </div>
      </details>
    </section>
  );
}
