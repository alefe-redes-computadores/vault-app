"use client";
import { ArrowUpRight, Zap } from "lucide-react";
export function HomeActionNowCardP7R3({title,description,eyebrow,actionLabel,onAction,urgent}:{
  title:string;description:string;eyebrow:string;actionLabel:string;onAction:()=>void;urgent:boolean;
}) {
  return <section id="home-acao-contextual" className={`rounded-[20px] border px-3.5 py-3 shadow-sm ${urgent?"border-rose-300/25 bg-gradient-to-br from-rose-300/[.10] via-surface to-teal-300/[.065]":"border-amber-300/20 bg-gradient-to-br from-amber-300/[.08] via-surface to-teal-300/[.05]"}`} aria-label="Ação contextual disponível">
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${urgent?"bg-rose-300/10 text-rose-300":"bg-amber-300/10 text-amber-300"}`}><Zap size={19} aria-hidden="true"/></span>
      <div className="min-w-0 flex-1"><p className={`text-[10px] font-bold uppercase tracking-[.14em] ${urgent?"text-rose-300":"text-amber-300"}`}>{eyebrow}</p>
        <h2 className="mt-1 break-words font-display text-[16px] font-bold leading-snug text-ink-primary">{title}</h2>
        <p className="mt-1.5 line-clamp-2 break-words text-xs leading-relaxed text-ink-secondary">{description}</p>
        <details className="group mt-1 text-xs text-ink-secondary">
          <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-lg text-[11px] font-semibold text-teal-200 underline decoration-teal-200/30 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">Ver justificativa completa</summary>
          <p className="mt-1.5 rounded-lg border border-surface-border/50 bg-surface-raised/30 p-2.5 break-words leading-relaxed">{description}</p>
        </details>
        <button type="button" onClick={onAction} className="mt-1.5 inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-teal-300/30 bg-teal-300/[.085] px-3 text-xs font-bold text-teal-200 transition-colors active:bg-teal-300/[.17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
          {actionLabel}<ArrowUpRight size={15} aria-hidden="true"/>
        </button>
      </div>
    </div>
  </section>;
}
