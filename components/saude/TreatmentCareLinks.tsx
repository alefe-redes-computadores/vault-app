"use client";
import { Building2, CalendarClock, ChevronDown, ChevronRight, FileStack, Link2, Receipt } from "lucide-react";
import { SUPPLY_ORIGIN_LABELS } from "@/lib/health-supply/types";
import type { treatmentCareContext } from "@/lib/treatment-care-context";

type Context = ReturnType<typeof treatmentCareContext>;
const statusLabel: Record<string,string> = { agendada:"Agendada", realizada:"Realizada", cancelada:"Cancelada", nao_realizada:"Não realizada" };
const dateLabel=(value?:string|null)=>value?value.split("-").reverse().join("/"):"Data não informada";

export function TreatmentCareLinks({context,color,onNavigate,loading=false}:{context:Context;color:string;onNavigate:(href:string)=>void;loading?:boolean}) {
  const {processes,withdrawals,renewals,documents}=context;
  const medicationsById=new Map(context.medications.map(m=>[m.id,m]));
  const counts=[
    {label:"Processos",value:processes.length,Icon:Building2},
    {label:"Retiradas",value:withdrawals.length,Icon:CalendarClock},
    {label:"Aquisições",value:renewals.length,Icon:Receipt},
    {label:"Documentos",value:documents.length,Icon:FileStack},
  ];
  const hasRelations=counts.some(item=>item.value>0);
  return <section className="overflow-hidden rounded-[24px] border border-surface-border bg-surface" aria-label="Cuidado conectado do tratamento">
    <div className="flex items-start gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.035]" style={{color}}><Link2 size={18}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-ink-primary">Cuidado conectado</h3><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Fornecimento, retiradas, aquisições e documentos ligados pelos medicamentos deste tratamento.</p></div></div>
    <div className="grid grid-cols-4 border-y border-surface-border/60 bg-black/10">{counts.map(({label,value,Icon})=><div key={label} className="border-r border-surface-border/60 px-1 py-2.5 text-center last:border-r-0"><Icon size={13} className="mx-auto text-ink-muted"/><strong className="mt-1 block text-sm text-ink-primary">{value}</strong><span className="block truncate text-[8px] text-ink-muted">{label}</span></div>)}</div>
    <div className="p-3">
      {loading?<p role="status" className="text-xs text-ink-muted">Consultando vínculos locais…</p>:null}
      {!loading&&!hasRelations?<p className="rounded-xl bg-void/35 p-3 text-xs leading-relaxed text-ink-muted">Ainda não há eventos relacionados. Um vínculo só aparece quando está salvo explicitamente no tratamento ou em um de seus medicamentos.</p>:null}
      {processes.length>0?<ul className="overflow-hidden rounded-xl border border-surface-border/60">{processes.map((process,index)=><li key={process.id} className={index>0?"border-t border-surface-border/60":""}><button type="button" onClick={()=>onNavigate(`/saude/fornecimento?id=${encodeURIComponent(process.id)}`)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/[0.07] text-emerald-300"><Building2 size={15}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink-primary">{process.titulo}</span><span className="mt-0.5 block text-[9px] text-ink-muted">{SUPPLY_ORIGIN_LABELS[process.origem]} · {process.status==='ativo'?'Em andamento':'Encerrado'}</span></span><ChevronRight size={15} className="shrink-0 text-ink-muted"/></button></li>)}</ul>:null}
      {withdrawals.length>0?<details className="group mt-2 rounded-xl border border-surface-border/60"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-ink-primary"><CalendarClock size={15} className="text-ink-muted"/><span className="flex-1">Histórico de retiradas</span><span className="text-[10px] font-normal text-ink-muted">{withdrawals.length}</span><ChevronDown size={15} className="transition-transform group-open:rotate-180"/></summary><ul className="border-t border-surface-border/60">{withdrawals.map((withdrawal,index)=><li key={withdrawal.id||index} className={index>0?"border-t border-surface-border/50":""}>{withdrawal.id?<button type="button" onClick={()=>onNavigate(`/saude/retiradas/detalhes?id=${encodeURIComponent(withdrawal.id!)}`)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink-primary">{medicationsById.get(withdrawal.medicamento_id)?.nome||withdrawal.medicamento_nome||"Medicamento"}</span><span className="mt-0.5 block text-[9px] text-ink-muted">{dateLabel(withdrawal.data)} · {statusLabel[withdrawal.status]||withdrawal.status}</span></span><ChevronRight size={15} className="shrink-0 text-ink-muted"/></button>:<p className="px-3 py-3 text-xs text-ink-muted">Retirada sem identificador disponível</p>}</li>)}</ul></details>:null}
    </div>
  </section>;
}
