"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { Activity, ArrowUpRight, BookHeart, CalendarDays, ChevronDown, ClipboardList, Database, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import { evidenceReceiptM119 } from "@/lib/health-intelligence/trust-spine-m119";
import { buildAvatarEvidenceLensM122, type AvatarEvidenceDomainIdM122, type AvatarEvidencePeriodM122 } from "@/lib/health-intelligence/avatar-evidence-lens-m122";

const icons = {
  medications:Pill,treatments:BookHeart,doses:ClipboardList,
  health_records:Activity,consultations:Stethoscope,documents:Database,
} as const;
const tones = {
  medications:"text-emerald-300 border-emerald-300/20 bg-emerald-300/[.035]",
  treatments:"text-violet-300 border-violet-300/20 bg-violet-300/[.035]",
  doses:"text-amber-300 border-amber-300/20 bg-amber-300/[.035]",
  health_records:"text-sky-300 border-sky-300/20 bg-sky-300/[.035]",
  consultations:"text-rose-300 border-rose-300/20 bg-rose-300/[.035]",
  documents:"text-cyan-300 border-cyan-300/20 bg-cyan-300/[.035]",
} as const satisfies Record<AvatarEvidenceDomainIdM122,string>;

/** M122: only read already loaded person-scoped sources. No network or WebGL. */
export function AvatarEvidenceLensM122({ context, userId, personId, today, insights=[], onNavigate, onExplain }: {
  context:HealthInsightContext|null|undefined;
  userId:string;
  personId:string;
  today:string;
  insights?:readonly HealthInsight[];
  onNavigate:(href:string)=>void;
  onExplain:(insight:HealthInsight)=>void;
}) {
  const [period,setPeriod]=useState<AvatarEvidencePeriodM122>(30);
  const [opened,setOpened]=useState(false);
  const detailsRef=useRef<HTMLDetailsElement>(null);
  // A trilha da Fênix pode apontar diretamente para a lente; revelar sob demanda.
  useEffect(()=>{
    const reveal=()=>{
      let hash=window.location.hash.slice(1);
      try{hash=decodeURIComponent(hash);}catch{return;}
      if(hash!=="avatar-evidence-lens-m122")return;
      if(detailsRef.current)detailsRef.current.open=true;
      setOpened(true);
    };
    reveal();
    window.addEventListener("hashchange",reveal);
    return()=>window.removeEventListener("hashchange",reveal);
  },[]);
  const view=useMemo(()=>opened?buildAvatarEvidenceLensM122(context,userId,personId,today,period):null,[opened,context,userId,personId,today,period]);
  const ready=view?.state==="ready";
  const active=useMemo(()=>ready?insights.filter(item=>item.id&&typeof item.titulo==="string").slice(0,3):[],[ready,insights]);
  const fmt=(day:string|null)=>day?day.split("-").reverse().join("/"):"Sem data registrada";

  return <details ref={detailsRef} onToggle={(event:SyntheticEvent<HTMLDetailsElement>)=>setOpened(event.currentTarget.open)} id="avatar-evidence-lens-m122" className="group scroll-mt-24 overflow-hidden rounded-[20px] border border-sky-300/20 bg-gradient-to-br from-sky-300/[.07] via-surface to-violet-300/[.035] shadow-sm" aria-label="Fênix, lente de evidências">
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-3.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
      <span className="grid size-10 shrink-0 place-items-center rounded-[14px] border border-sky-300/20 bg-sky-300/10 text-sky-200" aria-hidden="true"><ShieldCheck size={20}/></span>
      <span className="min-w-0 flex-1"><strong className="block text-sm text-ink-primary">Fênix · Lente de evidências</strong><span className="mt-1 block text-[11px] leading-snug text-ink-muted">{ready?`${view.documentedDomains} de 6 áreas com registros disponíveis · sem diagnóstico`:"Abrir 6 áreas com registros e limites explícitos"}</span></span>
      <ChevronDown size={18} className="shrink-0 text-sky-300 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true"/>
    </summary>
    {opened && <div className="space-y-3 border-t border-sky-300/10 px-3.5 pb-3.5 pt-3">
      <p className="text-[11px] leading-relaxed text-ink-muted">Veja exatamente quais categorias têm registros, em qual período e de onde cada exemplo veio. A Fênix não interpreta a aparência física como sinal clínico.</p>
      {!ready ? <p role="status" className="rounded-xl border border-surface-border p-3 text-xs text-ink-muted">Conta ou pessoa ainda não confirmada; nenhum registro é exibido.</p> : <>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-sky-200">Janela de registros</span>
          <div className="inline-flex gap-1 rounded-xl border border-surface-border/70 bg-void/40 p-1" role="group" aria-label="Intervalo para evidências da Fênix">
            {([7,30] as const).map(days=><button key={days} type="button" aria-pressed={period===days} onClick={()=>setPeriod(days)} className={`min-h-10 rounded-lg px-3 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${period===days?"bg-sky-300/15 text-sky-200":"text-ink-muted"}`}>{days} dias</button>)}
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-ink-faint">{fmt(view.from)} a {fmt(view.to)} para eventos; medicamentos e tratamentos mostram o cadastro atual.</p>
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2" aria-label="Categorias de evidência da pessoa">
          {view.domains.map(domain=>{
            const Icon=icons[domain.id];
            return <details key={domain.id} className={`group/domain min-w-0 rounded-2xl border p-2.5 ${tones[domain.id]}`}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/10"><Icon size={15} aria-hidden="true"/></span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-ink-primary">{domain.title}</strong><span className="mt-0.5 block text-[10px] text-ink-muted">{domain.count} registro(s)</span></span>
                <ChevronDown size={14} className="shrink-0 transition-transform group-open/domain:rotate-180" aria-hidden="true"/>
              </summary>
              <div className="mt-2 space-y-2 border-t border-current/10 pt-2 text-[10px] text-ink-muted">
                <p>{domain.scope==="current_snapshot"?"Cadastro atual, não uma série de eventos.":`${domain.observedDays??0} dia(s) com lançamento na janela.`}</p>
                {domain.scope==="recorded_period"&&<p>Último lançamento no recorte: {fmt(domain.lastRecordedDay)}</p>}
                <p className="leading-relaxed">{domain.limitation}</p>
                {domain.examples.map(entry=><button type="button" key={entry.key} onClick={()=>onNavigate(entry.href)} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-surface-border/40 bg-surface/65 px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                  <span className="min-w-0 flex-1"><strong className="block break-words text-[11px] text-ink-primary">{entry.title}</strong><span className="mt-1 block text-[10px] leading-snug text-ink-muted">{entry.day?`${fmt(entry.day)} · `:""}{entry.description}</span></span><ArrowUpRight size={14} className="shrink-0" aria-hidden="true"/>
                </button>)}
                <button type="button" onClick={()=>onNavigate(domain.route)} className="min-h-11 w-full rounded-lg border border-current/20 px-2 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">Abrir origem da categoria</button>
              </div>
            </details>;
          })}
        </div>
        <section aria-label="Brain, evidências declaradas" className="rounded-xl border border-violet-300/20 bg-violet-300/[.035] p-3">
          <div className="flex items-center gap-2"><CalendarDays size={15} className="text-violet-300"/><h3 className="text-xs font-bold text-ink-primary">Brain · explicações independentes</h3></div>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Os insights não são associados automaticamente às áreas do Avatar. A origem exata pode ser apenas parcialmente conhecida.</p>
          {active.length? <ul className="mt-2 space-y-2">{active.map(insight=>{
            const receipt=evidenceReceiptM119(insight);
            return <li key={insight.id}><button type="button" onClick={()=>onExplain(insight)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-300/15 bg-surface/60 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
              <span className="min-w-0 flex-1"><strong className="block text-[11px] text-ink-primary">{insight.titulo}</strong><span className="mt-1 block text-[10px] text-ink-muted">{receipt.sample===null?"Amostra não informada":`${receipt.sample} registros declarados`} · {receipt.referencedEntityCount>0?`${receipt.referencedEntityCount} entidade(s) referenciada(s)`:"origem individual incompleta"}</span></span><ArrowUpRight size={15} className="shrink-0 text-violet-300"/>
            </button></li>;
          })}</ul> : <p className="mt-2 text-[11px] text-ink-muted">Nenhum insight apresentado neste momento. Isso não comprova ausência de problemas.</p>}
          <button type="button" onClick={()=>onNavigate("/inteligencia/alertas")} className="mt-2 min-h-11 w-full rounded-xl border border-violet-300/20 px-3 text-[11px] font-semibold text-violet-200">Abrir central do Brain</button>
        </section>
        <p className="text-[10px] leading-relaxed text-sky-100/80">{view.note}</p>
      </>}
    </div>}
  </details>;
}
