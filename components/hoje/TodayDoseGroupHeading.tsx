"use client";
import { memo } from "react";
import type { LucideIcon } from "lucide-react";

/** Read-only, accessible group summary. Count authority comes from memoized Hoje projection. */
export const TodayDoseGroupHeading = memo(function TodayDoseGroupHeading({icon: Icon,label,description,completed,total,progress}: {
  icon: LucideIcon;
  label: string;
  description: string;
  completed: number;
  total: number;
  progress: number;
}) {
  const percent = Number.isFinite(progress) ? Math.max(0,Math.min(100,progress)) : 0;
  return <div className="flex min-w-0 items-end justify-between gap-3 px-1">
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-surface-border/40 bg-surface-raised text-ice" aria-hidden="true"><Icon size={15}/></span>
      <span className="min-w-0"><span className="block break-words font-display text-sm font-bold uppercase tracking-wider text-ink-primary">{label}</span><span className="block break-words text-[11px] text-ink-muted">{description}</span></span>
    </div>
    <div className="flex shrink-0 items-center gap-2.5">
      <div role="progressbar" aria-label={`Registros tomados no grupo ${label}`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} className="hidden w-20 overflow-hidden rounded-full bg-surface-border sm:block">
        <div className="h-1.5 rounded-full bg-emerald-400 transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${percent}%`}}/>
      </div>
      <span className="font-mono text-[10px] text-ink-faint" aria-label={`${completed} de ${total} registros marcados como tomados`}>{completed}/{total}</span>
    </div>
  </div>;
});
