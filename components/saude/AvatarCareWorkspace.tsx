"use client";

import { ChevronRight, Layers3 } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { CareContinuityAvatarSummary } from "./CareContinuityAvatarSummary";
import { MedicationContinuityAvatarSummary } from "./MedicationContinuityAvatarSummary";
import { TemporaryCourseAvatarSummary } from "./TemporaryCourseAvatarSummary";
import { AvatarAssociationSummary } from "./AvatarAssociationSummary";
import { AvatarCareReadiness } from "./AvatarCareReadiness";
import { PlannedRealizedBrief } from "./PlannedRealizedBrief";
import { DoseEvidenceBrief } from "./DoseEvidenceBrief";

export function AvatarCareWorkspace({ context, command, onNavigate }: {
  context: HealthInsightContext | null | undefined;
  command?: CareCommandSnapshot | null;
  onNavigate: (href: string) => void;
}) {
  if (!context) return null;
  const secondaryCount = [
    context.tratamentos?.length,
    context.medicamentos?.length,
    context.registrosSaude?.length,
  ].filter(value => Number(value) > 0).length;

  return <section aria-label="Contexto integrado do Avatar" className="space-y-2">
    <AvatarCareReadiness context={context} command={command} onNavigate={onNavigate}/>
    {secondaryCount > 0 ? <details className="group rounded-2xl border border-surface-border/70 bg-surface px-3 py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><Layers3 size={16}/></span>
        <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Contexto e evidências do Avatar</strong><span className="mt-0.5 block text-[9px] text-ink-muted">Cuidado, medicamentos, rotinas e associações registradas</span></span>
        <ChevronRight size={14} className="shrink-0 text-ink-muted transition group-open:rotate-90"/>
      </summary>
      <div className="vault-deferred space-y-2 border-t border-surface-border/50 py-3">
        <DoseEvidenceBrief context={context} onNavigate={onNavigate} compact/>
        <PlannedRealizedBrief context={context} onNavigate={onNavigate} compact/>
        <CareContinuityAvatarSummary context={context} onNavigate={onNavigate}/>
        <MedicationContinuityAvatarSummary context={context} command={command} onNavigate={onNavigate}/>
        <TemporaryCourseAvatarSummary context={context} onNavigate={onNavigate}/>
        <AvatarAssociationSummary context={context} onNavigate={onNavigate}/>
      </div>
    </details> : null}
  </section>;
}
