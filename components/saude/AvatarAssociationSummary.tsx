"use client";
import { useMemo } from "react";
import { Activity, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCautiousAssociations } from "@/lib/health-intelligence/cautious-associations";

export function AvatarAssociationSummary({context,onNavigate}:{context:HealthInsightContext|null|undefined;onNavigate:(href:string)=>void}){
 const items=useMemo(()=>context?buildCautiousAssociations({records:context.registrosSaude,userId:context.userId||"",personId:context.personId||"",today:context.hoje||new Date().toISOString().slice(0,10),days:30}):[],[context]);
 if(!items.length)return null;const first=items[0];
 return <button type="button" onClick={()=>onNavigate("/saude/registros/relatorio")} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-violet-300/15 border-l-2 border-l-violet-300/40 bg-violet-300/[.035] p-3 text-left" aria-label="Abrir associação temporal no relatório"><Activity size={17} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1"><strong className="block text-[11px] text-violet-200">Contexto corporal e rotina</strong><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{first.message}</span><span className="mt-1 block text-[9px] text-ink-faint">{first.pairedDays} dias pareados · associação não causal</span></span><ChevronRight size={15} className="shrink-0 text-violet-300"/></button>;
}
