"use client";

import type { LucideIcon } from "lucide-react";

type LinkMetric = {
  label: string;
  value: number;
  Icon: LucideIcon;
};

/** M12: read-only projection. Zero counts remain in the expanded empty-state inventory. */
export function TreatmentLinkedMetrics({ items }: { items: readonly LinkMetric[] }) {
  const linked = items.filter(item => Number.isFinite(item.value) && item.value > 0);
  if (!linked.length) return null;
  return (
    <div className="grid grid-cols-2 gap-1.5 border-y border-surface-border/50 bg-void/15 p-2 sm:grid-cols-3"
      aria-label="Vínculos existentes no tratamento">
      {linked.map(({label,value,Icon}) => (
        <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg border border-surface-border/40 bg-surface/60 px-2.5 py-2">
          <Icon size={14} className="shrink-0 text-emerald-300/75" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words text-[10px] font-medium leading-snug text-ink-muted">{label}</span>
          <strong className="shrink-0 font-mono text-sm font-bold tabular-nums text-ink-primary" aria-label={`${value} ${label.toLocaleLowerCase("pt-BR")}`}>{value}</strong>
        </div>
      ))}
    </div>
  );
}
