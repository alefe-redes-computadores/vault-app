import { CalendarClock, CheckCircle2, ChevronRight, FileText, ShoppingBag } from "lucide-react";
import type { MedicationJourneySnapshot } from "@/lib/health-intelligence/medication-workspace";
import { medicationJourneySignal } from "@/lib/health-intelligence/medication-journey-signal";

const formatDay = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
// P11: read-only presentation — these counts are distinct, never additive stock.
const journeyHeadline = (snapshot: MedicationJourneySnapshot) => snapshot.overdueWithdrawals > 0
  ? `${snapshot.overdueWithdrawals} retirada(s) agendada(s) com data vencida`
  : snapshot.pendingWithdrawals > 0 ? `${snapshot.pendingWithdrawals} retirada(s) agendada(s) em aberto`
  : snapshot.plannedAcquisitions > 0 ? `${snapshot.plannedAcquisitions} aquisição(ões) planejada(s), ainda não realizada(s)`
  : "Receitas, compras e retiradas com registros separados";

export function MedicationJourneySummary({ snapshot, medicationId, onNavigate }: { snapshot: MedicationJourneySnapshot; medicationId?: string; onNavigate?: (href: string) => void }) {
  const signal = medicationJourneySignal(snapshot);
  const items = [
    { label: "Receitas", value: snapshot.prescriptions, detail: snapshot.latestPrescriptionDate ? `Última ${formatDay(snapshot.latestPrescriptionDate)}` : "Nenhuma registrada", icon: FileText, tone: "text-violet-300", href: medicationId ? `/saude/medicamentos/historico?id=${encodeURIComponent(medicationId)}` : "" },
    { label: "Aquisições", value: snapshot.completedAcquisitions, detail: snapshot.latestAcquisitionDate ? `Última ${formatDay(snapshot.latestAcquisitionDate)}` : "Nenhuma realizada", icon: ShoppingBag, tone: "text-emerald-300", href: medicationId ? `/saude/renovacao?medicamento_id=${encodeURIComponent(medicationId)}` : "" },
    { label: "Planejadas", value: snapshot.plannedAcquisitions, detail: snapshot.nextPlannedAcquisitionDate ? `Próxima ${formatDay(snapshot.nextPlannedAcquisitionDate)}` : "Nenhuma futura", icon: CalendarClock, tone: "text-ice", href: medicationId ? `/saude/renovacao?medicamento_id=${encodeURIComponent(medicationId)}` : "" },
    { label: "Retiradas", value: snapshot.pendingWithdrawals, detail: snapshot.overdueWithdrawals ? `${snapshot.overdueWithdrawals} atrasada(s)` : snapshot.nextWithdrawalDate ? `Próxima ${formatDay(snapshot.nextWithdrawalDate)}` : "Nenhuma pendente", icon: CheckCircle2, tone: snapshot.overdueWithdrawals ? "text-coral" : "text-amber-300", href: medicationId ? `/saude/retiradas?medicamento_id=${encodeURIComponent(medicationId)}` : "" },
  ];
  // M12: grupos sem registros permanecem navegáveis, mas não ocupam quatro linhas de zeros.
  const recorded=items.filter(item=>item.value>0);
  const remaining=items.filter(item=>item.value===0);
  const renderRows=(chosen: typeof items) => (    <div className="mt-2 divide-y divide-surface-border/50 overflow-hidden rounded-xl border border-surface-border/60 bg-surface-raised/40">{chosen.map(({label,value,detail,icon:Icon,tone,href})=>{ const content=<><Icon size={14} className={`shrink-0 ${tone}`}/><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase text-ink-muted">{label}</span><span className={`mt-0.5 block truncate text-xs ${tone}`}>{detail}</span></span><strong className="text-sm tabular-nums text-ink-primary" aria-label={`${value} ${label.toLocaleLowerCase("pt-BR")}`}>{value}</strong>{href&&onNavigate?<ChevronRight size={13} className="shrink-0 text-ink-faint"/>:null}</>; return href&&onNavigate?<button type="button" onClick={()=>onNavigate(href)} aria-label={`Abrir histórico de ${label.toLocaleLowerCase("pt-BR")}`} key={label} className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-300 active:bg-white/[.025]">{content}</button>:<div key={label} className="flex min-h-12 items-center gap-2.5 px-3 py-2">{content}</div>;})}</div>);
  return <section aria-label="Linha do tempo operacional do medicamento" className="rounded-[20px] border border-surface-border/70 bg-surface p-3">
    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">Histórico separado</p><h2 className="mt-0.5 text-sm font-bold text-ink-primary">Eventos e datas</h2><p className="mt-1 text-[11px] leading-snug text-ink-muted">{journeyHeadline(snapshot)}</p></div><span className="rounded-full border border-surface-border px-2 py-1 text-[10px] text-ink-muted">Sem inferir estoque</span></div>
    <p className={`mt-2 rounded-lg border px-2.5 py-2 text-[10px] leading-relaxed ${signal.tone === "attention" ? "border-coral/20 bg-coral/[.05] text-coral" : signal.tone === "planning" ? "border-amber-300/15 bg-amber-300/[.035] text-amber-200" : "border-surface-border/40 text-ink-muted"}`}><strong className="mr-1">{signal.label}.</strong>{signal.explanation}</p>
    {snapshot.overdueWithdrawals>0&&medicationId&&onNavigate?<button type="button" onClick={()=>onNavigate(`/saude/retiradas?medicamento_id=${encodeURIComponent(medicationId)}`)} className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.055] px-3 text-left text-xs font-semibold text-amber-200"><span>{snapshot.overdueWithdrawals} retirada(s) ainda agendada(s) após a data · revisar situação</span><ChevronRight size={14}/></button>:null}
    {snapshot.plannedAcquisitions>0&&snapshot.nextPlannedAcquisitionDate?<p className="mt-2 text-[10px] text-cyan-200">Compra futura registrada para {formatDay(snapshot.nextPlannedAcquisitionDate)}. Ainda não é aquisição realizada.</p>:null}
    {recorded.length>0 ? renderRows(recorded) : <p className="mt-2 rounded-xl border border-surface-border/40 px-3 py-2.5 text-[11px] text-ink-muted">Nenhum evento registrado. Receita, aquisição e retirada continuam independentes.</p>}
    {remaining.length>0 ? <details className="group mt-2 rounded-lg border border-surface-border/40 px-2.5 py-1"><summary className="flex min-h-10 cursor-pointer items-center justify-between gap-2 text-[11px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Outras etapas · {remaining.length}<span aria-hidden="true">▾</span></summary>{renderRows(remaining)}</details> : null}
    <details className="mt-2 rounded-lg border border-surface-border/40 px-3 py-2">
      <summary className="min-h-8 cursor-pointer text-[11px] font-semibold text-ink-muted">Entenda os eventos e o estoque</summary>
      <p className="pt-2 text-xs leading-relaxed text-ink-muted">Os totais mostram situações diferentes, sem somar eventos de natureza distinta. Receita, aquisição e retirada são eventos independentes. Planejamento futuro não registra compra, gasto nem entrada no estoque.</p>
    </details>
  </section>;
}
