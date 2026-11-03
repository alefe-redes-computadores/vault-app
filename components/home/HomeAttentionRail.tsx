"use client";

import type { ReactNode } from "react";
import { Bell } from "lucide-react";

type IdentifiedAlert = { id: string };
type Props<T extends IdentifiedAlert> = {
  alerts: readonly T[];
  description: string;
  expanded: boolean;
  onToggle: () => void;
  renderAlert: (alert: T) => ReactNode;
};

/** P15 R8: somente apresentação. Prioridade, elegibilidade e destinos vêm da Home. */
export function HomeAttentionRail<T extends IdentifiedAlert>({alerts, description, expanded, onToggle, renderAlert}: Props<T>) {
  if (alerts.length === 0) return null;
  const visible = expanded ? alerts : alerts.slice(0, 1);
  const hidden = Math.max(0, alerts.length - 1);
  return (
    <>
      <div className="flex items-start justify-between gap-3 rounded-[20px] border border-coral/15 bg-gradient-to-r from-coral/[.035] to-surface/45 px-3.5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-coral" aria-hidden="true" />
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink-primary">Atenção</h2>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
        </div>
        <span className="min-w-9 rounded-xl border border-coral/25 bg-coral/10 px-2.5 py-1.5 text-center font-mono text-[12px] font-bold tabular-nums text-coral"
          aria-label={`${alerts.length} alertas registrados`}>
          {alerts.length}
        </span>
      </div>
      <div id="home-attention-alerts" className="space-y-2" aria-label="Alertas ordenados por prioridade">
        {visible.map(alert => (
          <div key={alert.id} className="w-full min-w-0">
            {renderAlert(alert)}
          </div>
        ))}
        {hidden > 0 && (
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls="home-attention-alerts"
            className="flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl border border-surface-border/60 bg-surface-raised/40 px-3 py-2.5 text-xs font-semibold text-ink-primary transition-colors hover:bg-surface-raised/70 motion-reduce:transition-none active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
            {expanded ? "Recolher alertas" : `Ver alertas · +${hidden}`}
          </button>
        )}
      </div>
    </>
  );
}
