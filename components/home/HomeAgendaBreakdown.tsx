"use client";
import { ChevronDown, ChevronRight, AlertTriangle, CalendarDays } from "lucide-react";
import { homeAgendaUrgency } from "@/lib/home/agenda-urgency";
import { useDismissibleDetails } from "@/hooks/useDismissibleDetails";

type Entry = { key: string; label: string; count: number; href: string };
/**
 * M138: resumo da agenda não duplica cartões detalhados já presentes na Home.
 * A CTA rola para os compromissos reais e links por categoria ficam sob demanda.
 * Autoridade dos dados, haptics e navegação continuam pertencendo à Home.
 */
export function HomeAgendaBreakdown({ consultations, exams, surgeries, withdrawals, overdueWithdrawals = 0, onNavigate, onOpenAgenda }: {
  consultations: number;
  exams: number;
  surgeries: number;
  withdrawals: number;
  overdueWithdrawals?: number;
  onNavigate: (href: string) => void;
  onOpenAgenda?: () => void;
}) {
  const detailsRef = useDismissibleDetails();
  const items: Entry[] = [
    { key: "consultas", label: "Consultas", count: consultations, href: "/saude/consultas" },
    { key: "exames", label: "Exames", count: exams, href: "/saude/exames" },
    { key: "cirurgias", label: "Cirurgias", count: surgeries, href: "/saude/cirurgias" },
    { key: "retiradas", label: "Retiradas", count: withdrawals, href: "/saude/retiradas" },
  ];
  const valid = items.filter(item => Number.isSafeInteger(item.count) && item.count > 0);
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, item) => sum + item.count, 0);
  const urgency = homeAgendaUrgency(total, overdueWithdrawals);
  const openActualAgenda = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    if (onOpenAgenda) onOpenAgenda();
    else onNavigate("/hoje");
  };
  return <details ref={detailsRef} className="group mx-3 mb-2 rounded-xl border border-surface-border/35 bg-surface/25 px-2.5">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5"><CalendarDays size={14} className="shrink-0 text-ice"/>Agenda de hoje · {total} compromisso{total === 1 ? "" : "s"}{urgency.overdue > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-coral"><AlertTriangle size={11} aria-hidden="true"/>{urgency.overdue} retirada{urgency.overdue === 1 ? "" : "s"} vencida{urgency.overdue === 1 ? "" : "s"}</span>}</span>
      <ChevronDown size={14} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"/>
    </summary>
    <div className="border-t border-surface-border/30 pb-2.5 pt-2">
      {urgency.overdue > 0 && <p className="mb-2 text-[11px] leading-relaxed text-amber-200">{urgency.label}. Data vencida não comprova falta de retirada.</p>}
      <button type="button" onClick={openActualAgenda} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-ice/20 bg-ice/[.065] px-3 text-left text-xs font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><span>Ver compromissos com detalhes</span><ChevronRight size={15}/></button>
      <details className="group/tipos mt-2 rounded-lg border border-surface-border/40 bg-surface/30 px-2.5">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-medium text-ink-muted">Abrir seção por tipo <ChevronDown size={14} className="transition-transform group-open/tipos:rotate-180"/></summary>
        <div className="grid grid-cols-1 gap-1.5 border-t border-surface-border/30 pb-2 pt-2">
          {valid.map(item => <button key={item.key} type="button" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; onNavigate(item.href); }} aria-label={`${item.label}: ${item.count} compromisso(s). Abrir seção`}
            className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-surface-border/40 bg-surface-raised/40 px-3 text-left text-xs text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><span className="min-w-0 flex-1 truncate">{item.label}</span><strong className="rounded-lg bg-surface/70 px-2 py-1 text-xs tabular-nums text-ink-primary">{item.count}</strong><ChevronRight size={14} className="shrink-0 text-ink-muted"/></button>)}
        </div>
      </details>
    </div>
  </details>;
}
