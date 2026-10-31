"use client";
import { memo } from "react";

type Counts = {overdue:number;prepare:number;unknown:number};
/** Derived counts only. Zero lanes are hidden; no extra queries, writes or clinical labels. */
export const AvatarReadinessCounters=memo(function AvatarReadinessCounters({counts}:{counts:Counts}){
  const lanes=[
    {key:"overdue",value:counts.overdue,label:"Revisar",tone:"border-rose-300/15 bg-rose-300/[.04] text-rose-200"},
    {key:"prepare",value:counts.prepare,label:"Preparar",tone:"border-amber-300/15 bg-amber-300/[.04] text-amber-200"},
    {key:"unknown",value:counts.unknown,label:"Esclarecer",tone:"border-cyan-300/15 bg-cyan-300/[.04] text-cyan-200"},
  ].filter(item=>Number.isFinite(item.value)&&item.value>0);
  if(!lanes.length)return null;
  return <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3" aria-label="Situação contextual do cuidado">
    {lanes.map(item=><div key={item.key} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 ${item.tone}`}>
      <strong className="text-base font-semibold tabular-nums">{item.value}</strong>
      <span className="text-[11px] leading-tight">{item.label}</span>
    </div>)}
  </div>;
});
