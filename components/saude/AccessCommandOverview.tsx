"use client";
import { CalendarClock, ChevronRight, FileCheck2, FolderHeart, PackageCheck, ReceiptText, ShoppingBag } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export function AccessCommandOverview({command,onNavigate}:{command:CareCommandSnapshot|null|undefined;onNavigate:(href:string)=>void}) {
  if(!command)return null;
  const access=command.access, decision=command.decision;
  const lanes=[
    {label:"Processos ativos",value:access.processes.active,detail:`${access.cycles.preparing} preparando · ${access.cycles.protocolled} protocolado(s)`,Icon:FolderHeart,href:"/saude/fornecimento#processos"},
    {label:"Documentos pendentes",value:access.documents.explicitMissing,detail:"Somente exigência explícita",Icon:FileCheck2,href:"/saude/fornecimento#documentos-pendentes"},
    {label:"Receitas registradas",value:access.prescriptions,detail:"Não confirmam aquisição",Icon:ReceiptText,href:"/saude/renovacao"},
    {label:"Aquisições",value:access.acquisitions.realized,detail:`${access.acquisitions.planned} planejada(s)`,Icon:ShoppingBag,href:"/saude/renovacao"},
    {label:"Retiradas abertas",value:access.withdrawals.scheduled,detail:access.withdrawals.overdue?`${access.withdrawals.overdue} vencida(s) ainda abertas`:`${access.withdrawals.realized} realizada(s) no histórico`,Icon:PackageCheck,href:"/saude/retiradas"},
  ];
  return <section aria-label="Comando de acesso e fornecimento" className="rounded-[20px] border border-emerald-300/15 bg-[linear-gradient(145deg,rgba(110,231,183,.055),rgba(8,12,19,.45))] p-3">
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><CalendarClock size={17}/></span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-300">Acesso 360</p><h2 className="mt-0.5 text-sm font-bold text-ink-primary">Processos, documentos e eventos reais</h2><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{access.note}</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-2 min-[430px]:grid-cols-3">{lanes.map(({label,value,detail,Icon,href})=><button key={label} type="button" onClick={()=>onNavigate(href)} className="flex min-h-14 items-center gap-2 rounded-xl border border-surface-border/60 bg-surface/60 p-2 text-left transition-colors hover:border-emerald-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><Icon size={14} className="shrink-0 text-emerald-200"/><span className="min-w-0"><strong className="block text-xs text-ink-primary">{value} · {label}</strong><span className="mt-0.5 block text-[8px] leading-tight text-ink-muted">{detail}</span></span></button>)}</div>
    {decision?.href?<button type="button" onClick={()=>onNavigate(decision.href)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-3 text-left"><span className="min-w-0 flex-1"><span className="block text-[8px] font-bold uppercase tracking-wider text-violet-200">Brain · próxima decisão</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{decision.title}</strong></span><ChevronRight size={14} className="text-ink-muted"/></button>:null}
  </section>;
}
