"use client";
import { useMemo, useState } from "react";
import { Activity, ChevronDown, ClipboardList } from "lucide-react";
import type { buildTreatmentCareDossier } from "@/lib/health-network/care-continuity";

type Dossier=NonNullable<ReturnType<typeof buildTreatmentCareDossier>>;
/** Read-only projection over already-linked V227 symptoms; no extra queries or inference. */
export function TreatmentSymptomTimeline({dossier,onNavigate}:{dossier:Dossier|null;onNavigate:(href:string)=>void}){
 const [expanded,setExpanded]=useState(false);
 const records=dossier?.symptoms??[];
 const points=useMemo(()=>{
  const grouped=new Map<string,{date:string;values:number[];count:number}>();
  for(const {record} of records){
   let day=grouped.get(record.data);if(!day){day={date:record.data,values:[],count:0};grouped.set(record.data,day)}
   day.count++;
   if(typeof record.intensidade==="number"&&Number.isFinite(record.intensidade)&&record.intensidade>=0&&record.intensidade<=10)day.values.push(record.intensidade);
  }
  return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
 },[records]);
 if(!dossier)return null;
 const described=points.filter(p=>p.values.length>0);
 return <section aria-label="Evolução dos sintomas vinculados" className="overflow-hidden rounded-[20px] border border-surface-border bg-surface">
  <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} className="flex min-h-12 w-full items-center gap-2 px-3 py-3 text-left"><Activity size={17} className="text-violet-300"/><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Sintomas vinculados · 30 dias</strong><span className="block text-[10px] text-ink-muted">{records.length} relato(s) em {points.length} dia(s) · vínculo explícito</span></span><ChevronDown size={16} className={`text-ink-muted transition-transform ${expanded?"rotate-180":""}`}/></button>
  {expanded&&<div className="space-y-3 border-t border-surface-border/60 p-3">
   {described.length>0?<>
    <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Intensidade média declarada em cada dia com sintomas e intensidade válida">
     {described.map(p=>{const mean=p.values.reduce((a,b)=>a+b,0)/p.values.length;return <div key={p.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1" title={`${p.date}: ${p.count} relatos, intensidade média ${mean.toFixed(1)}/10`}><div className="w-full rounded-t-md bg-violet-400/65" style={{height:`${Math.max(4,mean/10*100)}%`}}/><span className="truncate text-center text-[8px] text-ink-muted">{p.date.slice(8)}</span></div>})}
    </div>
    <p className="text-[10px] leading-relaxed text-ink-muted">Escala registrada de 0–10, agrupada por dia. Dias sem relatos ou sem intensidade válida não entram na média. Mudanças não demonstram causa ou eficácia de medicamento.</p>
   </>:<p className="text-xs text-ink-muted">{records.length?"Existem relatos relacionados, mas não há intensidades válidas para desenhar o gráfico.":"Ainda não há relatos de sintomas vinculados nos últimos 30 dias."}</p>}
   <button type="button" onClick={()=>onNavigate("/saude/registros")} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-primary"><span className="flex items-center gap-2"><ClipboardList size={14}/> Abrir diário de saúde</span><span aria-hidden>›</span></button>
  </div>}
 </section>;
}
