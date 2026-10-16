"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import type { RegistroSaude } from "@/lib/types";
import { HealthMetricIcon, METRIC_TONES } from "./HealthDeviceIcon";
import { METRICS } from "@/lib/health-profile/types";
import { compactSeenHealthData, selectNewHealthData } from "@/lib/health-profile/new-data-summary";

export function NewHealthDataSummary({records,userId,personId,onOpen}:{records:RegistroSaude[];userId:string;personId:string;onOpen:()=>void}) {
  const storageKey=userId&&personId?`vault:health-arrivals:v1:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`:"";
  const [seen,setSeen]=useState<string[]|null>(null);
  useEffect(()=>{
    if(!storageKey){setSeen([]);return;}
    try{const parsed=JSON.parse(localStorage.getItem(storageKey)||"[]");setSeen(Array.isArray(parsed)?parsed.filter(x=>typeof x==="string"):[]);}catch{setSeen([]);}
  },[storageKey]);
  const summary=useMemo(()=>selectNewHealthData(records,new Set(seen||[])),[records,seen]);
  const acknowledge=()=>{
    if(seen===null)return;
    const next=compactSeenHealthData(seen,summary.keys);setSeen(next);
    try{if(storageKey)localStorage.setItem(storageKey,JSON.stringify(next));}catch{}
  };
  if(seen===null||summary.groups.length===0)return null;
  return <section aria-label="Novos dados de saúde" className="overflow-hidden rounded-xl border border-emerald-300/20 border-l-2 border-l-emerald-300/60 bg-gradient-to-r from-emerald-300/[.07] to-surface p-3">
    <div className="flex items-start gap-3"><span className="mt-0.5 text-emerald-300"><Sparkles size={18}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-primary">Seus dados foram atualizados</p><p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">O Vault agrupou somente registros novos recebidos dos seus dispositivos.</p></div><button type="button" onClick={acknowledge} aria-label="Dispensar novos dados" className="flex h-10 w-10 items-center justify-center text-ink-muted"><X size={17}/></button></div>
    <ul className="mt-3 divide-y divide-surface-border/50 border-y border-surface-border/50">{summary.groups.map(group=><li key={group.type} className="flex items-center gap-3 py-2.5"><span className={METRIC_TONES[group.type]}><HealthMetricIcon type={group.type} size={17}/></span><span className="min-w-0 flex-1 text-xs"><strong className="font-semibold text-ink-primary">{METRICS[group.type].label}</strong><span className="ml-1 text-ink-muted">· {group.count} {group.count===1?"registro novo":"registros novos"}</span></span></li>)}</ul>
    <button type="button" onClick={()=>{acknowledge();onOpen();}} className="mt-2 flex min-h-11 w-full items-center justify-between text-xs font-semibold text-emerald-300">Ver registros<ChevronRight size={16}/></button>
  </section>;
}
