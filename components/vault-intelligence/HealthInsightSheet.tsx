"use client";

import { AlertTriangle, BrainCircuit, ChevronRight, Database, ExternalLink, Info, ShieldCheck, X } from "lucide-react";
import { healthPriorityPresentation } from "@/lib/health-intelligence/priority";
import type { HealthInsight } from "@/lib/health-insights";

type Props = {
  insight: HealthInsight | null;
  onClose: () => void;
  onNavigate: (href: string) => void;
  onOpenCentral?: () => void;
};

function tone(insight: HealthInsight) {
  return healthPriorityPresentation(insight).tone;
}

// VAULT_HEALTH_EXPLAINABILITY_V55
export function HealthInsightSheet({ insight, onClose, onNavigate, onOpenCentral }: Props) {
  if (!insight) return null;
  const evidence = insight.evidencias || [];
  const sources = insight.fontesInternas || [];
  const externalSources = insight.fontesExternas || [];
  const coverage = insight.coberturaDias;
  const priority=healthPriorityPresentation(insight);
  const urgent=insight.urgencia==="alta"||insight.gravidadeSeguranca==="critica"||insight.gravidadeSeguranca==="importante";

  return (
    <div className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={insight.titulo} onClick={(event) => event.stopPropagation()} className="max-h-[88dvh] w-full overscroll-contain overflow-y-auto rounded-t-[30px] border-t border-surface-border bg-surface px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 sm:px-5">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border" />
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone(insight)}`}>{urgent ? <AlertTriangle size={19} /> : <BrainCircuit size={19} />}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${tone(insight)}`}>{priority.label}</span><span className="font-mono text-[8px] uppercase text-ink-faint">{insight.kind === "pattern" ? "Padrão longitudinal" : "Sinal de saúde"}</span></div><h2 className="mt-2 text-lg font-bold leading-snug">{insight.titulo}</h2></div>
            <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" aria-label="Fechar"><X size={19} /></button>
          </div>
          <p className="mt-4 border-l-2 border-violet-300/30 pl-3 text-sm leading-relaxed text-ink-muted">{insight.mensagem}</p>
          {urgent&&insight.acaoSegura?<div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.055] p-3"><div className="flex items-center gap-2 text-amber-200"><ShieldCheck size={15}/><p className="text-[10px] font-bold uppercase tracking-wide">Orientação segura</p></div><p className="mt-2 text-xs leading-relaxed text-ink-primary">{insight.acaoSegura}</p></div>:null}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-y border-surface-border/70 py-3 text-[10px] text-ink-muted"><span>Confiança <strong className="capitalize text-ink-primary">{insight.confianca}</strong></span><span>Amostra <strong className="text-ink-primary">{insight.amostra}</strong></span><span>Período <strong className="text-ink-primary">{insight.periodoDias ? `${insight.periodoDias} dias` : "Atual"}</strong></span></div>
          {insight.comparacao && <div className="mt-3 rounded-2xl border border-surface-border p-3 text-xs text-ink-muted"><p>{insight.comparacao.janelaAnterior}: <strong>{insight.comparacao.valorAnterior}</strong></p><p className="mt-1">{insight.comparacao.janelaAtual}: <strong>{insight.comparacao.valorAtual}</strong></p><p className="mt-2 text-[10px]">{insight.comparacao.tendencia === "aumento" ? "Aumento nos registros" : insight.comparacao.tendencia === "queda" ? "Queda nos registros" : "Sem variação"}</p></div>}
          {insight.limitacaoSeguranca && <div className="mt-3 flex items-start gap-2 rounded-xl bg-void/25 p-3"><Info size={14} className="mt-0.5 shrink-0 text-ink-faint"/><div><p className="text-[9px] font-bold uppercase text-ink-faint">Limitações e segurança</p><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{insight.limitacaoSeguranca}</p></div></div>}
          {coverage && <div className="mt-3 rounded-2xl border border-sky-400/15 bg-sky-400/[0.05] p-3"><div className="flex items-center gap-2 text-sky-300"><Database size={14} /><b className="text-[10px]">Cobertura observada</b></div><p className="mt-1 text-[10px] text-ink-muted">{coverage.observados} de {coverage.total} dias com evidência considerada.</p></div>}
          {evidence.length > 0 && <div className="mt-5"><p className="font-mono text-[9px] font-bold uppercase text-ink-faint">Por que o Vault mostrou isso?</p><div className="mt-2 space-y-2">{evidence.slice(0, 6).map((item, index) => <div key={`${item}-${index}`} className="rounded-2xl bg-void/30 px-3 py-2.5 text-[10px] leading-relaxed text-ink-muted">{item}</div>)}</div></div>}
          {sources.length > 0 && <div className="mt-4 rounded-2xl border border-surface-border bg-void/20 p-3"><div className="flex items-center gap-2"><ShieldCheck size={14} className="text-ice" /><b className="text-[10px]">Fontes internas</b></div><p className="mt-1 text-[10px] text-ink-muted">{sources.join(" · ")}</p></div>}
          {externalSources.length>0?<details className="mt-3 rounded-xl border border-surface-border bg-void/20 p-3"><summary className="min-h-11 cursor-pointer content-center text-[10px] font-semibold text-ink-primary">Fontes regulatórias · {externalSources.length}</summary><ul className="mt-2 space-y-2">{externalSources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-[10px] text-ice"><span className="min-w-0 flex-1"><strong className="block truncate">{source.autoridade}</strong><span className="mt-0.5 block text-ink-muted">{source.titulo}</span></span><ExternalLink size={13} className="shrink-0"/></a></li>)}</ul></details>:null}
          {!urgent&&insight.acaoSegura?<div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3"><p className="font-mono text-[8px] uppercase text-emerald-300">Próximo passo seguro</p><p className="mt-1 text-[11px] text-ink-muted">{insight.acaoSegura}</p></div>:null}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {insight.link && <button type="button" onClick={() => onNavigate(insight.link!)} className="flex w-full items-center justify-between rounded-xl bg-ice px-4 py-3 text-sm font-bold text-void">Abrir contexto<ChevronRight size={17} /></button>}
            {onOpenCentral && <button type="button" onClick={onOpenCentral} className="flex w-full items-center justify-between rounded-xl border border-violet-400/25 px-4 py-3 text-sm font-semibold text-violet-300">Ver análise completa<ChevronRight size={17}/></button>}
          </div>
          <p className="mt-4 text-center text-[9px] text-ink-faint">O Vault organiza sinais do histórico registrado. Ele não diagnostica nem substitui avaliação profissional.</p>
        </div>
      </section>
    </div>
  );
}
