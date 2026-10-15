"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Clock, ChevronDown, CheckCircle2, PackageX } from "lucide-react";
import { MedicationFormatIcon } from "./MedicationFormatIcon";
import { useHapticFeedback } from "@/lib/haptics";
import { groupScheduleSlots, type ScheduleSlot } from "@/lib/dose-schedule-groups";

type Slot = ScheduleSlot & {medicamentoNome?:string;formato?:string;cores?:string[]};
export function DoseScheduleGroups<T extends Slot>({items, renderItem, onTakeGroup, disabled}: {items:T[];renderItem:(item:T,index:number)=>ReactNode;onTakeGroup?:(items:T[])=>void;disabled?:boolean}) {
  const [expanded,setExpanded]=useState<string[]>([]);
  const {trigger}=useHapticFeedback();const groupId=useId();
  const groups=useMemo(()=>groupScheduleSlots(items),[items]);
  return <>{groups.map(({key,slots,entries,pending,resolved,unavailable},groupIndex)=>{
    if(slots.length<2)return <div key={key}>{renderItem(entries[0].item,entries[0].index)}</div>;
    const open=expanded.includes(key),complete=resolved===slots.length,panelId=`${groupId}-${groupIndex}`;
    return <section key={key} className="overflow-hidden rounded-[24px] border border-surface-border bg-surface">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={()=>{trigger("vibrate");setExpanded(values=>values.includes(key)?values.filter(value=>value!==key):[...values,key]);}} className="flex min-h-[72px] w-full items-center gap-3 p-4 text-left">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${complete?'bg-emerald-400/10 text-emerald-300':'bg-surface-raised text-ink-muted'}`}>{complete?<CheckCircle2 size={20}/>:<Clock size={20}/>}</span>
        <span className="min-w-0 flex-1"><span className="block text-lg font-semibold text-ink-primary">{slots[0].horario}<span className="ml-2 text-xs font-normal text-ink-muted">{slots.length} medicamentos</span></span><span className="mt-1 block text-xs text-ink-muted">{complete?"Registros concluídos":`${pending.length} para revisar · ${resolved} registrados`}</span></span>
        <ChevronDown size={17} className={`shrink-0 text-ink-muted transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {!open?<div className="flex flex-wrap gap-2 px-4 pb-3">{slots.map((item,index)=><span key={`${item.medicamentoId}-${index}`} title={item.medicamentoNome} className={`flex max-w-full items-center gap-1.5 rounded-xl border px-2 py-1.5 ${item.tomada||item.ignorada?'border-surface-border/50 text-ink-muted':'border-surface-border bg-surface-raised text-ink-primary'}`}><MedicationFormatIcon formato={item.formato} cores={item.cores} size={19}/><span className="break-words text-[11px]">{item.medicamentoNome}{item.tomada?' · tomada':item.ignorada?' · não tomada':''}</span></span>)}</div>:null}
      {unavailable>0?<p className="mx-4 mb-3 flex items-center gap-2 text-[11px] text-amber-300"><PackageX size={14}/>{unavailable} {unavailable===1?'dose com estoque zerado':'doses com estoque zerado'} · confirme o que aconteceu</p>:null}
      {pending.length>1&&onTakeGroup?<button type="button" disabled={disabled} onClick={()=>onTakeGroup(pending)} className="mb-3 ml-4 min-h-11 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] px-3 text-xs font-semibold text-emerald-300 disabled:opacity-50">Revisar {pending.length} doses deste horário</button>:null}
      <div id={panelId} hidden={!open} className="space-y-2 border-t border-surface-border p-3">{open?entries.map(({item,index})=>renderItem(item,index)):null}</div>
    </section>;
  })}</>;
}
