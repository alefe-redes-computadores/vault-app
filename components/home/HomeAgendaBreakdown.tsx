"use client";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { homeAgendaUrgency } from "@/lib/home/agenda-urgency";
import { useDismissibleDetails } from "@/hooks/useDismissibleDetails";

type Entry = { key: string; label: string; count: number; href: string };
/** One collapsed, on-demand breakdown of events already selected by Home.
 * No hook, query, state or second authority; navigation/haptics stay in Home.
 */
export function HomeAgendaBreakdown({ consultations, exams, surgeries, withdrawals, overdueWithdrawals = 0, onNavigate }: {
  consultations: number;
  exams: number;
  surgeries: number;
  withdrawals: number;
  overdueWithdrawals?: number;
  onNavigate: (href: string) => void;
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
  return <details ref={detailsRef} className="group mx-3 mb-2 border-t border-surface-border/30 px-1 pt-1">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">Agenda de hoje · {total} compromisso{total === 1 ? "" : "s"}{urgency.overdue > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-coral"><AlertTriangle size={11} aria-hidden="true"/>{urgency.overdue} retirada{urgency.overdue === 1 ? "" : "s"} vencida{urgency.overdue === 1 ? "" : "s"}</span>}</span>
      <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none"/>
    </summary>
    <div className="border-t border-surface-border/30 py-2">
      {urgency.overdue > 0 && <p className="mb-2 text-[10px] leading-relaxed text-amber-200">{urgency.label}. Confira a situação: data vencida não comprova falta de retirada.</p>}
      <div className="grid grid-cols-1 gap-1.5">
      {valid.map(item => <button key={item.key} type="button" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; onNavigate(item.href); }}
        aria-label={`${item.label}: ${item.count} compromisso(s). Abrir seção`}
        className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-surface-border/40 bg-surface-raised/40 px-3 text-left text-xs text-ink-secondary transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice motion-reduce:transition-none">
        <span className="min-w-0 flex-1 truncate">{item.label}</span><strong className="rounded-lg bg-surface/70 px-2 py-1 text-xs tabular-nums text-ink-primary">{item.count}</strong><ChevronDown size={13} className="-rotate-90 text-ink-faint" aria-hidden="true"/>
      </button>)}
      </div>
    </div>
  </details>;
}
