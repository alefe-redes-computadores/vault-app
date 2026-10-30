"use client";
import { AlertTriangle, Check, Circle, FileHeart, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import type { WithdrawalProgress } from "@/lib/health-intelligence/operational-triage";

type Step={label:string;detail:string;complete:boolean;current:boolean;href:string;icon:typeof Circle};
export function SupplyProcessJourney({hasProcess,hasCycle,documents,events,privateRoute,withdrawalProgress}:{
  hasProcess:boolean;hasCycle:boolean;documents:number;events:number;privateRoute:boolean;withdrawalProgress?:WithdrawalProgress;
}) {
  const pending=(withdrawalProgress?.scheduled??0)+(withdrawalProgress?.overdue??0);
  const recent = withdrawalProgress
    ? [withdrawalProgress.overdue?`${withdrawalProgress.overdue} atrasada(s)`:null,
       withdrawalProgress.scheduled?`${withdrawalProgress.scheduled} agendada(s)`:null,
       withdrawalProgress.realized?`${withdrawalProgress.realized} realizada(s)`:null,
       withdrawalProgress.notRealized?`${withdrawalProgress.notRealized} não realizada(s)`:null,
       withdrawalProgress.cancelled?`${withdrawalProgress.cancelled} cancelada(s)`:null].filter(Boolean).join(" · ")
    : `${events} registro(s) (conferir situação)`;
  const steps:Step[]=[
    {label:"Processo",detail:hasProcess?"Organizado":"Escolher rota",complete:hasProcess,current:!hasProcess,href:"#processos",icon:PackageCheck},
    {label:"Ciclo",detail:hasCycle?"Em acompanhamento":"Preparar ciclo",complete:hasCycle,current:hasProcess&&!hasCycle,href:"#ciclo-atual",icon:Truck},
    {label:"Documentos",detail:documents?`${documents} vinculado${documents===1?"":"s"}`:"Revisar vínculos",complete:documents>0,current:hasCycle&&documents===0,href:"#ciclo-atual",icon:FileHeart},
    {label:privateRoute?"Compras":"Retiradas",detail:privateRoute?(events?`${events} compra(s) no histórico`:"Sem compra registrada"):(events?recent:"Nenhuma retirada registrada"),complete:false,current:privateRoute?events===0:pending>0||events===0,href:"#ciclo-atual",icon:privateRoute?ShoppingBag:Truck},
  ];
  return <section aria-label="Jornada do fornecimento" className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.025] p-3">
    <div className="mb-3 flex items-center gap-2"><PackageCheck size={16} className="text-emerald-200"/><div className="min-w-0 flex-1"><h2 className="text-xs font-bold text-ink-primary">Jornada do fornecimento</h2><p className="mt-0.5 text-[9px] text-ink-muted">SUS, compras e documentos mantêm suas origens independentes. Etapas estruturais organizadas não confirmam compras ou retiradas. Um registro pode continuar pendente, cancelado ou não realizado.</p></div></div>
    {!privateRoute && (withdrawalProgress?.overdue??0)>0 && <p role="status" className="mb-2 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.06] p-2 text-[10px] text-amber-200"><AlertTriangle size={14} className="shrink-0"/>{withdrawalProgress!.overdue} retirada(s) com data anterior a hoje ainda agendada(s). Abra os registros para decidir o que fazer; nada é concluído automaticamente.</p>}
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">{steps.map(({label,detail,complete,current,href,icon:Icon})=><li key={label}><a href={href} aria-current={current?"step":undefined} className={`flex min-h-[68px] items-center gap-2 rounded-xl border px-2.5 py-2 ${current?"border-amber-300/35 bg-amber-300/[.06]":complete?"border-emerald-300/20 bg-emerald-300/[.035]":"border-surface-border bg-surface/60"}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${complete?"bg-emerald-300/10 text-emerald-200":current?"bg-amber-300/10 text-amber-200":"bg-surface-raised text-ink-faint"}`}>{complete?<Check size={15}/>:<Icon size={15}/>}</span><span className="min-w-0"><strong className="block text-[10px] text-ink-primary">{label}</strong><span className="mt-0.5 block text-[8px] leading-tight text-ink-muted">{detail}</span></span></a></li>)}</ol>
  </section>;
}
