"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** M13: only the row presentation; eligibility, ownership and navigation remain in the page. */
export function TreatmentTimelineRow({title,description,date,icon,disabled,onOpen}: {
  title: string;
  description?: string | null;
  date: string;
  icon: ReactNode;
  disabled: boolean;
  onOpen: () => void;
}) {
  return <button type="button" disabled={disabled} onClick={onOpen}
    className="relative flex min-h-14 w-full min-w-0 items-center gap-2.5 rounded-xl border border-surface-border/60 bg-surface/85 px-3 py-2 text-left transition-colors enabled:hover:bg-surface-raised/70 enabled:active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-default motion-reduce:transition-none">
    <span aria-hidden="true" className="absolute -left-[22px] top-5 h-2.5 w-2.5 rounded-full border-2 border-void bg-emerald-300 ring-1 ring-surface-border/50"/>
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-raised text-ink-secondary" aria-hidden="true">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block break-words text-xs font-semibold leading-snug text-ink-primary">{title}</span>
      {description ? <span className="mt-0.5 block line-clamp-2 break-words text-[10px] leading-snug text-ink-muted">{description}</span> : null}
    </span>
    <span className="shrink-0 text-right"><span className="block text-[10px] tabular-nums text-ink-muted">{date}</span>{!disabled ? <ChevronRight size={14} className="ml-auto mt-1 text-ink-muted" aria-hidden="true"/> : null}</span>
  </button>;
}
