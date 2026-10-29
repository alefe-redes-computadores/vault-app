"use client";

import { useEffect, useState, type ReactNode } from "react";

export type ClinicalSectionNavItem={id:string;label:string;icon:ReactNode;badge?:string|number|null};

/** Compact in-page navigation for long clinical workspaces. */
export function ClinicalSectionNav({label,items,layout="scroll"}:{label:string;items:readonly ClinicalSectionNavItem[];layout?:"scroll"|"grid"}){
  const idsKey=items.map(item=>item.id).join("|");
  const [activeId,setActiveId]=useState(items[0]?.id??"");

  useEffect(()=>{
    const ids=idsKey.split("|").filter(Boolean);
    if(!ids.length)return;
    const syncHash=()=>{
      const hash=decodeURIComponent(window.location.hash.slice(1));
      if(ids.includes(hash))setActiveId(hash);
    };
    syncHash();
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(visible[0]?.target.id)setActiveId(visible[0].target.id);
    },{rootMargin:"-18% 0px -68% 0px",threshold:[0,0.01]});
    ids.forEach(id=>{const element=document.getElementById(id);if(element)observer.observe(element);});
    window.addEventListener("hashchange",syncHash);
    return()=>{observer.disconnect();window.removeEventListener("hashchange",syncHash);};
  },[idsKey]);

  return <nav aria-label={label} className={layout==="grid"?"relative z-20 grid min-w-0 grid-cols-3 gap-1.5 rounded-2xl border border-surface-border/70 bg-void/90 p-1.5 shadow-sm":"sticky top-2 z-30 -mx-1 flex min-w-0 gap-1.5 overflow-x-auto rounded-2xl border border-surface-border/70 bg-void/90 p-1.5 shadow-lg backdrop-blur-xl [scrollbar-width:none]"}>
    {items.map(item=>{const active=activeId===item.id;return <a key={item.id} href={`#${item.id}`} aria-current={active?"location":undefined} onClick={()=>setActiveId(item.id)} className={`flex min-h-11 items-center gap-1.5 rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${layout==="grid"?"min-w-0 justify-center px-1.5 text-[10px]":"shrink-0 px-3 text-[11px]"} ${active?"bg-emerald-400/10 text-emerald-200":"text-ink-muted hover:bg-surface-raised hover:text-ink-primary"}`}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.badge!==undefined&&item.badge!==null?<span className={`rounded-full px-1.5 py-0.5 font-mono text-[8px] ${active?"bg-emerald-400/10 text-emerald-200":"bg-surface-raised text-ink-faint"}`}>{item.badge}</span>:null}</a>;})}
  </nav>;
}
