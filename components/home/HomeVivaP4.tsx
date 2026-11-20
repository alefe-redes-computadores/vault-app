"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, ChevronRight, HeartPulse, ShieldCheck, Stethoscope, type LucideIcon } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { buildHomeVivaFrontsP4, type HomeVivaInputP4, type HomeVivaFrontP4 } from "@/lib/home/home-viva-p4";

type Props={data:HomeVivaInputP4;onNavigate:(href:string)=>void};
const ICON:Record<HomeVivaFrontP4["id"],LucideIcon>={temporary:ShieldCheck,monitor:HeartPulse,consultation:Stethoscope,routine:CalendarCheck2};
const TONE:Record<HomeVivaFrontP4["tone"],string>={
  emerald:"border-emerald-300/25 bg-emerald-300/[.06] text-emerald-200",
  sky:"border-sky-300/25 bg-sky-300/[.06] text-sky-200",
  violet:"border-violet-300/25 bg-violet-300/[.06] text-violet-200",
};
export function HomeVivaP4({data,onNavigate}:Props){
  const {trigger}=useHapticFeedback();
  const fronts=useMemo(()=>buildHomeVivaFrontsP4(data),[data.userId,data.personId,data.today,data.medications,data.consultations,data.events]);
  const [selected,setSelected]=useState<HomeVivaFrontP4["id"]|null>(null);
  useEffect(()=>setSelected(null),[data.userId,data.personId]);
  const active=fronts.find(item=>item.id===selected)||fronts[0];
  const Icon=ICON[active.id];
  return <section aria-label="Acompanhamento contextual" data-vault-ia20-p4-home-viva
    className={`min-w-0 overflow-hidden rounded-[18px] border p-3 shadow-sm ${TONE[active.tone]}`}>
    <div className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-black/10"><Icon size={18} aria-hidden="true"/></span>
      <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wide">{active.label}</span><strong className="block break-words text-xs font-bold leading-snug text-ink-primary">{active.title}</strong></span></div>
    {fronts.length>=2?<div className="mt-2 flex flex-wrap gap-1" aria-label="Frentes de acompanhamento">{fronts.map(front=><button key={front.id} type="button" aria-pressed={active.id===front.id} onClick={()=>{trigger("light");setSelected(front.id);}}
      className={`min-h-11 min-w-0 rounded-lg border px-2 text-[10px] font-semibold focus-visible:outline focus-visible:outline-2 ${active.id===front.id?"border-current/50 bg-black/20":"border-surface-border/50 bg-black/5"}`}>{front.id==="temporary"?"Tratamento":front.id==="monitor"?"Pressão":"Consulta"}</button>)}</div>:null}
    <p className="mt-2 break-words text-[11px] leading-snug text-ink-secondary">{active.description}</p>
    <p className="mt-1 text-[10px] leading-snug text-ink-muted">{active.detail}</p>
    <div className={`mt-2 grid gap-2 ${active.id==="routine"?"grid-cols-2":"grid-cols-1"}`}>
      <button type="button" onClick={()=>onNavigate(active.id==="routine"?"/saude/careflow/sintomas":active.href)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-current/20 bg-black/10 px-2.5 text-left text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-current active:opacity-80 motion-reduce:transition-none">
        <span>{active.id==="routine"?"Registrar sintoma":"Conferir registros"}</span><ChevronRight size={16} className="shrink-0" aria-hidden="true"/>
      </button>
      {active.id==="routine"?<button type="button" onClick={()=>onNavigate("/saude/careflow/pressao")} className="flex min-h-11 min-w-0 items-center justify-between gap-1 rounded-xl border border-current/20 bg-black/5 px-2.5 text-left text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-current active:opacity-80 motion-reduce:transition-none"><span>Registrar pressão</span><ChevronRight size={15} className="shrink-0" aria-hidden="true"/></button>:null}
    </div>
  </section>;
}
