"use client";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardList, PackageCheck, ShoppingBag, Truck, TriangleAlert } from "lucide-react";
import type { Farmacia, LocalSaude, Medicamento, Renovacao, Retirada } from "@/lib/types";
import { projectSupplyContinuityA3, type SupplyContinuityEventA3 } from "@/lib/health-supply/a3-continuity";

const EVENT_LABELS: Record<SupplyContinuityEventA3["kind"],string> = {
  prescription:"Receita registrada", acquisition:"Aquisição confirmada", legacy_uncertain:"Registro antigo · conferir",
  withdrawal_scheduled:"Retirada agendada",withdrawal_realized:"Retirada realizada",
  withdrawal_cancelled:"Retirada cancelada",withdrawal_not_realized:"Retirada não realizada",
};
const colors: Record<SupplyContinuityEventA3["kind"],string> = {
  prescription:"text-sky-300",acquisition:"text-emerald-300",legacy_uncertain:"text-amber-200",
  withdrawal_scheduled:"text-cyan-300",withdrawal_realized:"text-emerald-300",
  withdrawal_cancelled:"text-ink-muted",withdrawal_not_realized:"text-amber-200",
};
const day = (value:string)=>value.split("-").reverse().join("/");
function EventCard({event,today}:{event:SupplyContinuityEventA3;today:string}) {
  const late=event.kind==="withdrawal_scheduled"&&event.date<today;
  const Icon=event.kind==="prescription"?ClipboardList:event.kind==="acquisition"?ShoppingBag:
    event.kind==="withdrawal_realized"?CheckCircle2:event.kind==="legacy_uncertain"?TriangleAlert:Truck;
  return <Link href={event.href} className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-surface-border/65 bg-surface/60 p-3 text-left transition-colors hover:border-emerald-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300" aria-label={`${EVENT_LABELS[event.kind]}: ${event.medicationName}, ${day(event.date)}`}>
    <span className={`grid size-9 shrink-0 place-items-center rounded-lg border border-surface-border bg-surface-raised ${colors[event.kind]}`}><Icon size={17} aria-hidden="true"/></span>
    <span className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{event.medicationName}</strong><span className={`mt-0.5 block text-[11px] font-semibold ${colors[event.kind]}`}>{late?"Retirada ainda agendada · data passada":EVENT_LABELS[event.kind]}{event.prescriptionRevision?` · versão ${event.prescriptionRevision}`:""}</span><span className="mt-0.5 block break-words text-[10px] leading-snug text-ink-muted">{day(event.date)}{event.pharmacyName?` · ${event.pharmacyName}`:event.locationName?` · ${event.locationName}`:""}{event.historicalLocation?" · local registrado no evento":""}{event.linkedWithdrawalId?" · vinculada à retirada":""}</span></span>
    <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true"/>
  </Link>;
}
export function SupplyContinuityA3({userId,personId,medicationIds,medications,renewals,withdrawals,pharmacies,places,today}: {
  userId:string;personId:string;medicationIds:ReadonlySet<string>;medications:readonly Medicamento[];
  renewals:readonly Renovacao[];withdrawals:readonly Retirada[];pharmacies:readonly Farmacia[];places:readonly LocalSaude[];today:string;
}) {
  const a1Links=useLiveQuery(async()=>userId&&personId?db.a1_prescription_links.where("person_id").equals(personId)
    .filter(row=>row.user_id===userId&&!row.deleted_at).toArray():[],[userId,personId])||[];
  const snapshot=useMemo(()=>projectSupplyContinuityA3({userId,personId,medicationIds,medications,renewals,a1Links,withdrawals,pharmacies,places,today}),
    [userId,personId,medicationIds,medications,renewals,a1Links,withdrawals,pharmacies,places,today]);
  if (!medicationIds.size) return null;
  const first=snapshot.events.slice(0,9),rest=snapshot.events.slice(9);
  const scopedMedications=medications.filter(m=>m.id && m.user_id===userId && m.person_id===personId && medicationIds.has(m.id));
  const knownBalances=scopedMedications.filter(m=>typeof m.estoque_quantidade==="number" && Number.isFinite(m.estoque_quantidade) && m.estoque_quantidade>=0).length;
  return <section aria-label="Continuidade de receitas, aquisições e retiradas" className="min-w-0 rounded-[20px] border border-emerald-300/20 bg-surface/60 p-3 sm:p-4">
    <div className="flex min-w-0 items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200"><PackageCheck size={18}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Receitas e fornecimento · linha real</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Registros dos medicamentos deste processo, vinculados por ID. Não presumimos que cada registro pertença ao ciclo atual; receita não significa compra ou retirada.</p></div></div>
    {/* B7: factual situation and next action on the same canonical supply screen. */}
    <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 min-[390px]:grid-cols-2">
      <section aria-label="Situação atual" className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">Situação atual</p>
        <p className="mt-1 text-xs text-ink-primary">{scopedMedications.length} medicamento(s) vinculado(s)</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-muted">Saldo declarado no cadastro: conhecido em {knownBalances} de {scopedMedications.length}. Não calculamos dias sem confirmação da rotina.</p>
      </section>
      <section aria-label="Próxima ação" className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-200">Próxima ação</p>
        <p className="mt-1 text-xs text-ink-primary">{snapshot.overdueWithdrawals ? `Conferir ${snapshot.overdueWithdrawals} retirada(s) agendada(s) com data passada` : snapshot.nextScheduled ? `Retirada cadastrada para ${day(snapshot.nextScheduled.date)}` : "Sem retirada futura vinculada"}</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-muted">Somente planejamento informado; nenhuma retirada é concluída ou renovação criada pelo relógio.</p>
      </section>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
      {[{value:snapshot.prescriptions,label:"Eventos de receita"},{value:snapshot.acquisitions,label:"Aquisições avulsas"},{value:snapshot.realizedWithdrawals,label:"Retiradas realizadas"},{value:snapshot.scheduledWithdrawals,label:"Retiradas agendadas"}].map(metric=><div key={metric.label} className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised p-2.5"><strong className="block text-base font-bold tabular-nums text-ink-primary">{metric.value}</strong><span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">{metric.label}</span></div>)}
    </div>
    {snapshot.nextScheduled&&<p className="mt-2 flex items-center gap-2 text-[11px] text-cyan-200"><CalendarClock size={14} aria-hidden="true"/>Próxima retirada ainda agendada: {day(snapshot.nextScheduled.date)}</p>}
    {snapshot.overdueWithdrawals>0&&<p className="mt-2 flex items-center gap-2 text-[11px] text-amber-200"><TriangleAlert size={14} aria-hidden="true"/>{snapshot.overdueWithdrawals} retirada(s) ainda agendada(s) com data passada. Conferir, sem concluir automaticamente.</p>}
    <details className="group mt-3 rounded-xl border border-surface-border/65 bg-surface-raised/40 px-2.5 py-1"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-left text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="min-w-0 flex-1">Histórico registrado · {snapshot.events.length}</span><ChevronRight size={16} className="shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"/></summary>
      <div className="space-y-2 pb-2">{snapshot.events.length===0?<p className="px-1 py-2 text-xs text-ink-muted">Nenhum evento explícito localizado para esses medicamentos. Não é confirmação de ausência de receita cadastrada no medicamento.</p>:first.map(event=><EventCard key={event.key} event={event} today={today}/>)}
        {rest.length>0&&<details className="rounded-xl border border-surface-border/50 p-2"><summary className="flex min-h-11 cursor-pointer items-center px-2 text-xs font-medium text-ink-secondary">Ver mais {rest.length} registros</summary><div className="space-y-2 py-2">{rest.map(event=><EventCard key={event.key} event={event} today={today}/>)}</div></details>}
        {snapshot.uncertainLegacy>0&&<p className="text-[11px] leading-relaxed text-amber-200">{snapshot.uncertainLegacy} registro(s) anterior(es) sem evidência suficiente para distinguir receita e aquisição. Mantidos para conferência, sem inventar eventos.</p>}
        <p className="text-[10px] leading-relaxed text-ink-muted">Eventos novos podem guardar o nome e endereço informados quando foram registrados. Registros antigos sem snapshot mostram o nome cadastrado atualmente e não são apresentados como prova histórica de local. Nenhum estoque é recalculado aqui.</p>
      </div>
    </details>
  </section>;
}
