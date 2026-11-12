"use client";
import { Bird, Flame } from "lucide-react";

/**
 * Fênix is a visual identity for the personal Avatar, not a second clinical
 * intelligence engine. This mark never reads health records or animates WebGL.
 */
export function FenixMark({size="sm",label=false}: {size?:"xs"|"sm";label?:boolean}) {
  const small=size==="xs";
  return <span className="inline-flex min-w-0 items-center gap-1.5" role={label?undefined:"img"}
    aria-label={label?undefined:"Fênix, identidade visual do avatar"}>
    <span aria-hidden="true" className={`${small?"h-6 w-6 rounded-lg":"h-8 w-8 rounded-xl"} relative inline-flex shrink-0 items-center justify-center border border-amber-300/25 bg-gradient-to-br from-amber-400/15 via-orange-400/10 to-violet-400/10 text-amber-200 shadow-[inset_0_1px_0_rgba(251,191,36,.1)]`}>
      <Bird size={small?15:19} strokeWidth={1.8} className="-translate-x-[1px] translate-y-[1px]" />
      <Flame size={small?9:11} strokeWidth={2} className="absolute right-[2px] top-[1px] text-orange-300" />
    </span>
    {label?<span className="truncate text-[11px] font-bold tracking-[.04em] text-amber-200">Fênix</span>:null}
  </span>;
}
