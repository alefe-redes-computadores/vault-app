"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type ClinicalCollectionGroupProps = {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  children: ReactNode | ((limit?: number) => ReactNode);
  defaultOpen?: boolean;
  forceOpen?: boolean;
  tone?: "attention" | "positive" | "neutral" | "sos";
  /** Opt-in: render only the first visible cards until the reader requests more. */
  progressive?: boolean;
  pageSize?: number;
};

const tones = {
  attention: "border-amber-400/20 bg-amber-400/[0.045] text-amber-300",
  positive: "border-emerald-400/20 bg-emerald-400/[0.045] text-emerald-300",
  neutral: "border-surface-border/60 bg-surface text-ink-muted",
  sos: "border-violet-400/20 bg-violet-400/[0.045] text-violet-300",
} as const;

/** Progressive hierarchy for large clinical lists. Keeps secondary groups out of the first viewport. */
export function ClinicalCollectionGroup({id,title,description,count,icon:Icon,children,defaultOpen=false,forceOpen=false,tone="neutral",progressive=false,pageSize=3}:ClinicalCollectionGroupProps){
  const [open,setOpen]=useState(defaultOpen);
  const [visibleCount,setVisibleCount]=useState(Math.max(1,pageSize));
  const groupRef=useRef<HTMLDetailsElement>(null);
  // P14 R6: direct #medicamentos-* links cannot leave an eligible group collapsed.
  useEffect(() => {
    const revealHash = () => {
      let hash = window.location.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { return; }
      if (hash === id) setOpen(true);
    };
    const reveal=()=>setOpen(true);
    const target=groupRef.current;
    target?.addEventListener("vault:reveal-clinical-section",reveal);
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => {
      target?.removeEventListener("vault:reveal-clinical-section",reveal);
      window.removeEventListener("hashchange", revealHash);
    };
  }, [id]);
  const visible=forceOpen||open;
  // Filtered lists are deliberately complete; only the ordinary overview is progressive.
  const progressiveList = progressive && !forceOpen && typeof children === "function";
  const shown = Math.min(count,visibleCount);
  const remaining = progressiveList ? Math.max(0,count-shown) : 0;
  if(count===0)return null;
  return <details ref={groupRef} id={id} open={visible} onToggle={event=>{if(!forceOpen)setOpen(event.currentTarget.open);}} className="group scroll-mt-24 overflow-hidden rounded-[22px] border border-surface-border/65 bg-surface/75 shadow-sm [content-visibility:auto] [contain-intrinsic-size:180px]">
    <summary aria-label={`${title}. ${count} itens. ${description}`} className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${tones[tone]}`}><Icon size={16}/></span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold leading-tight text-ink-primary">{title}</span><span className="mt-0.5 block line-clamp-2 break-words text-xs leading-relaxed text-ink-muted">{description}</span></span>
      <span className="shrink-0 rounded-full bg-surface-raised px-2 py-1 font-mono text-xs tabular-nums text-ink-muted">{count}</span>
      <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform motion-reduce:transition-none group-open:rotate-180"/>
    </summary>
    {visible?<div id={`${id}-content`} className="space-y-2.5 border-t border-surface-border/50 bg-void/15 p-2.5">{typeof children==="function"?children(progressiveList?shown:undefined):children}
      {remaining>0&&<button type="button" aria-controls={`${id}-content`} onClick={()=>setVisibleCount(previous=>Math.min(count,previous+Math.max(1,pageSize)))} className="flex min-h-11 w-full items-center justify-center rounded-xl border border-ice/20 bg-ice/[.05] px-3 text-xs font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Mostrar mais {Math.min(remaining,Math.max(1,pageSize))} de {count} medicamentos</button>}
      {progressiveList&&remaining===0&&count>pageSize&&<button type="button" aria-controls={`${id}-content`} onClick={()=>setVisibleCount(Math.max(1,pageSize))} className="min-h-11 w-full rounded-xl border border-surface-border/50 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Recolher lista para os primeiros {Math.max(1,pageSize)}</button>}
    </div>:null}
  </details>;
}
