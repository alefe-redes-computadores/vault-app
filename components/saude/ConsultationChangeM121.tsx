"use client";
import { useMemo, useState } from "react";
import { ClipboardList, FileText, ShieldCheck } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildConsultationChangesM121 } from "@/lib/health-intelligence/consultation-changes-m121";
type Props={context:HealthInsightContext|null;ownerId:string;personId:string;today:string;onPrepare:(start:string)=>void};
/** Sem exportação silenciosa: delega à prévia e aos controles já existentes do Relatório 360. */
export function ConsultationChangeM121({context,ownerId,personId,today,onPrepare}:Props){
 const [chosenId,setChosenId]=useState<string|null>(null);
 const snapshot=useMemo(()=>buildConsultationChangesM121(context,ownerId,personId,today,chosenId),[context,ownerId,personId,today,chosenId]);
 const selected=snapshot.selected;
 return <section aria-label="Desde a última consulta" className="rounded-[22px] border border-violet-300/20 bg-violet-300/[0.035] p-4">
   <div className="flex items-center gap-2 text-sm font-bold text-ink-primary"><ClipboardList size={18} className="text-violet-200"/>Desde a última consulta</div>
   <p className="mt-1 text-xs text-ink-muted">Mudanças documentadas para preparar atendimento, sem diagnóstico automático.</p>
   {snapshot.state==="unavailable"?<p role="status" className="mt-3 text-xs text-ink-muted">Aguardando identificação e registros da pessoa ativa.</p>:
     snapshot.state==="no_baseline"?<p role="status" className="mt-3 text-xs text-ink-muted">Nenhuma consulta realizada com data válida foi encontrada. Você pode usar o período manual do relatório abaixo.</p>:<>
       <p className="mt-3 text-[11px] text-ink-muted">Selecione uma consulta registrada para definir o início da comparação.</p>
       <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-surface-border/50 p-1.5" role="group" aria-label="Marco da consulta">
         {snapshot.baselines.slice(0,8).map(b=><button type="button" aria-pressed={selected?.id===b.id} key={b.id} onClick={()=>setChosenId(b.id)} className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[11px] ${selected?.id===b.id?"bg-violet-300/10 text-violet-100":"text-ink-secondary"}`}><span className="min-w-0 truncate">{b.label}</span><span className="shrink-0 font-mono">{b.date.split("-").reverse().join("/")}</span></button>)}
       </div>
       <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
         <p className="rounded-lg bg-surface/70 p-2"><strong className="block text-sm text-ink-primary">{snapshot.counts.confirmedDoses}</strong> tomadas confirmadas</p>
         <p className="rounded-lg bg-surface/70 p-2"><strong className="block text-sm text-ink-primary">{snapshot.counts.ignoredDoses}</strong> doses ignoradas</p>
         <p className="rounded-lg bg-surface/70 p-2"><strong className="block text-sm text-ink-primary">{snapshot.counts.healthRecords}</strong> registros de saúde</p>
         <p className="rounded-lg bg-surface/70 p-2"><strong className="block text-sm text-ink-primary">{snapshot.counts.documentsRegistered}</strong> documentos cadastrados</p>
       </div>
       {snapshot.sample.length>0&&<details className="mt-3 rounded-xl border border-surface-border/50 p-2"><summary className="min-h-10 cursor-pointer text-xs font-semibold text-ink-muted">Ver registros recentes de exemplo</summary><ul className="space-y-1 pt-2 text-[11px] text-ink-muted">{snapshot.sample.map((v,i)=><li key={`${i}:${v.date}:${v.title}`}>{v.date.split("-").reverse().join("/")} · {v.title} · {v.source}</li>)}</ul></details>}
       <button type="button" disabled={!selected} onClick={()=>selected&&onPrepare(selected.date)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300/15 px-3 text-xs font-bold text-violet-100 disabled:opacity-50"><FileText size={16}/>Usar período no Relatório 360</button>
       <p className="mt-2 flex gap-2 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck size={14} className="shrink-0"/>{snapshot.limitation} Exportação somente com sua seleção explícita.</p>
     </>}
 </section>;
}
