"use client";

import {AlertTriangle, CheckCircle2, Database, ExternalLink, FileSearch, ShieldAlert, ShieldCheck, X} from "lucide-react";
import {brainV5Presentation, brainV5RequiresAttention} from "@/lib/health-intelligence/brain-v5";
import type {BrainV5Alert, BrainV5Feedback} from "@/lib/health-intelligence/brain-v5";

const FEEDBACK: Array<[BrainV5Feedback, string]> = [
  ["useful", "Útil"], ["already_knew", "Já sabia"], ["not_relevant", "Não relevante"],
  ["review_later", "Revisar depois"], ["dismissed", "Dispensar"],
];

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("pt-BR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"})
    : "Data indisponível";
}

export function BrainV5DetailSheet({alert, familyLabel, stateLabel, onClose, onContext, onFeedback, onToggleResolved}: {
  alert: BrainV5Alert;
  familyLabel: string;
  stateLabel: string;
  onClose: () => void;
  onContext: (href: string) => void;
  onFeedback: (value: BrainV5Feedback) => void;
  onToggleResolved: () => void;
}) {
  const presentation = brainV5Presentation(alert);
  const urgent = brainV5RequiresAttention(alert);
  const PriorityIcon = urgent ? ShieldAlert : CheckCircle2;

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="brain-detail-title" className="max-h-[calc(94dvh-env(safe-area-inset-top,0px))] w-full overflow-y-auto rounded-t-[30px] border border-surface-border bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="sticky top-0 z-10 border-b border-surface-border/50 bg-surface/95 px-5 pb-4 pt-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${urgent ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-violet-400/25 bg-violet-400/10 text-violet-300"}`}><PriorityIcon size={20}/></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em]"><span className={presentation.tone}>{presentation.label}</span><span className="text-ink-faint">{familyLabel} · {stateLabel}</span></div>
              <h2 id="brain-detail-title" className="mt-1 text-lg font-bold leading-tight text-ink-primary">{alert.snapshot.titulo}</h2>
            </div>
            <button type="button" aria-label="Fechar detalhe" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-border" onClick={onClose}><X size={19}/></button>
          </div>
        </header>

        <div className="space-y-3 px-4 pt-4 sm:px-5">
          <section className={`rounded-2xl border p-4 ${urgent ? "border-rose-400/20 bg-rose-400/[.035]" : "border-surface-border/60 bg-black/10"}`}>
            <p className="text-sm leading-relaxed text-ink-primary">{alert.snapshot.mensagem}</p>
            {urgent?<p className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-rose-200"><ShieldAlert size={13}/>Risco potencial identificado nos registros — não confirma um evento clínico.</p>:null}
            {alert.snapshot.acao_segura && <div className={`mt-3 flex gap-2 rounded-xl border p-3 ${urgent ? "border-amber-400/25 bg-amber-400/[.06]" : "border-ice/20 bg-ice/[.05]"}`}><AlertTriangle size={15} className={`mt-0.5 shrink-0 ${urgent ? "text-amber-300" : "text-ice"}`}/><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-ink-faint">Orientação segura</p><p className="mt-1 text-xs leading-relaxed text-ink-primary">{alert.snapshot.acao_segura}</p></div></div>}
          </section>

          <section className="rounded-2xl border border-surface-border/60 p-4">
            <div className="flex items-center gap-2"><FileSearch size={15} className="text-violet-300"/><h3 className="text-sm font-bold">Evidências</h3></div>
            <div className="mt-3 space-y-2">{alert.snapshot.evidencias.length ? alert.snapshot.evidencias.map(evidence => <p key={evidence} className="flex gap-2 text-xs leading-relaxed text-ink-muted"><span className="text-violet-300">•</span><span>{evidence}</span></p>) : <p className="text-xs text-ink-muted">Esta regra não forneceu evidências textuais adicionais.</p>}</div>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-border/50 bg-surface-border/50 text-[10px] text-ink-muted"><span className="bg-surface p-2.5">Confiança <strong className="block capitalize text-ink-primary">{alert.snapshot.confianca}</strong></span><span className="bg-surface p-2.5">Amostra <strong className="block text-ink-primary">{alert.snapshot.amostra}</strong></span><span className="bg-surface p-2.5">Primeira análise<strong className="block text-ink-primary">{formatDate(alert.first_detected_at)}</strong></span><span className="bg-surface p-2.5">Atualização<strong className="block text-ink-primary">{formatDate(alert.last_detected_at)}</strong></span></div>
            <p className="mt-3 text-[9px] leading-relaxed text-ink-faint">{alert.occurrences} atualização(ões) da análise · episódio {alert.episode || 1}{alert.snapshot.periodo_dias ? ` · janela ${alert.snapshot.periodo_dias} dias` : ""}. Atualizações não representam novas ocorrências clínicas.</p>
          </section>

          {alert.snapshot.limitacao_seguranca && <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-4"><h3 className="flex items-center gap-2 text-xs font-bold text-amber-300"><ShieldCheck size={15}/>Limitações e segurança</h3><p className="mt-2 text-xs leading-relaxed text-ink-muted">{alert.snapshot.limitacao_seguranca}</p></section>}
          {alert.snapshot.fontes_externas.length > 0 && <details className="group rounded-2xl border border-surface-border/60 p-4"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-bold"><Database size={15} className="text-ice"/>Fontes regulatórias revisadas<span className="ml-auto text-ink-faint">{alert.snapshot.fontes_externas.length}</span></summary><div className="border-t border-surface-border/50 pt-2">{alert.snapshot.fontes_externas.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-start gap-2 py-2 text-xs leading-relaxed text-ice"><ExternalLink size={12} className="mt-0.5 shrink-0"/><span>{source.autoridade} · {source.titulo}</span></a>)}</div></details>}
          {alert.snapshot.comparacao && <section className="grid grid-cols-2 gap-2 rounded-2xl border border-surface-border/60 p-4 text-xs text-ink-muted"><p>{alert.snapshot.comparacao.janelaAnterior}<strong className="mt-1 block text-ink-primary">{alert.snapshot.comparacao.valorAnterior}</strong></p><p>{alert.snapshot.comparacao.janelaAtual}<strong className="mt-1 block text-ink-primary">{alert.snapshot.comparacao.valorAtual}</strong></p>{alert.snapshot.cobertura_dias && <p className="col-span-2 text-[10px]">Evidências em {alert.snapshot.cobertura_dias.observados} de {alert.snapshot.cobertura_dias.total} dias.</p>}</section>}

          <section><p className="mb-2 text-[9px] font-bold uppercase tracking-[.14em] text-ink-faint">Este insight foi útil?</p><div className="flex flex-wrap gap-2">{FEEDBACK.map(([value, label]) => <button type="button" key={value} onClick={() => onFeedback(value)} className={`rounded-full border px-3 py-2 text-[10px] ${alert.feedback === value ? "border-violet-400/40 bg-violet-400/10 text-violet-300" : "border-surface-border text-ink-muted"}`}>{label}</button>)}</div></section>
          <div className="grid grid-cols-2 gap-2">{alert.snapshot.link ? <button type="button" onClick={() => onContext(alert.snapshot.link!)} className="rounded-2xl bg-ice p-3 text-sm font-bold text-void">Abrir contexto</button> : <span/>}<button type="button" onClick={onToggleResolved} className="rounded-2xl border border-surface-border p-3 text-sm">{alert.state === "resolved" ? "Reabrir" : "Marcar resolvido"}</button></div>
        </div>
      </section>
    </div>
  );
}
