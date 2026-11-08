"use client";
/** M96: progressive, read-only grouping of already persisted Brain signals. */
import { ChevronRight, Layers3, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CareEpisode, CareEvidenceNature } from "@/lib/health-intelligence/care-episodes";

const evidenceLabel: Record<CareEvidenceNature, string> = {
  documented_fact: "Dose registrada e vinculada",
  unconfirmed_gap: "Lacuna a confirmar",
  user_reported_state: "Relato pessoal",
  pharmacological_risk_hypothesis: "Sinal interpretativo do Brain",
};

export function CareEpisodesPreview({episodes, onOpenSignal}: {
  episodes: readonly CareEpisode[];
  onOpenSignal: (key: string) => void;
}) {
  if (!episodes.length) return null;
  return (
    <details className="group mx-auto mt-3 max-w-2xl overflow-hidden rounded-[22px] border border-violet-400/20 bg-violet-400/[.035]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><Layers3 size={19}/></span>
        <span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-[.16em] text-violet-300">Brain V5.1 · associação temporal</span><strong className="mt-1 block text-sm text-ink-primary">{episodes.length} agrupamento{episodes.length === 1 ? "" : "s"} de sinais registrados</strong></span>
        <ChevronRight size={16} className="text-ink-muted transition group-open:rotate-90"/>
      </summary>
      <div className="space-y-2 border-t border-violet-400/15 p-3">
        <p className="px-1 text-[11px] leading-relaxed text-ink-muted">Agrupamento experimental por medicamento e período. A proximidade temporal não comprova causa ou efeito. Os alertas originais continuam independentes.</p>
        {episodes.slice(0, 4).map(episode => {
          const Icon = episode.requiresAttention ? ShieldAlert : ShieldCheck;
          const verified = episode.evidenceRefs.filter(ref => ref.binding === "exact");
          const reported = episode.evidenceRefs.filter(ref => ref.nature === "user_reported_state");
          return <section key={episode.viewKey} className="rounded-2xl border border-surface-border/60 bg-surface p-3" aria-label="Episódio de cuidado — agrupamento de sinais">
            <div className="flex items-start gap-2"><Icon size={17} className={`mt-0.5 shrink-0 ${episode.requiresAttention ? "text-rose-300" : "text-violet-300"}`}/><div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink-primary">{episode.signals.length} sinais relacionados por medicamento</p><p className="mt-1 text-[10px] text-ink-muted">{verified.length} dose(s) vinculada(s) por ID · {reported.length} relato(s) vinculado(s) por você</p></div></div>
            <div className="mt-2 space-y-1.5">{episode.signals.slice(0, 5).map(signal => <button key={signal.key} type="button" onClick={() => onOpenSignal(signal.key)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2 text-left active:scale-[.99]"><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-ink-primary">{signal.title}</span><span className="mt-0.5 block text-[9px] text-ink-muted">{evidenceLabel[signal.nature]} · {signal.severity}</span></span><ChevronRight size={14} className="shrink-0 text-violet-300"/></button>)}</div>
            {verified.length > 0 && <p className="mt-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.035] p-2 text-[10px] text-ink-muted">{verified.length} vínculo(s) exato(s) com doses reais; a quantidade de referência não equivale a dose clinicamente segura.</p>}
            <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">Agrupamento informativo. Não diagnostica abstinência, intoxicação ou causalidade; não altera prescrições.</p>
          </section>;
        })}
        {episodes.length > 4 && <p className="px-1 text-[10px] text-ink-muted">Exibindo os quatro grupos prioritários nesta visualização inicial.</p>}
      </div>
    </details>
  );
}
