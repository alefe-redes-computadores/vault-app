"use client";

import { AlertTriangle, BrainCircuit, ChevronRight, Database, ShieldCheck, X } from "lucide-react";
import type { HealthInsight } from "@/lib/health-insights";

type Props = {
  insight: HealthInsight | null;
  onClose: () => void;
  onNavigate: (href: string) => void;
};

function tone(insight: HealthInsight) {
  if (insight.gravidadeSeguranca === "critica" || insight.urgencia === "alta") return "border-coral/30 bg-coral/10 text-coral";
  if (insight.kind === "pattern") return "border-violet-400/25 bg-violet-400/10 text-violet-300";
  return "border-ice/25 bg-ice/10 text-ice";
}

// VAULT_HEALTH_EXPLAINABILITY_V55
export function HealthInsightSheet({ insight, onClose, onNavigate }: Props) {
  if (!insight) return null;
  const evidence = insight.evidencias || [];
  const sources = insight.fontesInternas || [];
  const coverage = insight.coberturaDias;

  return (
    <div className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={insight.titulo} onClick={(event) => event.stopPropagation()} className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[30px] border-t border-surface-border bg-surface px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border" />
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tone(insight)}`}>{insight.urgencia === "alta" ? <AlertTriangle size={19} /> : <BrainCircuit size={19} />}</div>
            <div className="min-w-0 flex-1"><p className="font-mono text-[9px] uppercase text-ink-faint">{insight.kind === "pattern" ? "Padrão longitudinal" : "Sinal de saúde"}</p><h2 className="mt-1 text-lg font-bold">{insight.titulo}</h2></div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-ink-muted" aria-label="Fechar"><X size={19} /></button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{insight.mensagem}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-surface-border bg-void/30 p-3"><p className="font-mono text-[8px] uppercase text-ink-faint">Confiança</p><p className="mt-1 text-xs font-bold capitalize">{insight.confianca}</p></div>
            <div className="rounded-2xl border border-surface-border bg-void/30 p-3"><p className="font-mono text-[8px] uppercase text-ink-faint">Amostra</p><p className="mt-1 text-xs font-bold">{insight.amostra}</p></div>
            <div className="rounded-2xl border border-surface-border bg-void/30 p-3"><p className="font-mono text-[8px] uppercase text-ink-faint">Período</p><p className="mt-1 text-xs font-bold">{insight.periodoDias ? `${insight.periodoDias} dias` : "Atual"}</p></div>
          </div>
          {coverage && <div className="mt-3 rounded-2xl border border-sky-400/15 bg-sky-400/[0.05] p-3"><div className="flex items-center gap-2 text-sky-300"><Database size={14} /><b className="text-[10px]">Cobertura observada</b></div><p className="mt-1 text-[10px] text-ink-muted">{coverage.observados} de {coverage.total} dias com evidência considerada.</p></div>}
          {evidence.length > 0 && <div className="mt-5"><p className="font-mono text-[9px] font-bold uppercase text-ink-faint">Por que o Vault mostrou isso?</p><div className="mt-2 space-y-2">{evidence.slice(0, 6).map((item, index) => <div key={`${item}-${index}`} className="rounded-2xl bg-void/30 px-3 py-2.5 text-[10px] leading-relaxed text-ink-muted">{item}</div>)}</div></div>}
          {sources.length > 0 && <div className="mt-4 rounded-2xl border border-surface-border bg-void/20 p-3"><div className="flex items-center gap-2"><ShieldCheck size={14} className="text-ice" /><b className="text-[10px]">Fontes internas</b></div><p className="mt-1 text-[10px] text-ink-muted">{sources.join(" · ")}</p></div>}
          {insight.acaoSegura && <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3"><p className="font-mono text-[8px] uppercase text-emerald-300">Próximo passo seguro</p><p className="mt-1 text-[11px] text-ink-muted">{insight.acaoSegura}</p></div>}
          {insight.link && <button type="button" onClick={() => onNavigate(insight.link!)} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-ice px-4 py-3 text-sm font-bold text-void">Abrir contexto<ChevronRight size={17} /></button>}
          <p className="mt-4 text-center text-[9px] text-ink-faint">O Vault organiza sinais do histórico registrado. Ele não diagnostica nem substitui avaliação profissional.</p>
        </div>
      </section>
    </div>
  );
}
