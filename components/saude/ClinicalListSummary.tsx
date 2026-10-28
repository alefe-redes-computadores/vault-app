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
  return <section aria-label={`${eyebrow}: ${title}`} className="overflow-hidden rounded-[18px] border border-surface-border/60 bg-gradient-to-r from-white/[.025] to-surface">
    <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-void/30 text-ink-muted"><Icon size={17}/></span>
      <div className="min-w-0 flex-1"><p className="text-[8px] font-bold uppercase tracking-[.16em] text-ink-faint">{eyebrow}</p><h2 className="break-words text-sm font-semibold leading-snug text-ink-primary">{title}</h2>{detail ? <p className="mt-0.5 line-clamp-2 break-words text-[10px] leading-snug text-ink-muted">{detail}</p> : null}</div>
    </div>
    <div className="grid grid-cols-3 divide-x divide-surface-border/40 border-t border-surface-border/45 bg-void/15">
      {metrics.map((metric)=><div key={metric.label} className="min-w-0 px-2.5 py-2.5 sm:px-3"><strong className={`block break-all font-mono text-base leading-tight ${toneClass[metric.tone||"neutral"]}`}>{metric.value}</strong><span className="mt-1 block break-words text-[9px] font-bold uppercase leading-tight tracking-wide text-ink-faint">{metric.label}</span></div>)}
    </div>
  </section>;
}
