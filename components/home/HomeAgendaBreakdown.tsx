"use client";
import { ChevronDown } from "lucide-react";

type Entry = { key: string; label: string; count: number; href: string };
/** One collapsed, on-demand breakdown of events already selected by Home.
 * No hook, query, state or second authority; navigation/haptics stay in Home.
 */
export function HomeAgendaBreakdown({ consultations, exams, surgeries, withdrawals, onNavigate }: {
  consultations: number;
  exams: number;
  surgeries: number;
  withdrawals: number;
  onNavigate: (href: string) => void;
}) {
  const items: Entry[] = [
    { key: "consultas", label: "Consultas", count: consultations, href: "/saude/consultas" },
    { key: "exames", label: "Exames", count: exams, href: "/saude/exames" },
    { key: "cirurgias", label: "Cirurgias", count: surgeries, href: "/saude/cirurgias" },
    { key: "retiradas", label: "Retiradas", count: withdrawals, href: "/saude/retiradas" },
  ];
  const valid = items.filter(item => Number.isSafeInteger(item.count) && item.count > 0);
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, item) => sum + item.count, 0);
  return <details className="group mx-3 mb-3 rounded-xl border border-surface-border/40 bg-surface/40 px-3 py-1.5">
    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <span>Agenda de hoje · {total} compromisso{total === 1 ? "" : "s"}</span>
      <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none"/>
    </summary>
    <div className="grid grid-cols-2 gap-1.5 border-t border-surface-border/30 py-2">
      {valid.map(item => <button key={item.key} type="button" onClick={() => onNavigate(item.href)}
        aria-label={`${item.label}: ${item.count} compromisso(s). Abrir seção`}
        className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border border-surface-border/40 bg-surface-raised/40 px-2.5 text-left text-[11px] text-ink-secondary transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice motion-reduce:transition-none">
        <span className="truncate">{item.label}</span><strong className="tabular-nums text-ink-primary">{item.count}</strong>
      </button>)}
    </div>
  </details>;
}
