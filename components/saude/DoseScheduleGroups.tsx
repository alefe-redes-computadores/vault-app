"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Clock, ChevronDown, CheckCircle2, PackageX, ListChecks } from "lucide-react";
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
    return <section key={key} aria-label={`Doses das ${slots[0].horario}`} className="overflow-hidden rounded-[18px] border border-surface-border bg-surface [content-visibility:auto] [contain-intrinsic-size:120px]">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={()=>{trigger("vibrate");setExpanded(values=>values.includes(key)?values.filter(value=>value!==key):[...values,key]);}} className="flex min-h-[64px] w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${complete?'bg-emerald-400/10 text-emerald-300':unavailable>0?'bg-amber-400/10 text-amber-300':'bg-surface-raised text-ink-muted'}`}>{complete?<CheckCircle2 size={18}/>:unavailable>0?<PackageX size={18}/>:<Clock size={18}/>}</span>
        <span className="min-w-0 flex-1"><span className="flex items-baseline gap-2"><strong className="text-base text-ink-primary">{slots[0].horario}</strong><span className="text-[10px] text-ink-muted">{slots.length} medicamentos</span></span><span className="mt-0.5 block text-[10px] text-ink-muted">{complete?"Horário concluído":`${pending.length} pendentes · ${resolved} resolvidos`}</span></span>
        <ChevronDown size={17} className={`shrink-0 text-ink-muted transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {!open?<div className="flex items-center gap-2 border-t border-surface-border/50 px-3 py-2"><span className="flex shrink-0 -space-x-2">{slots.slice(0,4).map((item,index)=><span key={`${item.medicamentoId}-${index}`} title={item.medicamentoNome} className="grid size-7 place-items-center rounded-full border border-surface bg-surface-raised"><MedicationFormatIcon formato={item.formato} cores={item.cores} size={17}/></span>)}</span><span className="min-w-0 flex-1 truncate text-[10px] text-ink-muted">{slots.map(item=>item.medicamentoNome).join(" · ")}</span>{slots.length>4?<span className="shrink-0 text-[9px] text-ink-faint">+{slots.length-4}</span>:null}</div>:null}
      {unavailable>0?<p className="mx-3 mb-2.5 flex items-center gap-2 rounded-lg bg-amber-400/[.055] px-2.5 py-2 text-[10px] text-amber-200"><PackageX size={13}/><span>{unavailable} {unavailable===1?'dose sem saldo confirmado':'doses sem saldo confirmado'} · revisar ocorrência</span></p>:null}
      {pending.length>1&&onTakeGroup?<button type="button" disabled={disabled} onClick={()=>onTakeGroup(pending)} className="mx-3 mb-3 flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] px-3 text-xs font-semibold text-emerald-300 disabled:opacity-50"><ListChecks size={15}/>Revisar {pending.length} juntas</button>:null}
      <div id={panelId} hidden={!open} className="space-y-2 border-t border-surface-border p-3">{open?entries.map(({item,index})=>renderItem(item,index)):null}</div>
    </section>;
  })}</>;
}
