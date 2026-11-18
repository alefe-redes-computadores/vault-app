"use client";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";

export function HealthHubSwitchR5({active,onNavigate}:{active:"saude"|"rede";onNavigate:(path:string)=>void}){
  return <nav aria-label="Navegação dentro de Saúde" className="w-full">
    <button type="button" onClick={()=>onNavigate(active==="rede"?"/saude/minha-saude":"/saude/rede")}
      aria-label={active==="rede"?"Voltar para Minha Saúde":"Abrir Profissionais e locais"}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-surface-border/70 bg-surface/70 p-3 text-left shadow-sm transition-colors active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 motion-reduce:transition-none">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[.065] text-emerald-300">{active==="rede"?<ArrowLeft size={19}/>:<Users size={19}/>}</span>
      <span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-ink-primary">{active==="rede"?"Minha Saúde":"Profissionais e locais"}</strong><span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{active==="rede"?"Voltar ao painel de saúde":"Médicos, farmácias e unidades"}</span></span>
      <ChevronRight size={17} className="shrink-0 text-ink-muted" aria-hidden="true"/>
    </button>
  </nav>;
}

