"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import type { RegistroSaude } from "@/lib/types";
import { HealthMetricIcon, METRIC_TONES } from "./HealthDeviceIcon";
import { METRICS } from "@/lib/health-profile/types";
import { compactSeenHealthData, selectNewHealthData } from "@/lib/health-profile/new-data-summary";
import { healthReadingSource, healthReadingValue } from "@/lib/health-profile/avatar-readings";

export const NewHealthDataSummary=memo(function NewHealthDataSummary({records,userId,personId,onOpen}:{records:RegistroSaude[];userId:string;personId:string;onOpen:()=>void}) {
  const storageKey=userId&&personId?`vault:health-arrivals:v1:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`:"";
  const [seen,setSeen]=useState<string[]|null>(null);
  useEffect(()=>{
    if(!storageKey){setSeen([]);return;}
    try{const parsed=JSON.parse(localStorage.getItem(storageKey)||"[]");setSeen(Array.isArray(parsed)?parsed.filter(x=>typeof x==="string"):[]);}catch{setSeen([]);}
  },[storageKey]);
  const summary=useMemo(()=>selectNewHealthData(records,new Set(seen||[]),new Date(),{personId,userId}),[records,seen,personId,userId]);
  const acknowledge=()=>{
    if(seen===null)return;
    const next=compactSeenHealthData(seen,summary.keys);setSeen(next);
    try{if(storageKey)localStorage.setItem(storageKey,JSON.stringify(next));}catch{}
  };
  if(seen===null||summary.groups.length===0)return null;
  const hasSleep=summary.groups.some(group=>group.type==="sono");
  return <section aria-label="Novos dados de saúde" className="overflow-hidden rounded-2xl border border-emerald-300/20 border-l-2 border-l-emerald-300/60 bg-gradient-to-br from-emerald-300/[.075] via-surface to-surface p-3">
    <div className="flex items-start gap-3"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Sparkles size={17}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-primary">{hasSleep?"Sua noite está registrada":"Novos dados organizados"}</p><p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">Dados recém-recebidos dos seus dispositivos. Isso não representa uma nova conclusão clínica.</p></div><button type="button" onClick={acknowledge} aria-label="Dispensar novos dados" className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><X size={17}/></button></div>
    <ul className="mt-3 overflow-hidden rounded-xl border border-surface-border/60 bg-void/20">{summary.groups.map(group=>{const value=healthReadingValue(group.latest);const source=healthReadingSource(group.latest.source);return <li key={group.type} className="flex min-h-[58px] items-center gap-3 border-b border-surface-border/50 px-3 py-2 last:border-b-0"><span className={METRIC_TONES[group.type]}><HealthMetricIcon type={group.type} size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-ink-primary">{METRICS[group.type].label}</strong><span className="mt-0.5 block truncate text-[9px] text-ink-muted">{source}{group.latest.horario?` · ${group.latest.horario}`:""}</span></span><span className="max-w-[40%] text-right"><strong className="block truncate text-xs text-ink-primary">{value||"Recebido"}</strong><span className="mt-0.5 block text-[9px] text-ink-muted">{group.count} {group.count===1?"novo":"novos"}</span></span></li>;})}</ul>
    <button type="button" onClick={()=>{acknowledge();onOpen();}} className="mt-2 flex min-h-11 w-full items-center justify-between text-xs font-semibold text-emerald-300">Ver registros<ChevronRight size={16}/></button>
  </section>;
});
