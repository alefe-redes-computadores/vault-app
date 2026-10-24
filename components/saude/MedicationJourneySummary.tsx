import { CalendarClock, CheckCircle2, FileText, ShoppingBag } from "lucide-react";
import type { MedicationJourneySnapshot } from "@/lib/health-intelligence/medication-workspace";

const formatDay = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";

export function MedicationJourneySummary({ snapshot }: { snapshot: MedicationJourneySnapshot }) {
  const items = [
    { label: "Receitas", value: snapshot.prescriptions, detail: snapshot.latestPrescriptionDate ? `Última ${formatDay(snapshot.latestPrescriptionDate)}` : "Nenhuma registrada", icon: FileText, tone: "text-violet-300" },
    { label: "Aquisições", value: snapshot.completedAcquisitions, detail: snapshot.latestAcquisitionDate ? `Última ${formatDay(snapshot.latestAcquisitionDate)}` : "Nenhuma realizada", icon: ShoppingBag, tone: "text-emerald-300" },
    { label: "Planejadas", value: snapshot.plannedAcquisitions, detail: snapshot.nextPlannedAcquisitionDate ? `Próxima ${formatDay(snapshot.nextPlannedAcquisitionDate)}` : "Nenhuma futura", icon: CalendarClock, tone: "text-ice" },
    { label: "Retiradas", value: snapshot.pendingWithdrawals, detail: snapshot.overdueWithdrawals ? `${snapshot.overdueWithdrawals} atrasada(s)` : snapshot.nextWithdrawalDate ? `Próxima ${formatDay(snapshot.nextWithdrawalDate)}` : "Nenhuma pendente", icon: CheckCircle2, tone: snapshot.overdueWithdrawals ? "text-coral" : "text-amber-300" },
  ];
  return <section aria-label="Linha do tempo operacional do medicamento" className="rounded-[20px] border border-surface-border/70 bg-surface p-3.5">
    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted">Histórico separado</p><h2 className="mt-1 text-sm font-bold text-ink-primary">Jornada do medicamento</h2></div><span className="rounded-full border border-surface-border px-2 py-1 text-[8px] text-ink-muted">Sem inferir estoque</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2">{items.map(({label,value,detail,icon:Icon,tone})=><div key={label} className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised/55 p-2.5"><div className="flex items-center gap-1.5"><Icon size={13} className={tone}/><span className="text-[9px] font-bold uppercase text-ink-muted">{label}</span><strong className="ml-auto text-sm text-ink-primary">{value}</strong></div><p className={`mt-1 truncate text-[9px] ${tone}`}>{detail}</p></div>)}</div>
    <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Receita, aquisição e retirada são eventos independentes. Planejamento futuro não registra compra, gasto nem entrada no estoque.</p>
  </section>;
}
