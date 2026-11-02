"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Clock, Info, X } from "lucide-react";
import type { TodayRetroReviewSummary } from "@/lib/today/retro-review-projection";

export const TodayRetroReviewPanel = memo(function TodayRetroReviewPanel({
  summary, onNext, onClose,
}: {
  summary: TodayRetroReviewSummary | null;
  onNext: () => void;
  onClose: () => void;
}) {
  const progress = summary?.totalSlots
    ? Math.round((summary.confirmedSlots / summary.totalSlots) * 100)
    : 0;
  return <motion.section initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
    aria-label="Revisão retroativa assistida"
    className="rounded-[26px] border border-ice/25 bg-ice/5 p-4 shadow-sm">
    {!summary ? <div className="flex items-start gap-3">
      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-400"/>
      <div><p className="text-xs font-bold text-ink-primary">Medicamento não encontrado</p>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Não foi possível iniciar a revisão retroativa para este medicamento.</p></div>
    </div> : <>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/15 text-ice"><Clock size={19}/></div>
        <div className="min-w-0 flex-1"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ice">Revisão retroativa assistida</p>
          <h2 className="mt-1 truncate text-sm font-bold text-ink-primary">{summary.medicamento.nome}</h2>
          {summary.startDate ? <p className="mt-1 text-[10px] text-ink-muted">Período conhecido desde <strong className="text-ink-primary">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${summary.startDate}T12:00:00`))}</strong></p> : null}
        </div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted" aria-label="Sair da revisão retroativa"><X size={14}/></button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[["Previstas",summary.totalSlots,"text-ink-primary","border-surface-border/40 bg-surface-raised/70"],["Revisadas",summary.confirmedSlots,"text-emerald-400","border-emerald-400/20 bg-emerald-400/5"],["Sem confirmação",summary.pendingSlots,"text-ice","border-ice/20 bg-ice/5"]].map(([label,value,tone,box])=><div key={String(label)} className={`rounded-2xl border p-3 ${box}`}><p className={`text-[8px] font-bold uppercase tracking-wider ${tone}`}>{label}</p><p className={`mt-1 font-mono text-sm font-bold ${tone}`}>{value}</p></div>)}
      </div>
      {summary.totalSlots > 0 ? <div className="mt-3"><div className="flex items-center justify-between gap-3"><span className="text-[9px] text-ink-muted">Progresso da revisão</span><span className="font-mono text-[9px] font-bold text-ice">{progress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-border"><div className="h-full rounded-full bg-ice transition-[width] duration-500 motion-reduce:transition-none" style={{width:`${progress}%`}}/></div></div> : null}
      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-3"><Info size={13} className="mt-0.5 shrink-0 text-amber-300"/><p className="text-[9px] leading-relaxed text-ink-muted">Evidência <strong className="text-ink-primary">{summary.confidence === "limited" ? "limitada" : "delimitada"}</strong>: os slots usam a rotina atualmente conhecida. Ausência de confirmação não comprova tomada nem esquecimento.</p></div>
      <div className="mt-3 flex gap-2"><button type="button" onClick={onNext} disabled={summary.pendingSlots===0} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-ice px-4 py-3 text-[10px] font-bold text-void active:scale-[.99] disabled:opacity-40"><ChevronRight size={14}/>{summary.pendingSlots>0?"Próximo sem confirmação":"Revisão concluída"}</button><button type="button" onClick={onClose} className="rounded-2xl border border-surface-border px-4 py-3 text-[10px] font-semibold text-ink-muted">Sair</button></div>
      <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-faint">Nada é confirmado automaticamente. “Não lembro” continua sem registro e fora das métricas.</p>
    </>}
  </motion.section>;
});
