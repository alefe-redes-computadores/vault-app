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
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-coral" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-ink-primary">Atenção</h2>
          </div>
          <p className="mt-0.5 text-[10px] text-ink-muted">{description}</p>
        </div>
        <span className="rounded-full border border-coral/20 bg-coral/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-coral"
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
            className="flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl border border-surface-border/40 bg-surface/50 px-3 py-2.5 text-[10px] font-semibold text-ice transition-all motion-reduce:transition-none active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
            {expanded ? "Mostrar menos" : `Ver mais ${hidden} alerta${hidden === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    </>
  );
}
