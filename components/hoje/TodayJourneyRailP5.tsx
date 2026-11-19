"use client";

import { Activity, CalendarDays, Pill } from "lucide-react";

/** Navigation-only. Never changes dose outcomes, planned times, stock or clinical evidence. */
export function TodayJourneyRailP5({isToday,pendingCount,onInteraction}:{
  isToday:boolean;
  pendingCount:number;
  onInteraction:()=>void;
}) {
  const destinations=[
    {id:"hoje-doses",label:"Doses",Icon:Pill},
    {id:"hoje-agenda",label:"Agenda",Icon:CalendarDays},
    ...(isToday?[{id:"hoje-diario",label:"Diário",Icon:Activity}]:[]),
  ];
  const jump=(id:string)=>{
    const target=document.getElementById(id);
    if(!target)return;
    onInteraction();
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
    target.scrollIntoView({block:"start",behavior:reduced?"auto":"smooth"});
  };
  return <nav data-vault-ia20-p5="today-journey" aria-label="Ir para uma parte do dia"
    className={`grid min-w-0 ${isToday?"grid-cols-3":"grid-cols-2"} gap-1.5 rounded-2xl border border-surface-border/45 bg-surface/55 p-1.5`}>
    {destinations.map(({id,label,Icon})=><button key={id} type="button" onClick={()=>jump(id)}
      aria-label={`Ir para ${label.toLowerCase()}`}
      className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-1.5 text-[11px] font-semibold text-ink-secondary transition-colors hover:border-surface-border/70 hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice motion-reduce:transition-none">
      <Icon size={15} className="shrink-0 text-ice" aria-hidden="true"/>
      <span className="truncate">{label}</span>
      {isToday&&id==="hoje-doses"&&pendingCount>0?<span className="max-w-8 shrink-0 rounded-full bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-200" aria-label={`${pendingCount} doses pendentes`}>{pendingCount}</span>:null}
    </button>)}
  </nav>;
}
