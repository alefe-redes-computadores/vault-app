import type { HealthInsight } from "@/lib/health-insights";

// VAULT_BRAIN_V101: gravidade, urgência e confiança são eixos independentes.
export function healthSeverityRank(i: HealthInsight): number {
  return i.gravidadeSeguranca === "critica" ? 4 : i.gravidadeSeguranca === "importante" ? 3 :
    i.gravidadeSeguranca === "atencao" ? 2 : i.kind === "alert" ? 2 : 1;
}
export function compareHealthPriority(a: HealthInsight, b: HealthInsight): number {
  const urgency = { alta: 3, media: 2, baixa: 1, nenhuma: 0 };
  const confidence = { alta: 3, media: 2, baixa: 1 };
  return healthSeverityRank(b) - healthSeverityRank(a) || urgency[b.urgencia] - urgency[a.urgencia] ||
    confidence[b.confianca] - confidence[a.confianca] || b.amostra - a.amostra || a.id.localeCompare(b.id);
}
export function healthPriorityPresentation(i: HealthInsight) {
  const rank = healthSeverityRank(i);
  if (rank === 4) return { label: "Atenção prioritária", tone: "border-red-400/30 bg-red-400/10 text-red-300" };
  if (rank === 3) return { label: "Atenção importante", tone: "border-coral/30 bg-coral/10 text-coral" };
  if (rank === 2) return { label: "Vale revisar", tone: "border-amber-400/25 bg-amber-400/10 text-amber-300" };
  return { label: i.kind === "data_quality" ? "Revisar dados" : "Observação", tone: "border-violet-400/25 bg-violet-400/10 text-violet-300" };
}
