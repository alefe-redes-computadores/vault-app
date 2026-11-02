"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle } from "lucide-react";
import type { TodayTimelineItem } from "@/lib/today/build-timeline-items";

type Props = { item: TodayTimelineItem; onOpen: () => void };

/** Read-only symptom entry: never infers causes or mutates medication records. */
export const TodaySymptomTimelineCard = memo(function TodaySymptomTimelineCard({item,onOpen}:Props){
  return <motion.button
    type="button"
    whileTap={{scale:0.985}}
    onClick={onOpen}
    style={{borderLeft:`6px solid ${item.cor}`}}
    className="group relative flex w-full flex-col gap-3 rounded-[20px] border border-amber-400/30 bg-amber-400/5 p-3.5 text-left shadow-sm transition-all hover:border-amber-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 motion-reduce:transform-none"
    aria-label={`Abrir registro de sintoma ${item.sintomaNome ?? ""}`}
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400"><Activity size={20}/></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400"><AlertTriangle size={12}/> Sintoma</span>
          <span className="text-[10px] text-ink-faint">•</span>
          <span className="font-mono text-[10px] text-ink-faint">{item.horario}</span>
        </div>
        <p className="mt-0.5 break-words text-sm font-semibold text-ink-primary">{item.sintomaNome}</p>
        {item.intensidade ? <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium text-ink-muted">Intensidade:</span>
          <div className="flex gap-0.5" aria-hidden="true">{[1,2,3,4,5].map(nivel=><span key={nivel} className={`h-1.5 w-3.5 rounded-full ${nivel <= (item.intensidade||1)?"bg-amber-400":"bg-surface-border"}`}/>)}</div>
          <span className="font-mono text-[10px] font-bold text-amber-400">{item.intensidade}/5</span>
        </div>:null}
        {item.observacoesSintoma ? <p className="mt-2 line-clamp-2 break-words text-xs italic text-ink-muted">“{item.observacoesSintoma}”</p>:null}
      </div>
      <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-400">Ver</span>
    </div>
  </motion.button>;
});
