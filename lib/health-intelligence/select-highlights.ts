// lib/health-intelligence/select-highlights.ts

import type {
  HealthInsight,
} from "@/lib/health-insights";

export type HealthHighlightOptions = {
  limit?: number;
  minimumSample?: number;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function selectHealthHighlights(
  insights: HealthInsight[],
  options: HealthHighlightOptions = {}
) {
  const limit = options.limit ?? 3;
  const minimumSample =
    options.minimumSample ?? 3;

  const eligible = insights.filter(
    (insight) =>
      Boolean(insight.link) &&
      insight.confianca !== "baixa" &&
      insight.amostra >= minimumSample &&
      insight.categoria !== "estoque" &&
      insight.categoria !== "renovacao" &&
      insight.categoria !== "dados"
  );

  const semanticKeys = new Set<string>();
  const entityKeys = new Set<string>();
  const unique: HealthInsight[] = [];

  for (const insight of eligible) {
    const semanticKey =
      insight.categoria +
      ":" +
      normalizeText(insight.titulo);

    const entityKey =
      insight.entidadeTipo &&
      insight.entidadeId
        ? insight.entidadeTipo +
          ":" +
          insight.entidadeId
        : "";

    if (
      semanticKeys.has(semanticKey) ||
      (
        entityKey &&
        entityKeys.has(entityKey)
      )
    ) {
      continue;
    }

    semanticKeys.add(semanticKey);

    if (entityKey) {
      entityKeys.add(entityKey);
    }

    unique.push(insight);
  }

  const selected: HealthInsight[] = [];
  const selectedIds = new Set<string>();
  const categories = new Set<string>();

  for (const insight of unique) {
    if (selected.length >= limit) break;
    if (categories.has(insight.categoria)) continue;

    selected.push(insight);
    selectedIds.add(insight.id);
    categories.add(insight.categoria);
  }

  for (const insight of unique) {
    if (selected.length >= limit) break;
    if (selectedIds.has(insight.id)) continue;

    selected.push(insight);
    selectedIds.add(insight.id);
  }

  return selected;
}
