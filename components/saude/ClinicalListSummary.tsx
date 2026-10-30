"use client";

import type { LucideIcon } from "lucide-react";

export type ClinicalSummaryMetric = {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "attention" | "critical";
};

const toneClass = {
  neutral: "text-ink-primary",
  positive: "text-emerald-300",
  attention: "text-amber-300",
  critical: "text-coral",
} as const;

export function ClinicalListSummary({ icon: Icon, eyebrow, title, detail, metrics }: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  detail?: string;
  metrics: ClinicalSummaryMetric[];
}) {
  // V302: visual metric grid retains the divide-x divide-surface-border hierarchy.
  const columns = metrics.length === 4 ? "grid-cols-2 sm:grid-cols-4" : metrics.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return <section aria-label={`${eyebrow}: ${title}`} className="overflow-hidden rounded-[18px] border border-surface-border/65 bg-gradient-to-br from-white/[.035] via-surface to-surface shadow-sm">
    <div className="flex min-w-0 items-center gap-3 px-3.5 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-surface-border/60 bg-void/30 text-ice"><Icon size={17}/></span>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-ink-muted">{eyebrow}</p><h2 className="break-words text-sm font-semibold leading-snug text-ink-primary">{title}</h2>{detail ? <p className="mt-1 line-clamp-2 break-words text-xs leading-snug text-ink-muted">{detail}</p> : null}</div>
    </div>
    <div className={`grid ${columns} divide-x divide-surface-border/40 border-t border-surface-border/45 bg-void/15`}>
      {metrics.map((metric)=><div key={metric.label} className="min-w-0 px-3 py-3 sm:px-3.5"><strong className={`block break-all font-mono text-lg font-semibold leading-tight tabular-nums ${toneClass[metric.tone||"neutral"]}`}>{metric.value}</strong><span className="mt-1.5 block break-words text-[11px] font-semibold uppercase leading-snug tracking-[.04em] text-ink-muted">{metric.label}</span></div>)}
    </div>
  </section>;
}
