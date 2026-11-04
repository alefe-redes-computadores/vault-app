"use client";

import { ArrowUpRight, CalendarClock, ClipboardList } from "lucide-react";
import type { BrainCarePlanItem } from "@/lib/health-intelligence/care-plan";
import { VaultBrainIdentity } from "./VaultBrainIdentity";
import { VaultBrainEvidence } from "./VaultBrainEvidence";

/** A single explainable next step with no new authority for clinical writes. */
export function BrainNextStep({ decision, onOpen }: { decision: BrainCarePlanItem; onOpen: (href: string) => void }) {
  const urgent = decision.lane === "now";
  const Icon = urgent ? ClipboardList : CalendarClock;
  const date = decision.dueDate?.slice(0, 10).split("-").reverse().join("/");
  const evidenceLabel = decision.evidenceKind === "recorded" ? "Baseado em registro" : decision.evidenceKind === "projected" ? "Projeção, não realização" : decision.evidenceKind === "association" ? "Associação, não causalidade" : "Dados ainda não informados";

  return <section aria-label="Próximo passo do VAULT Brain" className="vault-brain-enter mb-3 overflow-hidden rounded-[20px] border border-violet-400/20 bg-gradient-to-br from-violet-400/[0.08] to-surface">
    <div className="flex items-start gap-3 p-3.5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${urgent ? "bg-rose-400/10 text-rose-300" : "bg-violet-400/10 text-violet-200"}`}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2><VaultBrainIdentity compact context="Próximo passo" /></h2>
        <p className="mt-1 break-words text-sm font-semibold text-ink-primary">{decision.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{decision.reason}</p>
        {date || decision.supplyRoute ? <p className="mt-1 text-[11px] text-ink-faint">{[date, decision.supplyRoute].filter(Boolean).join(" · ")}</p> : null}
        <p className="mt-2 text-[10px] font-semibold text-violet-200" role="note">{evidenceLabel}. Confira a origem antes de registrar o desfecho.</p>
        <button type="button" onClick={() => onOpen(decision.href)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 text-xs font-semibold text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
          Abrir etapa <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
    <VaultBrainEvidence item={decision} />
  </section>;
}
