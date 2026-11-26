import {classifyDoseRealization} from '../dose-slot-authority';
/**
 * CI360 P2 / B05.1+B05.3 — proveniência e cobertura de regras de segurança.
 * Somente leitura, sem aplicar uma regra clínica nova e sem converter unidades.
 * A biblioteca de regras já auditadas continua sendo a fonte exclusiva.
 */
import type { HealthInsightContext } from "@/lib/health-insights";
import { AUDITED_INTERACTION_KNOWLEDGE } from "./interaction-knowledge";
import { buildMedicationSafetyCoverage } from "./medication-safety-coverage";
import { dose24hComparisonP6 } from "./dose-24h-visual-p6";

export type BrainSafetyEvidenceItemCI360 = {
  medicationId: string;
  name: string;
  state: "audited_rule" | "identified_only" | "unmapped";
  observedTaken24h: number;
  ruleRefs: ReadonlyArray<{ id: string; authority: string; requiresObservedDose: boolean }>;
};
export type BrainSafetyEvidenceCI360 = {
  state: "ready" | "unavailable";
  reason: string | null;
  asOfISO: string;
  items: readonly BrainSafetyEvidenceItemCI360[];
  audited: number;
  identifiedOnly: number;
  unmapped: number;
  observedTaken24h: number;
  excludedConflicts: number;
  excludedInvalidClocks: number;
  mgComparison: { status: "unavailable"; reason: string };
  provenance: "local_audited_rule_registry";
  note: string;
};

const ZONE_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/;
function exactTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !ZONE_TIMESTAMP.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
function unavailable(asOfISO: string, reason: string): BrainSafetyEvidenceCI360 {
  return {state:"unavailable",reason,asOfISO,items:[],audited:0,identifiedOnly:0,unmapped:0,
    observedTaken24h:0,excludedConflicts:0,excludedInvalidClocks:0,
    mgComparison:{status:"unavailable",reason:"Sem referência oficial e equivalência em mg confirmadas."},
    provenance:"local_audited_rule_registry",note:"Falta de dados não significa ausência de risco."};
}
/**
 * Fonte de dados: snapshot do Brain; uma proteção adicional de conta+pessoa
 * evita mostrar conteúdo de outro titular na troca reativa de perfil.
 * Nenhum marcador nesta saída representa risco individual calculado.
 */
export function buildBrainSafetyEvidenceCI360(
  context: HealthInsightContext | null | undefined,
  asOfISO: string,
): BrainSafetyEvidenceCI360 {
  const now = exactTimestamp(asOfISO);
  if (!context?.userId || !context.personId || now === null) {
    return unavailable(asOfISO,"Sem pessoa ativa ou horário confirmado. Confira o perfil antes da análise.");
  }
  const userId=context.userId, personId=context.personId;
  const seenMedIds=new Set<string>();
  const medicines=context.medicamentos.filter(m=>{
    if (!m.id || m.user_id!==userId || m.person_id!==personId || m.status==="descontinuado" || seenMedIds.has(m.id)) return false;
    seenMedIds.add(m.id);
    return true;
  });
  // Usa o vocabulário e as regras já presentes no aplicativo. Não recataloga substâncias.
  const scoped={...context,medicamentos:medicines};
  const coverage=buildMedicationSafetyCoverage(scoped);
  const counts=new Map<string,number>();
  const seenLogIds=new Set<string>();
  let excludedConflicts=0, excludedInvalidClocks=0;
  let observedTaken24h=0;
  for (const log of context.doseLogs) {
    if (!log.id || seenLogIds.has(log.id) || log.user_id!==userId || log.person_id!==personId ||
        !seenMedIds.has(log.medicamento_id)) continue;
    seenLogIds.add(log.id);
    const evidence=classifyDoseRealization(log);
    if(evidence.state==='conflict'){excludedConflicts++;continue;}
    if(evidence.state==='unknown'){excludedInvalidClocks++;continue;}
    if(evidence.state!=='taken')continue;
    const time=exactTimestamp(evidence.confirmedAt);
    if(time===null){excludedInvalidClocks++;continue;}
    if (time>now || time<now-86_400_000) continue;
    counts.set(log.medicamento_id,(counts.get(log.medicamento_id)||0)+1);
    observedTaken24h++;
  }
  const rules=new Map<string,(typeof AUDITED_INTERACTION_KNOWLEDGE)[number]>(AUDITED_INTERACTION_KNOWLEDGE.map(rule=>[rule.id,rule]));
  const items=coverage.items.map(item=>({
    medicationId:item.medicationId,name:item.name,state:item.state,
    observedTaken24h:counts.get(item.medicationId)||0,
    ruleRefs:item.ruleIds.flatMap(id=>{
      const entry=rules.get(id);
      return entry?[{id:entry.id,authority:entry.authority,requiresObservedDose:entry.requiresObservedDose}]:[];
    }),
  }));
  // NENHUM total em mg é projetado a partir de comprimidos/gotas. O motor P6
  // permanece a única autoridade para um comparador comprovado futuro.
  const comparison=dose24hComparisonP6({});
  return {state:"ready",reason:null,asOfISO,items,audited:coverage.audited,
    identifiedOnly:coverage.identifiedOnly,unmapped:coverage.unmapped,observedTaken24h,
    excludedConflicts,excludedInvalidClocks,
    mgComparison:comparison.status==="unavailable"?comparison:{status:"unavailable",reason:"Referência não recebida nesta visualização."},
    provenance:"local_audited_rule_registry",
    note:"Regra auditada significa cobertura documental do VAULT, não confirmação de interação, dose segura ou risco individual. Tome decisões clínicas com orientação profissional.",
  };
}
