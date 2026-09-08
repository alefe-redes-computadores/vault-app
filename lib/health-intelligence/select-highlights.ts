// lib/health-intelligence/select-highlights.ts

import type {
  HealthInsight,
} from "@/lib/health-insights";

export type HealthHighlightOptions = {
  limit?: number;
  minimumSample?: number;
};

function normalizeText(
  value: string
) {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function urgencyScore(
  insight:
    HealthInsight
): number {
  switch (
    insight.urgencia
  ) {
    case "alta":
      return 4;

    case "media":
      return 3;

    case "baixa":
      return 2;

    case "nenhuma":
    default:
      return 1;
  }
}

function confidenceScore(
  insight:
    HealthInsight
): number {
  switch (
    insight.confianca
  ) {
    case "alta":
      return 3;

    case "media":
      return 2;

    case "baixa":
    default:
      return 1;
  }
}

function compareInsights(
  a:
    HealthInsight,
  b:
    HealthInsight
): number {
  const urgencyDiff =
    urgencyScore(
      b
    ) -
    urgencyScore(
      a
    );

  if (
    urgencyDiff !==
    0
  ) {
    return urgencyDiff;
  }

  const confidenceDiff =
    confidenceScore(
      b
    ) -
    confidenceScore(
      a
    );

  if (
    confidenceDiff !==
    0
  ) {
    return confidenceDiff;
  }

  if (
    b.amostra !==
    a.amostra
  ) {
    return (
      b.amostra -
      a.amostra
    );
  }

  return a.id.localeCompare(
    b.id
  );
}

export function selectHealthHighlights(
  insights:
    HealthInsight[],

  options:
    HealthHighlightOptions = {}
) {
  const limit =
    options.limit ??
    3;

  const minimumSample =
    options.minimumSample ??
    3;

  const eligible =
    insights
      .filter(
        (
          insight
        ) =>
          insight.kind ===
            "pattern" &&
          Boolean(
            insight.link
          ) &&
          insight.confianca !==
            "baixa" &&
          insight.amostra >=
            minimumSample
      )
      .sort(
        compareInsights
      );

  const semanticKeys =
    new Set<
      string
    >();

  const entityKeys =
    new Set<
      string
    >();

  const unique:
    HealthInsight[] =
    [];

  for (
    const insight of
      eligible
  ) {
    const semanticKey =
      insight.categoria +
      ":" +
      normalizeText(
        insight.titulo
      );

    const entityKey =
      insight.entidadeTipo &&
      insight.entidadeId
        ? insight.entidadeTipo +
          ":" +
          insight.entidadeId
        : "";

    if (
      semanticKeys.has(
        semanticKey
      ) ||
      (
        entityKey &&
        entityKeys.has(
          entityKey
        )
      )
    ) {
      continue;
    }

    semanticKeys.add(
      semanticKey
    );

    if (
      entityKey
    ) {
      entityKeys.add(
        entityKey
      );
    }

    unique.push(
      insight
    );
  }

  const selected:
    HealthInsight[] =
    [];

  const selectedIds =
    new Set<
      string
    >();

  const categories =
    new Set<
      string
    >();

  /*
   * Primeiro tentamos diversidade de categorias.
   */
  for (
    const insight of
      unique
  ) {
    if (
      selected.length >=
      limit
    ) {
      break;
    }

    if (
      categories.has(
        insight.categoria
      )
    ) {
      continue;
    }

    selected.push(
      insight
    );

    selectedIds.add(
      insight.id
    );

    categories.add(
      insight.categoria
    );
  }

  /*
   * Depois completamos as vagas restantes com os
   * melhores padrões disponíveis.
   */
  for (
    const insight of
      unique
  ) {
    if (
      selected.length >=
      limit
    ) {
      break;
    }

    if (
      selectedIds.has(
        insight.id
      )
    ) {
      continue;
    }

    selected.push(
      insight
    );

    selectedIds.add(
      insight.id
    );
  }

  return selected;
}
