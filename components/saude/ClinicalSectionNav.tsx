"use client";

import type { ReactNode } from "react";

export type ClinicalSectionNavItem={id:string;label:string;icon:ReactNode;badge?:string|number|null};

/** Compact in-page navigation for long clinical workspaces. */
export function ClinicalSectionNav({label,items}:{label:string;items:readonly ClinicalSectionNavItem[]}){
  return <nav aria-label={label} className="sticky top-2 z-30 -mx-1 flex gap-1.5 overflow-x-auto rounded-2xl border border-surface-border/70 bg-void/90 p-1.5 shadow-lg backdrop-blur-xl [scrollbar-width:none]">
    {items.map(item=><a key={item.id} href={`#${item.id}`} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-semibold text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.badge!==undefined&&item.badge!==null?<span className="rounded-full bg-surface-raised px-1.5 py-0.5 font-mono text-[8px] text-ink-faint">{item.badge}</span>:null}</a>)}
  </nav>;
}
