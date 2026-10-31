"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

export type ClinicalSectionNavItem={id:string;label:string;icon:ReactNode;badge?:string|number|null};

/** Compact in-page navigation for long clinical workspaces. */
export function ClinicalSectionNav({label,items,layout="grid",density="regular",priorityCount}:{label:string;items:readonly ClinicalSectionNavItem[];layout?:"scroll"|"grid";density?:"regular"|"compact";priorityCount?:number}){
  const secondaryId=useId();
  const idsKey=items.map(item=>item.id).join("|");
  const [activeId,setActiveId]=useState(items[0]?.id??"");
  const [expanded,setExpanded]=useState(false);
  const count=typeof priorityCount==="number"&&Number.isInteger(priorityCount)&&priorityCount>0?priorityCount:items.length;
  const primary=items.slice(0,count);
  const secondary=items.slice(count);

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

  // A deep link to a secondary section must reveal its navigation item.
  useEffect(()=>{if(secondary.some(item=>item.id===activeId))setExpanded(true);},[activeId,idsKey,count]);
  const itemLink=(item:ClinicalSectionNavItem)=>{const active=activeId===item.id;return <a key={item.id} href={`#${item.id}`} aria-current={active?"location":undefined} onClick={()=>setActiveId(item.id)} className={`flex ${layout==="grid"&&density==="compact"?"min-h-10 gap-1 rounded-lg":"min-h-12 gap-1.5 rounded-2xl"} items-center border font-semibold transition-all focus-visible:ring-2 focus-visible:ring-ice/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${layout==="grid"?(density==="compact"?"min-w-0 flex-col justify-center px-1 py-1 text-[9px]":"min-w-0 justify-center px-2 text-[11px]"):"shrink-0 px-3.5 text-xs"} ${active?"border-ice/35 bg-ice/10 text-ice shadow-sm":"border-transparent bg-surface-raised/35 text-ink-secondary hover:border-surface-border/70 hover:bg-surface-raised hover:text-ink-primary"}`}><span aria-hidden="true">{item.icon}</span><span className="min-w-0 break-words text-center leading-tight">{item.label}</span>{item.badge!==undefined&&item.badge!==null?<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${active?"bg-ice/15 text-ice":"bg-surface-raised text-ink-muted"}`}>{item.badge}</span>:null}</a>;};
  return <div className="min-w-0 space-y-1.5">
    <nav aria-label={label} className={layout==="grid"?(density==="compact"?"relative z-20 grid min-w-0 grid-cols-4 gap-1 rounded-xl border border-surface-border/50 bg-surface/50 p-1.5 shadow-sm min-[480px]:grid-cols-5":"relative z-20 grid min-w-0 grid-cols-3 gap-2 rounded-[22px] border border-surface-border/70 bg-surface/70 p-2 shadow-sm min-[480px]:grid-cols-4"):"sticky top-2 z-30 -mx-1 flex min-w-0 gap-2 overflow-x-auto rounded-[22px] border border-surface-border/70 bg-void/90 p-2 shadow-lg backdrop-blur-xl [scrollbar-width:none]"}>
      {primary.map(itemLink)}
    </nav>
    {secondary.length>0&&<div className="rounded-xl border border-surface-border/40 bg-surface/40 px-2 py-1.5">
      <button type="button" aria-expanded={expanded} aria-controls={secondaryId} onClick={()=>setExpanded(value=>!value)} className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-1.5 text-left text-[11px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <span>Mais áreas · {secondary.length}{!expanded&&secondary.some(item=>item.id===activeId)?` · ${secondary.find(item=>item.id===activeId)?.label}`:""}</span><span aria-hidden="true" className="text-ice">{expanded?"▴":"▾"}</span>
      </button>
      {expanded&&<nav id={secondaryId} aria-label={`${label} · outras áreas`} className="grid grid-cols-3 gap-1 border-t border-surface-border/30 pt-1.5 min-[480px]:grid-cols-4">{secondary.map(itemLink)}</nav>}
    </div>}
  </div>;
}
