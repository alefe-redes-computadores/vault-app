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
  current: { label: "Referência vigente", tone: "bg-emerald-400/10 text-emerald-300" },
};

/** P15 R4: apresentação somente. Validade, vínculos e comandos continuam no dossiê autorizado. */
export function MedicationPrescriptionCard({ typeLabel, badge, status, issuedAt, expiresAt, nextAt, validityLabel, nextLabel, hasAttachment, onPlan, onAttachment, onLink, onReceived }: Props) {
  const state = statePresentation[status];
  return <div className="rounded-[18px] border border-surface-border/60 bg-surface p-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-primary"><FileText size={14} aria-hidden="true"/>{typeLabel}</span>
        {badge && <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge.colorClass}`}>{badge.label}</span>}
      </div>
      <span role="status" className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${state.tone}`}>{state.label}</span>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-border/50 pt-3">
      <div className="min-w-0"><dt className="text-[9px] font-bold uppercase text-ink-muted">Emissão</dt><dd className="mt-0.5 break-words text-sm font-bold text-ink-primary">{issuedAt}</dd></div>
      <div className="min-w-0"><dt className="text-[9px] font-bold uppercase text-ink-muted">{validityLabel}</dt><dd className="mt-0.5 break-words text-sm font-bold text-ink-primary">{expiresAt}</dd></div>
    </dl>
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-raised/40 px-3 py-2">
      <div className="min-w-0"><p className="text-[9px] font-bold uppercase text-ink-muted">{nextLabel}</p><p className="mt-0.5 break-words text-xs font-semibold text-ink-primary">{nextAt}</p></div>
      <button type="button" onClick={onPlan} className="min-h-11 rounded-xl border border-surface-border/60 px-3 text-[10px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Ajustar data</button>
    </div>
    <details className="mt-2 rounded-xl border border-surface-border/40 px-3 py-1 text-ink-muted">
      <summary className="min-h-11 cursor-pointer py-2 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Receita vinculada ou recebida?</summary>
      <p className="pb-2 text-[11px] leading-relaxed">Vincular um documento não registra seu recebimento nem comprova a validade da prescrição. Use o registro específico quando receber a receita.</p>
    </details>
    <div className="mt-3 grid gap-2 border-t border-surface-border/50 pt-3 min-[420px]:grid-cols-2">
      <button type="button" onClick={hasAttachment ? onAttachment : onLink} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border/70 bg-surface-raised/40 px-2 py-2 text-[11px] font-semibold text-ink-secondary transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
        {hasAttachment ? <><ExternalLink size={14} aria-hidden="true"/>Ver anexo da receita</> : <><Plus size={14} aria-hidden="true"/>Vincular receita</>}
      </button>
      <button type="button" onClick={onReceived} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.09] px-2 py-2 text-[11px] font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><FileText size={14} aria-hidden="true"/>Registrar receita recebida</button>
    </div>
  </div>;
}
