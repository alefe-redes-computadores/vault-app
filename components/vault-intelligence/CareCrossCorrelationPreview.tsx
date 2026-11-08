"use client";
/** M97: observations are read-only and cannot dismiss urgent atomic alerts. */
import { ChevronRight, GitMerge, Info, Pill, Stethoscope } from "lucide-react";
import type { CareCrossCorrelation } from "@/lib/health-intelligence/care-cross-correlation";

export function CareCrossCorrelationPreview({correlations, onOpenHistory}: {
  correlations: readonly CareCrossCorrelation[];
  onOpenHistory: (medicationId:string) => void;
}) {
  if (!correlations.length) return null;
  return <details className="group mx-auto mt-3 max-w-2xl overflow-hidden rounded-[22px] border border-cyan-400/20 bg-cyan-400/[.035]">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><GitMerge size={18}/></span>
      <span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-[.16em] text-cyan-300">Brain V5.1 · correlação documental</span><strong className="mt-1 block text-sm text-ink-primary">{correlations.length} coincidência{correlations.length===1?"":"s"} entre registros</strong></span>
      <ChevronRight size={16} className="text-ink-muted transition group-open:rotate-90"/>
    </summary>
    <div className="space-y-2 border-t border-cyan-400/15 p-3">
      <p className="px-1 text-xs leading-relaxed text-ink-muted">Eventos registrados no mesmo intervalo podem merecer revisão, mas a proximidade temporal não comprova causa ou interrupção de tratamento.</p>
      {correlations.map(item => <section key={item.viewKey} className="rounded-2xl border border-surface-border/60 bg-surface p-3" aria-label="Coincidência temporal documentada">
        <div className="flex items-start gap-2"><Pill size={16} className="mt-0.5 shrink-0 text-cyan-300"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink-primary">{item.sourceMedicationName}</p><p className="mt-1 text-[10px] text-ink-muted">Últimos 14 dias · relato de eventos, não diagnóstico</p></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-muted">
          <div className="rounded-xl bg-surface-raised p-2">{item.evidenceCount.ignoredDays} dia(s) com dose ignorada</div>
          <div className="rounded-xl bg-surface-raised p-2">{item.evidenceCount.pickupNotCompleted} retirada(s) não realizada(s)</div>
          <div className="rounded-xl bg-surface-raised p-2">{item.evidenceCount.symptoms} relato(s) de sintomas/humor</div>
          <div className="rounded-xl bg-surface-raised p-2">SOS/extra: {item.evidenceCount.sosPrevious} → {item.evidenceCount.sosRecent} registros</div>
        </div>
        <details className="mt-2 rounded-xl border border-surface-border/60 p-2"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-ink-secondary"><Stethoscope size={15}/>Consultar evidências ({item.evidence.length})<ChevronRight size={13} className="ml-auto"/></summary><div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">{item.evidence.map(ref=><p key={`${ref.entityType}:${ref.entityId}`} className="text-[10px] leading-relaxed text-ink-muted">{ref.observedAt.slice(0,10)} · {ref.label} · {ref.nature==="user_reported_state"?"Relato pessoal":"Fato registrado"}</p>)}</div></details>
        <p className="mt-2 flex gap-1.5 text-[10px] leading-relaxed text-ink-faint"><Info size={13} className="mt-0.5 shrink-0"/>{item.limitations[0]} Ausência de log não confirma não adesão.</p>
        <button type="button" onClick={()=>onOpenHistory(item.sourceMedicationId)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[.06] px-3 text-xs font-semibold text-cyan-200">Abrir histórico do medicamento <ChevronRight size={15}/></button>
      </section>)}
    </div>
  </details>;
}
