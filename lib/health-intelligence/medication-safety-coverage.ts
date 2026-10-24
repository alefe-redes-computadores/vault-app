import type { HealthInsightContext } from "@/lib/health-insights";
import { AUDITED_INTERACTION_KNOWLEDGE } from "./interaction-knowledge";

export type MedicationSafetyCoverageState = "audited_rule" | "identified_only" | "unmapped";
export type MedicationSafetyCoverageItem = { medicationId: string; name: string; substance: string | null; state: MedicationSafetyCoverageState; ruleIds: string[] };
export type MedicationSafetyCoverage = { items: MedicationSafetyCoverageItem[]; audited: number; identifiedOnly: number; unmapped: number; total: number; coveragePercent: number | null; note: string };

const VOCABULARY = [
  { substance: "zolpidem", aliases: ["zolpidem"], rules: ["zolpidem-depressor", "zolpidem-dependence-withdrawal"] },
  { substance: "metadona", aliases: ["metadona"], rules: ["opioid-cns-depressor"] },
  { substance: "clonazepam", aliases: ["clonazepam", "rivotril"], rules: ["benzodiazepine-withdrawal"] },
  { substance: "lisdexanfetamina", aliases: ["lisdexanfetamina", "venvanse"], rules: ["lisdexamfetamine-serotonergic"] },
  { substance: "desvenlafaxina", aliases: ["desvenlafaxina", "pristiq"], rules: ["desvenlafaxine-discontinuation"] },
  { substance: "clorpromazina", aliases: ["clorpromazina", "amplictil"], rules: [] },
  { substance: "prometazina", aliases: ["prometazina", "fenergan"], rules: [] },
  { substance: "trazodona", aliases: ["trazodona", "donaren"], rules: [] },
  { substance: "bupropiona", aliases: ["bupropiona", "bup"], rules: [] },
] as const;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Coverage of the closed rule set, not proof that a medication is safe. */
export function buildMedicationSafetyCoverage(context: HealthInsightContext): MedicationSafetyCoverage {
  const allowed = new Set(AUDITED_INTERACTION_KNOWLEDGE.map(rule => rule.id));
  const items = context.medicamentos.filter(med => med.person_id === context.personId && med.status !== "descontinuado" && med.id).map(med => {
    const name = normalize(med.nome);
    const entry = VOCABULARY.find(profile => profile.aliases.some(alias => name === alias || name.startsWith(`${alias} `)));
    const rules = entry ? entry.rules.filter(rule => allowed.has(rule)) : [];
    const state: MedicationSafetyCoverageState = rules.length ? "audited_rule" : entry ? "identified_only" : "unmapped";
    return { medicationId: med.id!, name: med.nome, substance: entry?.substance ?? null, state, ruleIds: [...rules] };
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const audited = items.filter(item => item.state === "audited_rule").length;
  const identifiedOnly = items.filter(item => item.state === "identified_only").length;
  const unmapped = items.filter(item => item.state === "unmapped").length;
  return { items, audited, identifiedOnly, unmapped, total: items.length,
    coveragePercent: items.length ? Math.round(audited / items.length * 100) : null,
    note: "Cobertura significa apenas que existe regra fechada e auditada no Vault. Não confirma ausência de interação, contraindicação ou risco." };
}
