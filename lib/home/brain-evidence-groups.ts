import type { HealthInsight } from "@/lib/health-insights";

/** M133: agrupamento APENAS visual, por ID clínico real (nunca por semelhança de nomes).
 * Não deduplica, reclassifica, filtra nem modifica qualquer sinal original. */
export type HomeBrainEvidenceGroup = {
  key: string;
  insights: HealthInsight[];
};

export function groupHomeBrainEvidence(insights: readonly HealthInsight[]): HomeBrainEvidenceGroup[] {
  const groups: HomeBrainEvidenceGroup[] = [];
  const byMedication = new Map<string, HomeBrainEvidenceGroup>();

  for (const insight of insights) {
    const medicationId = insight.entidadeTipo === "medicamento" &&
      typeof insight.entidadeId === "string" && insight.entidadeId.trim()
      ? insight.entidadeId.trim() : null;
    if (!medicationId) {
      // Sinais sem identidade clínica verificada ficam individuais.
      groups.push({ key: `insight:${insight.id}`, insights: [insight] });
      continue;
    }
    let group = byMedication.get(medicationId);
    if (!group) {
      group = { key: `medication:${medicationId}`, insights: [] };
      byMedication.set(medicationId, group);
      groups.push(group);
    }
    group.insights.push(insight);
  }
  return groups;
}

export function homeBrainSeverityRank(insight: HealthInsight): number {
  return insight.gravidadeSeguranca === "critica" ? 4 :
    insight.gravidadeSeguranca === "importante" ? 3 :
    insight.gravidadeSeguranca === "atencao" ? 2 :
    insight.kind === "alert" ? 2 : 1;
}

export function highestHomeBrainSeverity(insights: readonly HealthInsight[]): HealthInsight | null {
  return insights.reduce<HealthInsight | null>((top, item) =>
    !top || homeBrainSeverityRank(item) > homeBrainSeverityRank(top) ? item : top, null);
}
