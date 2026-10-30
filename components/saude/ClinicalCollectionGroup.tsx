"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

type ClinicalCollectionGroupProps = {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  children: ReactNode | (() => ReactNode);
  defaultOpen?: boolean;
  forceOpen?: boolean;
  tone?: "attention" | "positive" | "neutral" | "sos";
};

const tones = {
  attention: "border-amber-400/20 bg-amber-400/[0.045] text-amber-300",
  positive: "border-emerald-400/20 bg-emerald-400/[0.045] text-emerald-300",
  neutral: "border-surface-border/60 bg-surface text-ink-muted",
  sos: "border-violet-400/20 bg-violet-400/[0.045] text-violet-300",
} as const;

/** Progressive hierarchy for large clinical lists. Keeps secondary groups out of the first viewport. */
export function ClinicalCollectionGroup({id,title,description,count,icon:Icon,children,defaultOpen=false,forceOpen=false,tone="neutral"}:ClinicalCollectionGroupProps){
  const [open,setOpen]=useState(defaultOpen);
  const visible=forceOpen||open;
  if(count===0)return null;
  return <details id={id} open={visible} onToggle={event=>{if(!forceOpen)setOpen(event.currentTarget.open);}} className="group scroll-mt-24 overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface/60 [content-visibility:auto] [contain-intrinsic-size:180px]">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${tones[tone]}`}><Icon size={16}/></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-ink-primary">{title}</span><span className="mt-0.5 block line-clamp-2 break-words text-[10px] leading-snug text-ink-muted">{description}</span></span>
      <span className="shrink-0 rounded-full bg-surface-raised px-2 py-1 font-mono text-[10px] tabular-nums text-ink-muted">{count}</span>
      <ChevronDown size={15} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"/>
    </summary>
    {visible?<div className="space-y-2.5 border-t border-surface-border/40 bg-void/20 p-2.5">{typeof children==="function"?children():children}</div>:null}
  </details>;
}
