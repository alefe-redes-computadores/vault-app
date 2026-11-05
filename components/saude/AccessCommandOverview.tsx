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
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><CalendarClock size={17}/></span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-emerald-300">Acesso 360</p><h2 className="mt-0.5 text-sm font-bold text-ink-primary">Processos, documentos e eventos reais</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">{access.note}</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Prioridades de acesso e fornecimento">
      {lanes.slice(0,2).map(({label,value,detail,Icon,href})=><button key={label} type="button" onClick={()=>onNavigate(href)} className="flex min-h-[86px] min-w-0 flex-col items-start gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-300/[.055] px-3 py-3 text-left transition-colors hover:bg-emerald-300/[.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="flex items-center gap-2"><Icon size={17} className="shrink-0 text-emerald-200"/><span className="font-mono text-xl font-bold tabular-nums text-ink-primary">{value}</span></span><span className="min-w-0"><strong className="block text-xs text-ink-primary">{label}</strong><span className="mt-1 block text-[11px] leading-snug text-ink-muted">{detail}</span></span></button>)}
    </div>
    <details className="group mt-2 overflow-hidden rounded-2xl border border-surface-border/60 bg-surface/50">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span>Receitas, compras e retiradas no histórico</span><ChevronRight size={16} aria-hidden="true" className="shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-90"/></summary>
      <div className="grid grid-cols-1 gap-2 border-t border-surface-border/50 p-2 min-[420px]:grid-cols-2">{lanes.slice(2).map(({label,value,detail,Icon,href})=><button key={label} type="button" onClick={()=>onNavigate(href)} className="flex min-h-[58px] min-w-0 items-center gap-2.5 rounded-xl border border-surface-border/60 bg-void/30 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><Icon size={16} className="shrink-0 text-emerald-200"/><span className="min-w-0"><strong className="block text-xs text-ink-primary">{value} · {label}</strong><span className="mt-1 block text-[11px] leading-snug text-ink-muted">{detail}</span></span></button>)}</div>
    </details>
    {decision?.href?<button type="button" onClick={()=>onNavigate(decision.href)} className="mt-3 flex min-h-[54px] w-full items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.055] px-3 py-2 text-left"><span className="min-w-0 flex-1"><span className="block text-[8px] font-bold uppercase tracking-wider text-violet-200">Brain · próxima decisão</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{decision.title}</strong></span><ChevronRight size={14} className="text-ink-muted"/></button>:null}
  </section>;
}
