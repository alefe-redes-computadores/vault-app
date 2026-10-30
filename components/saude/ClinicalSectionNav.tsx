"use client";

import { useEffect, useState, type ReactNode } from "react";

export type ClinicalSectionNavItem={id:string;label:string;icon:ReactNode;badge?:string|number|null};

/** Compact in-page navigation for long clinical workspaces. */
export function ClinicalSectionNav({label,items,layout="grid"}:{label:string;items:readonly ClinicalSectionNavItem[];layout?:"scroll"|"grid"}){
  const idsKey=items.map(item=>item.id).join("|");
  const [activeId,setActiveId]=useState(items[0]?.id??"");

  useEffect(()=>{
    const ids=idsKey.split("|").filter(Boolean);
    if(!ids.length)return;
    const syncHash=()=>{
      let hash=window.location.hash.slice(1);
      try { hash=decodeURIComponent(hash); } catch { return; }
      if(ids.includes(hash))setActiveId(hash);
    };
    syncHash();
    if(typeof IntersectionObserver === "undefined") { window.addEventListener("hashchange",syncHash); return()=>window.removeEventListener("hashchange",syncHash); }
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(visible[0]?.target.id)setActiveId(visible[0].target.id);
    },{rootMargin:"-18% 0px -68% 0px",threshold:[0,0.01]});
    ids.forEach(id=>{const element=document.getElementById(id);if(element)observer.observe(element);});
    window.addEventListener("hashchange",syncHash);
    return()=>{observer.disconnect();window.removeEventListener("hashchange",syncHash);};
  },[idsKey]);

  return <nav aria-label={label} className={layout==="grid"?"relative z-20 grid min-w-0 grid-cols-3 gap-2 rounded-[22px] border border-surface-border/70 bg-surface/70 p-2 shadow-sm min-[480px]:grid-cols-4":"sticky top-2 z-30 -mx-1 flex min-w-0 gap-2 overflow-x-auto rounded-[22px] border border-surface-border/70 bg-void/90 p-2 shadow-lg backdrop-blur-xl [scrollbar-width:none]"}>
    {items.map(item=>{const active=activeId===item.id;return <a key={item.id} href={`#${item.id}`} aria-current={active?"location":undefined} onClick={()=>setActiveId(item.id)} className={`flex min-h-12 items-center gap-1.5 rounded-2xl border font-semibold transition-all focus-visible:ring-2 focus-visible:ring-ice/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${layout==="grid"?"min-w-0 justify-center px-2 text-[11px]":"shrink-0 px-3.5 text-xs"} ${active?"border-ice/35 bg-ice/10 text-ice shadow-sm":"border-transparent bg-surface-raised/35 text-ink-secondary hover:border-surface-border/70 hover:bg-surface-raised hover:text-ink-primary"}`}><span aria-hidden="true">{item.icon}</span><span className="min-w-0 break-words text-center leading-tight">{item.label}</span>{item.badge!==undefined&&item.badge!==null?<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${active?"bg-ice/15 text-ice":"bg-surface-raised text-ink-muted"}`}>{item.badge}</span>:null}</a>;})}
  </nav>;
}
