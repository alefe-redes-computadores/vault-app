"use client";
import { useState, type ReactNode } from "react";
import { Clock, ChevronDown, CheckCircle2 } from "lucide-react";
import { MedicationFormatIcon } from "./MedicationFormatIcon";
import { useHapticFeedback } from "@/lib/haptics";

type Slot = { medicamentoId?: string; medicamentoNome?: string; horario: string; formato?: string; cores?: string[]; tomada: boolean; ignorada: boolean; isAvulsa?: boolean };
export function DoseScheduleGroups<T extends Slot>({items, renderItem, onTakeGroup, disabled}: {items:T[];renderItem:(item:T,index:number)=>ReactNode;onTakeGroup?:(items:T[])=>void;disabled?:boolean}) {
  const [expanded,setExpanded]=useState<string[]>([]);
  const {trigger}=useHapticFeedback();
  const groups=new Map<string,T[]>();
  items.forEach((item,index)=>{const key=item.medicamentoId&&!item.isAvulsa?item.horario:`single-${index}`;groups.set(key,[...(groups.get(key)||[]),item]);});
  return <>{Array.from(groups,([key,slots])=>{
    if(slots.length<2)return <div key={key}>{renderItem(slots[0],items.indexOf(slots[0]))}</div>;
    const open=expanded.includes(key), resolved=slots.filter(item=>item.tomada||item.ignorada).length, pending=slots.filter(item=>!item.tomada&&!item.ignorada);
    return <section key={key} className="overflow-hidden rounded-[24px] border border-surface-border bg-surface">
      <button type="button" aria-expanded={open} onClick={()=>{trigger("vibrate");setExpanded(values=>open?values.filter(value=>value!==key):[...values,key]);}} className="flex min-h-[72px] w-full items-center gap-3 p-4 text-left">
        {resolved===slots.length?<CheckCircle2 size={20} className="shrink-0 text-emerald-400"/>:<Clock size={20} className="shrink-0 text-ink-muted"/>}
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-primary">{key} · {slots.length} medicamentos</span><span className="mt-1 block text-xs text-ink-muted">{resolved===slots.length?"Registros concluídos":`${resolved}/${slots.length} registrados · abrir para registrar individualmente`}</span></span>
        <ChevronDown size={17} className={`shrink-0 text-ink-muted ${open?"rotate-180":""}`}/>
      </button>
      <div className="flex flex-wrap gap-2 px-4 pb-4">{slots.map((item,index)=><span key={`${item.medicamentoId}-${index}`} title={item.medicamentoNome} className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-raised px-2 py-1.5"><MedicationFormatIcon formato={item.formato} cores={item.cores} size={20}/><span className="text-[10px] text-ink-primary">{item.medicamentoNome}</span></span>)}</div>
      {pending.length>1&&onTakeGroup?<button type="button" disabled={disabled} onClick={()=>onTakeGroup(pending)} className="mb-4 ml-4 min-h-[44px] rounded-xl bg-emerald-400/10 px-3 text-xs font-bold text-emerald-400 disabled:opacity-50">Registrar os {pending.length} deste horário</button>:null}
      {open?<div className="space-y-2 border-t border-surface-border p-3">{slots.map(item=>renderItem(item,items.indexOf(item)))}</div>:null}
    </section>;
  })}</>;
}
