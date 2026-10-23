"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Database, ShieldCheck, X } from "lucide-react";
import type { VaultGeneralInsight } from "@/lib/vault-intelligence/types";
import { useDialogGuard } from "@/hooks/useDialogGuard";

export function VaultInsightSheet({ insight, onClose, onNavigate }: { insight: VaultGeneralInsight | null; onClose: () => void; onNavigate: (href: string) => void }) {
  useDialogGuard(Boolean(insight), onClose);
  return <AnimatePresence>{insight && <>
    <motion.button type="button" aria-label="Fechar explicação" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm" />
    <motion.section role="dialog" aria-modal="true" aria-labelledby="vault-insight-title" initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }} className="fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-[120] mx-auto max-h-[calc(88dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] max-w-lg overflow-y-auto overscroll-contain rounded-[26px] border border-surface-border bg-surface p-5 shadow-2xl">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"><ShieldCheck size={20} /></div><div className="min-w-0 flex-1"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ice">Inteligência geral explicável</p><h2 id="vault-insight-title" className="mt-1 break-words text-base font-bold text-ink-primary">{insight.title}</h2></div><button type="button" aria-label="Fechar insight" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted"><X size={17} /></button></div>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{insight.message}</p>
      <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-void p-3"><p className="text-[9px] uppercase text-ink-faint">Confiança</p><p className="mt-1 text-sm font-bold text-ink-primary">{insight.confidence}</p></div><div className="rounded-2xl bg-void p-3"><p className="text-[9px] uppercase text-ink-faint">Amostra</p><p className="mt-1 text-sm font-bold text-ink-primary">{insight.sample} registro(s)</p></div></div>
      <div className="mt-4"><div className="flex items-center gap-2 text-xs font-bold text-ink-primary"><Database size={14} className="text-ice" />Fontes internas</div><ul className="mt-2 space-y-2">{insight.sources.map((source) => <li key={source} className="rounded-xl bg-void px-3 py-2.5 text-xs leading-relaxed text-ink-secondary">{source}</li>)}</ul></div>
      <div className="mt-4"><p className="text-xs font-bold text-ink-primary">Evidências</p><ul className="mt-2 space-y-2">{insight.evidence.map((item) => <li key={item} className="rounded-xl border border-surface-border/50 px-3 py-2.5 text-xs leading-relaxed text-ink-secondary">{item}</li>)}</ul></div>
      <button type="button" onClick={() => onNavigate(insight.href)} className="mt-5 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-ice px-4 py-3.5 text-sm font-bold text-void active:scale-[.99]"><span>{insight.actionLabel}</span><ChevronRight size={18} /></button>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-ink-muted">O Vault usa apenas metadados necessários para esta análise e não revela senhas, números de cartão ou CVV.</p>
    </motion.section>
  </>}</AnimatePresence>;
}
