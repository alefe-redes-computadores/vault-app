import { CalendarClock, CheckCircle2, FileText, ShoppingBag } from "lucide-react";
import type { MedicationJourneySnapshot } from "@/lib/health-intelligence/medication-workspace";

const formatDay = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";

export function MedicationJourneySummary({ snapshot, medicationId, onNavigate }: { snapshot: MedicationJourneySnapshot; medicationId?: string; onNavigate?: (href: string) => void }) {
  const items = [
    { label: "Receitas", value: snapshot.prescriptions, detail: snapshot.latestPrescriptionDate ? `Última ${formatDay(snapshot.latestPrescriptionDate)}` : "Nenhuma registrada", icon: FileText, tone: "text-violet-300", href: medicationId ? `/saude/medicamentos/historico?id=${encodeURIComponent(medicationId)}` : "" },
    { label: "Aquisições", value: snapshot.completedAcquisitions, detail: snapshot.latestAcquisitionDate ? `Última ${formatDay(snapshot.latestAcquisitionDate)}` : "Nenhuma realizada", icon: ShoppingBag, tone: "text-emerald-300", href: medicationId ? `/saude/renovacao?medicamento_id=${encodeURIComponent(medicationId)}` : "" },
    { label: "Planejadas", value: snapshot.plannedAcquisitions, detail: snapshot.nextPlannedAcquisitionDate ? `Próxima ${formatDay(snapshot.nextPlannedAcquisitionDate)}` : "Nenhuma futura", icon: CalendarClock, tone: "text-ice", href: medicationId ? `/saude/renovacao?medicamento_id=${encodeURIComponent(medicationId)}` : "" },
    { label: "Retiradas", value: snapshot.pendingWithdrawals, detail: snapshot.overdueWithdrawals ? `${snapshot.overdueWithdrawals} atrasada(s)` : snapshot.nextWithdrawalDate ? `Próxima ${formatDay(snapshot.nextWithdrawalDate)}` : "Nenhuma pendente", icon: CheckCircle2, tone: snapshot.overdueWithdrawals ? "text-coral" : "text-amber-300", href: medicationId ? `/saude/retiradas?medicamento_id=${encodeURIComponent(medicationId)}` : "" },
  ];
  return <section aria-label="Linha do tempo operacional do medicamento" className="rounded-[20px] border border-surface-border/70 bg-surface p-3.5">
    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted">Histórico separado</p><h2 className="mt-1 text-sm font-bold text-ink-primary">Jornada do medicamento</h2></div><span className="rounded-full border border-surface-border px-2 py-1 text-[8px] text-ink-muted">Sem inferir estoque</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2">{items.map(({label,value,detail,icon:Icon,tone,href})=>{ const content=<><div className="flex items-center gap-1.5"><Icon size={13} className={tone}/><span className="text-[9px] font-bold uppercase text-ink-muted">{label}</span><strong className="ml-auto text-sm text-ink-primary">{value}</strong></div><p className={`mt-1 truncate text-[9px] ${tone}`}>{detail}</p></>; return href&&onNavigate?<button type="button" onClick={()=>onNavigate(href)} aria-label={`Abrir histórico de ${label.toLocaleLowerCase("pt-BR")}`} key={label} className="min-h-14 min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised/55 p-2.5 text-left active:scale-[0.98]">{content}</button>:<div key={label} className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised/55 p-2.5">{content}</div>;})}</div>
    <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Receita, aquisição e retirada são eventos independentes. Planejamento futuro não registra compra, gasto nem entrada no estoque.</p>
  </section>;
}
