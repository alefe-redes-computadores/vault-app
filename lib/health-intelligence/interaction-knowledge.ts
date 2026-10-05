/**
 * BRAIN V5 — Interaction Knowledge boundary.
 * Este registro NÃO infere interação a partir do catálogo ANVISA.
 * Ele documenta somente famílias que possuem regra clínica explícita e fonte
 * regulatória auditada em medication-safety.ts. Novas famílias exigem regra,
 * evidência observável, limitação e fonte revisada antes de emitir alerta.
 */
export const AUDITED_INTERACTION_KNOWLEDGE = [
 {id:"zolpidem-depressor",authority:"FDA / DailyMed",requiresObservedDose:true},
 {id:"opioid-cns-depressor",authority:"FDA / DailyMed",requiresObservedDose:true},
 {id:"lisdexamfetamine-serotonergic",authority:"FDA / DailyMed",requiresObservedDose:true},
] as const;
export const INTERACTION_KNOWLEDGE_POLICY = "closed-audited-rules-only" as const;
