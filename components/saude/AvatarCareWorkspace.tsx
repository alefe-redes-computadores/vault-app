"use client";

import { memo } from "react";
import { Layers3 } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { CareContinuityAvatarSummary } from "./CareContinuityAvatarSummary";
import { MedicationContinuityAvatarSummary } from "./MedicationContinuityAvatarSummary";
import { AvatarAssociationSummary } from "./AvatarAssociationSummary";
import { AvatarCareReadiness } from "./AvatarCareReadiness";
import { AvatarReadinessCounters } from "./AvatarReadinessCounters";
import { PlannedRealizedBrief } from "./PlannedRealizedBrief";
import { DoseEvidenceBrief } from "./DoseEvidenceBrief";
import { CareAccessBrief } from "./CareAccessBrief";
import { UpcomingDoseAgenda } from "./UpcomingDoseAgenda";
import { PrescriptionPlanningBrief } from "./PrescriptionPlanningBrief";
import { CareFinancialOutlook } from "./CareFinancialOutlook";
import { MedicationPurchaseRhythmBrief } from "./MedicationPurchaseRhythmBrief";
import { ClinicalDisclosure } from "./ClinicalDisclosure";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { BrainFollowUpM102 } from "./BrainFollowUpM102";

export const AvatarCareWorkspace = memo(function AvatarCareWorkspace({ context, command, userId="", topAlert, onNavigate }: {
  context: HealthInsightContext | null | undefined;
  command?: CareCommandSnapshot | null;
  userId?: string; topAlert?: BrainV5Alert | null;
  onNavigate: (href: string) => void;
}) {
  if (!context) return null;
  const secondaryCount = [
    context.tratamentos?.length,
    context.medicamentos?.length,
    context.registrosSaude?.length,
  ].filter(value => Number(value) > 0).length;
  const hasCommandEvidence=Boolean(command?.documents?.items?.length || command?.plan?.items?.length || command?.readiness?.items?.length);

  return <section aria-label="Contexto integrado do Avatar" className="space-y-3">
    <BrainFollowUpM102 alert={topAlert} userId={userId} personId={context.personId} onNavigate={onNavigate}/>
    <AvatarCareReadiness context={context} command={command} onNavigate={onNavigate}/>
    {command?.readiness?.items?.length ? <AvatarReadinessCounters counts={command.readiness.counts}/> : null}
    {(secondaryCount > 0 || hasCommandEvidence) ? <ClinicalDisclosure id="avatar-contexto-evidencias" title="Contexto e evidências do Avatar" description="Cuidado, medicamentos, rotinas e associações registradas" icon={<Layers3 size={16}/> }>
      {() => <AvatarEvidenceWorkspace context={context} command={command} onNavigate={onNavigate}/>}
    </ClinicalDisclosure> : null}
  </section>;
});

const AvatarEvidenceWorkspace = memo(function AvatarEvidenceWorkspace({ context, command, onNavigate }: {
  context: HealthInsightContext;
  command?: CareCommandSnapshot | null;
  onNavigate: (href: string) => void;
}) {
  return <div className="vault-deferred space-y-3.5 [content-visibility:auto] [contain-intrinsic-size:760px]">
    {command?.documents?<CareAccessBrief portfolio={command.documents} onNavigate={onNavigate} compact/>:null}
    <DoseEvidenceBrief context={context} onNavigate={onNavigate} compact/>
    <PlannedRealizedBrief context={context} onNavigate={onNavigate} compact/>
    <UpcomingDoseAgenda context={context} onNavigate={onNavigate} compact/>
    <PrescriptionPlanningBrief context={context} onNavigate={onNavigate} compact/>
    {command?<CareFinancialOutlook command={command} compact/>:null}
    <MedicationPurchaseRhythmBrief context={context} onNavigate={onNavigate}/>
    <CareContinuityAvatarSummary context={context} onNavigate={onNavigate}/>
    <MedicationContinuityAvatarSummary context={context} command={command} onNavigate={onNavigate}/>
    <AvatarAssociationSummary context={context} onNavigate={onNavigate}/>
  </div>;
});
