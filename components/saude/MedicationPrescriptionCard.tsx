"use client";

import { ExternalLink, FileText, Plus } from "lucide-react";

type PrescriptionStatus = "missing" | "undetermined" | "expired" | "due_today" | "current";
type Props = {
  typeLabel: string;
  badge?: { label: string; colorClass: string } | null;
  status: PrescriptionStatus;
  issuedAt: string;
  expiresAt: string;
  nextAt: string;
  validityLabel: string;
  nextLabel: string;
  hasAttachment: boolean;
  onPlan: () => void;
  onAttachment: () => void;
  onLink: () => void;
  onReceived: () => void;
};

const statePresentation: Record<PrescriptionStatus, { label: string; tone: string }> = {
  missing: { label: "Sem emissão", tone: "bg-surface-raised text-ink-muted" },
  undetermined: { label: "Sem prazo calculado", tone: "bg-surface-raised text-ink-muted" },
  expired: { label: "Referência vencida", tone: "bg-coral/10 text-coral" },
  due_today: { label: "Vence hoje", tone: "bg-amber-400/10 text-amber-300" },
  current: { label: "Referência vigente", tone: "bg-emerald-500 text-void" },
};

/** P15 R4: apresentação somente. Validade, vínculos e comandos continuam no dossiê autorizado. */
export function MedicationPrescriptionCard({ typeLabel, badge, status, issuedAt, expiresAt, nextAt, validityLabel, nextLabel, hasAttachment, onPlan, onAttachment, onLink, onReceived }: Props) {
  const state = statePresentation[status];
  return <div className="rounded-[20px] border border-surface-border bg-surface p-3.5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-primary"><FileText size={14} aria-hidden="true"/>{typeLabel}</span>
        {badge && <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${badge.colorClass}`}>{badge.label}</span>}
      </div>
      <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${state.tone}`}>{state.label}</span>
    </div>
    <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-surface-border/50 pt-3 min-[360px]:grid-cols-2">
      <div className="min-w-0"><dt className="text-[9px] font-bold uppercase text-ink-muted">Emissão</dt><dd className="mt-0.5 break-words text-sm font-bold text-ink-primary">{issuedAt}</dd></div>
      <div className="min-w-0"><dt className="text-[9px] font-bold uppercase text-ink-muted">{validityLabel}</dt><dd className="mt-0.5 break-words text-sm font-bold text-ink-primary">{expiresAt}</dd></div>
    </dl>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-raised/60 px-3 py-2.5">
      <div className="min-w-0"><p className="text-[9px] font-bold uppercase text-ink-muted">{nextLabel}</p><p className="mt-0.5 break-words text-xs font-semibold text-ink-primary">{nextAt}</p></div>
      <button type="button" onClick={onPlan} className="min-h-11 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3 text-[10px] font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">Ajustar data</button>
    </div>
    <div className="mt-4 space-y-2 border-t border-surface-border/50 pt-3">
      <button type="button" onClick={hasAttachment ? onAttachment : onLink} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2.5 text-xs font-bold text-ice transition-colors hover:bg-ice/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        {hasAttachment ? <><ExternalLink size={14} aria-hidden="true"/>Ver anexo da receita</> : <><Plus size={14} aria-hidden="true"/>Vincular receita</>}
      </button>
      <button type="button" onClick={onReceived} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 text-xs font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><FileText size={14} aria-hidden="true"/>Registrar receita recebida</button>
    </div>
  </div>;
}
