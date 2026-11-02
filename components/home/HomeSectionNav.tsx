"use client";
import { Bell, BrainCircuit, CalendarDays, LayoutGrid } from "lucide-react";

export function HomeSectionNav({hasAttention,hasBrain}:{hasAttention:boolean;hasBrain:boolean}) {
  const items=[{id:"home-agora",label:"Agora",icon:CalendarDays},...(hasAttention?[{id:"home-atencao",label:"Atenção",icon:Bell}]:[]),...(hasBrain?[{id:"home-brain",label:"Insight",icon:BrainCircuit}]:[]),{id:"home-organizacao",label:"Organização",icon:LayoutGrid}];
  return <nav aria-label="Áreas da página inicial" className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">{items.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-surface-border/60 bg-surface/70 px-2 text-[10px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><Icon size={14} className="text-ice"/>{label}</button>)}</nav>;
}
