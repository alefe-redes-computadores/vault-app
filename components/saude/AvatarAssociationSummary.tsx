"use client";
import { useMemo, useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCautiousAssociations } from "@/lib/health-intelligence/cautious-associations";

export function AvatarAssociationSummary({context,onNavigate}:{context:HealthInsightContext|null|undefined;onNavigate:(href:string)=>void}){
 const items=useMemo(()=>context?buildCautiousAssociations({records:context.registrosSaude,userId:context.userId||"",personId:context.personId||"",today:context.hoje||new Date().toISOString().slice(0,10),days:30}):[],[context]);
 const [showAll,setShowAll]=useState(false);
 if(!items.length)return null;const first=items[0];const additional=items.length-1;
 return <div className="overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-300/[.035]"><button type="button" onClick={()=>onNavigate("/saude/registros/relatorio")} className="flex min-h-14 w-full items-center gap-3 border-l-2 border-l-violet-300/40 p-3 text-left" aria-label="Abrir associação temporal no relatório"><Activity size={17} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1"><strong className="block text-[11px] text-violet-200">Contexto corporal e rotina</strong><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{first.message}</span><span className="mt-1 block text-[9px] text-ink-faint">{first.pairedDays} dias pareados · associação não causal</span>{additional>0?<span className="mt-1 block text-[9px] text-violet-200">Mais {additional} associação(ões) cautelosa(s) no relatório</span>:null}<span className="mt-1 block text-[9px] text-ink-faint">Observações não estabelecem causa nem diagnóstico.</span></span><ChevronRight size={15} className="shrink-0 text-violet-300"/></button>
 {additional>0?<><button type="button" aria-expanded={showAll} onClick={()=>setShowAll(value=>!value)} className="min-h-11 w-full border-t border-violet-300/15 px-3 text-left text-[10px] font-semibold text-violet-200">{showAll?"Recolher associações":`Examinar as ${additional} outras associações neste painel`}</button>{showAll?<ul className="space-y-2 border-t border-violet-300/15 p-3">{items.slice(1).map((item,index)=><li key={`${index}-${item.message}`} className="rounded-xl border border-surface-border/50 p-2 text-[10px] text-ink-muted"><p>{item.message}</p><p className="mt-1 text-[9px] text-ink-faint">{item.pairedDays} dias pareados · observação não causal</p></li>)}</ul>:null}</>:null}
 </div>;
}
