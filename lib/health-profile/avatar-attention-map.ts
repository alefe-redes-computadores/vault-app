import type { HealthInsight } from "@/lib/health-insights";
import { compareHealthPriority } from "@/lib/health-intelligence/priority";

export type AvatarAttentionRegion = "cabeca" | "torax" | "abdome" | "mobilidade" | "geral";
export type AvatarAttentionItem = {
  region: AvatarAttentionRegion;
  label: string;
  insight: HealthInsight;
  evidenceLabel: "registro" | "projeção" | "associação" | "dado incompleto";
  priorityLabel: "prioritária" | "atenção" | "acompanhar";
};

const labels: Record<AvatarAttentionRegion, string> = {
  cabeca: "Cabeça e bem-estar", torax: "Tórax e respiração", abdome: "Abdome e digestão",
  mobilidade: "Mobilidade", geral: "Contexto geral",
};
const rules: Array<[AvatarAttentionRegion, RegExp]> = [
  ["cabeca", /cabec|enxaqu|tont|sono|humor|ansied|estress|olho|vis[aã]o/i],
  ["torax", /peito|torax|tórax|respira|oxig|card[ií]ac|batimento|press[aã]o/i],
  ["abdome", /abdom|barriga|digest|n[aá]use|intestin|glic|aliment/i],
  ["mobilidade", /perna|bra[cç]o|joelho|ombro|coluna|dor muscular|caminh|mobilidade|cirurg/i],
];

/** Conservative visual index: only declared words choose a region; no clinical inference. */
export function buildAvatarAttentionMap(insights: HealthInsight[]): AvatarAttentionItem[] {
  const used = new Set<AvatarAttentionRegion>();
  return [...insights].sort(compareHealthPriority).flatMap((insight) => {
    const text = `${insight.titulo} ${insight.mensagem} ${insight.acaoSegura || ""}`;
    const region = rules.find(([, rule]) => rule.test(text))?.[0] || "geral";
    if (used.has(region)) return [];
    used.add(region);
    const evidenceLabel: AvatarAttentionItem["evidenceLabel"] = insight.kind === "pattern" ? "associação" : insight.kind === "recommendation" ? "projeção" : insight.kind === "data_quality" ? "dado incompleto" : "registro";
    const priorityLabel: AvatarAttentionItem["priorityLabel"] = insight.urgencia === "alta" || insight.gravidadeSeguranca === "critica" ? "prioritária" : insight.urgencia === "media" ? "atenção" : "acompanhar";
    return [{ region, label: labels[region], insight, evidenceLabel, priorityLabel }];
  }).slice(0, 3);
}
