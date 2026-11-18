"use client";
import { HeartPulse, Users } from "lucide-react";

export function HealthHubSwitchR5({active,onNavigate}:{active:"saude"|"rede";onNavigate:(path:string)=>void}){
  return <nav aria-label="Alternar hubs de saúde" className="flex w-full items-center gap-1 rounded-[16px] border border-surface-border/70 bg-surface/70 p-1 shadow-sm">
    {([ ["saude","Minha Saúde","/saude/minha-saude",HeartPulse],["rede","Rede de Saúde","/saude/rede",Users] ] as const).map(([id,label,href,Icon])=><button
      key={id} type="button" aria-current={active===id?"page":undefined}
      onClick={()=>active!==id&&onNavigate(href)}
      className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${active===id?"border border-emerald-300/25 bg-emerald-300/10 text-emerald-200":"text-ink-muted hover:bg-surface-raised"}`}>
      <Icon size={15} aria-hidden="true"/><span className="truncate">{label}</span>
    </button>)}
  </nav>;
}

