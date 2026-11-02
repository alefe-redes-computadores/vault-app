"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, FileWarning } from "lucide-react";

type RenewalEvent = {id:string; titulo:string; descricao:string; atrasada:boolean; actionHref:string};
/** Planned prescriptions remain pending until a real event is recorded. */
export const TodayPrescriptionRenewalCard = memo(function TodayPrescriptionRenewalCard({event,onOpen}: {event: RenewalEvent; onOpen:()=>void}){
  const overdue=event.atrasada;
  return <motion.button
    type="button"
    whileTap={{scale:0.985}}
    onClick={onOpen}
    className={`w-full rounded-[22px] border p-3.5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 motion-reduce:transform-none ${overdue?"border-coral/25 bg-coral/[0.055]":"border-amber-400/25 bg-amber-400/[0.055]"}`}
  >
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdue?"bg-coral/15 text-coral":"bg-amber-400/15 text-amber-400"}`}><FileWarning size={18}/></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words text-[13px] font-bold text-ink-primary">{event.titulo}</p>
          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${overdue?"bg-coral/10 text-coral":"bg-amber-400/10 text-amber-400"}`}>{overdue?"Pendente":"Receita"}</span>
        </div>
        <p className="mt-1 break-words text-[10px] text-ink-muted">{event.descricao}</p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-ink-faint"/>
    </div>
  </motion.button>;
});
