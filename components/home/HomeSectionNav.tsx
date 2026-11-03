"use client";
import { Bell, BrainCircuit, CalendarDays, LayoutGrid } from "lucide-react";

export function HomeSectionNav({hasAttention,hasBrain}:{hasAttention:boolean;hasBrain:boolean}) {
  const items=[{id:"home-agora",label:"Agora",icon:CalendarDays},...(hasAttention?[{id:"home-atencao",label:"Atenção",icon:Bell}]:[]),...(hasBrain?[{id:"home-brain",label:"Insight",icon:BrainCircuit}]:[]),{id:"home-organizacao",label:"Organização",icon:LayoutGrid}];
  return <details className="group rounded-xl border border-surface-border/40 bg-surface/30 px-2">
    <summary className="flex min-h-10 cursor-pointer items-center justify-between px-2 text-[11px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Explorar áreas da Home <span aria-hidden="true" className="text-ice">▾</span></summary>
    <nav aria-label="Áreas da página inicial" className="grid grid-cols-2 gap-1.5 border-t border-surface-border/30 py-2 min-[420px]:grid-cols-4">{items.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:"start"})} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-surface-border/50 bg-surface-raised/30 px-2 text-[10px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><Icon size={14} className="text-ink-muted" aria-hidden="true"/>{label}</button>)}</nav>
  </details>;
}
