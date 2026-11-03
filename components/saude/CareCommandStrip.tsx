"use client";

import { AlertTriangle, CalendarClock, ArrowUpRight, ChevronRight } from "lucide-react";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { VaultBrainIdentity } from "@/components/health-intelligence/VaultBrainIdentity";
import { VaultBrainEvidence } from "@/components/health-intelligence/VaultBrainEvidence";

const confidenceLabel = { high: "alta", moderate: "moderada", limited: "limitada" } as const;

/** The operational decision is read-only; navigation never marks a dose or acquisition. */
export function CareCommandStrip({ command, onNavigate, insightHref }: {
  insightHref?: string;
  command: CareCommandSnapshot | null;
  onNavigate: (href: string) => void;
}) {
  const action = command?.decision;
  if (!action || (action.lane !== "now" && action.lane !== "prepare")) return null;

  const urgent = action.lane === "now";
  const Icon = urgent ? AlertTriangle : CalendarClock;
  const date = action.dueDate ? action.dueDate.split("-").reverse().join("/") : null;
  const meta = [date, action.supplyRoute, action.relatedCount > 1 ? `${action.relatedCount} etapas relacionadas` : ""].filter(Boolean).join(" · ");

  return <section aria-label="Próxima ação sugerida pelo VAULT Brain" className={`vault-brain-enter overflow-hidden rounded-[18px] border ${urgent ? "border-coral/25 bg-coral/[.055]" : "border-amber-300/20 bg-amber-300/[.045]"}`}>
    <button type="button" onClick={() => onNavigate(action.href)} aria-label={`Abrir próxima etapa: ${action.title}. Confiança ${confidenceLabel[action.confidence]}`}
      className="flex min-h-14 w-full items-center gap-3 rounded-[18px] p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 active:scale-[.985]">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-coral/12 text-coral" : "bg-amber-300/10 text-amber-300"}`}>
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <VaultBrainIdentity compact context={urgent ? "Ação pendente" : "Próximo passo"} />
        <strong className="mt-0.5 block text-xs text-ink-primary">{action.title}</strong>
        <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-ink-muted">{action.reason}</span>
        {meta ? <span className="mt-1 block text-[10px] leading-snug text-ink-muted">{meta}</span> : null}
      </span>
      <ChevronRight size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
    </button>
    <VaultBrainEvidence item={action} compact />
    {insightHref ? <div className="border-t border-surface-border/30 px-3">
      <button type="button" onClick={() => onNavigate(insightHref)} className="inline-flex min-h-10 items-center gap-2 text-[11px] font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
        Ver no Vault Insight <ArrowUpRight size={14} aria-hidden="true" />
      </button>
    </div> : null}
  </section>;
}
