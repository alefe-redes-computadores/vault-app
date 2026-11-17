"use client";
import { ArrowUpRight, ChevronDown, Zap } from "lucide-react";

/** R2: uma decisão real, sem duplicar indicadores, agenda ou botões históricos. */
export function HomeActionNowCardP7R3({title,description,eyebrow,actionLabel,onAction,urgent}:{
  title:string;description:string;eyebrow:string;actionLabel:string;onAction:()=>void;urgent:boolean;
}) {
  const hasLongExplanation = description.trim().length > 120;
  return <section id="home-acao-contextual" data-vault-ui360-r2-action
    className={`rounded-[19px] border px-3 py-2.5 shadow-sm ${urgent ? "border-rose-300/25 bg-gradient-to-r from-rose-300/[.075] to-surface" : "border-amber-300/20 bg-gradient-to-r from-amber-300/[.065] to-surface"}`}
    aria-label="Ação contextual disponível">
    <div className="flex min-w-0 items-start gap-2.5">
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${urgent ? "bg-rose-300/10 text-rose-300" : "bg-amber-300/10 text-amber-300"}`}><Zap size={16} aria-hidden="true"/></span>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-[.12em] ${urgent ? "text-rose-300" : "text-amber-300"}`}>{eyebrow}</p>
        <h2 className="mt-0.5 break-words font-display text-[15px] font-bold leading-snug text-ink-primary">{title}</h2>
        {description.trim() && <p className="mt-1 line-clamp-2 break-words text-[11px] leading-relaxed text-ink-secondary">{description}</p>}
        <button type="button" onClick={onAction} className="mt-2 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl border border-teal-300/25 bg-teal-300/[.075] px-3 text-[11px] font-bold text-teal-200 transition-colors active:bg-teal-300/[.15] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
          <span className="min-w-0 break-words text-left">{actionLabel}</span><ArrowUpRight size={15} className="shrink-0" aria-hidden="true"/>
        </button>
        {hasLongExplanation && <details className="group mt-1 max-w-full text-ink-secondary" data-vault-ui360-r2-reason>
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg text-[11px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
            Por que aparece? <ChevronDown size={14} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true"/>
          </summary>
          <p className="rounded-lg border border-surface-border/40 bg-surface-raised/30 p-2.5 text-xs leading-relaxed break-words">{description}</p>
        </details>}
      </div>
    </div>
  </section>;
}
