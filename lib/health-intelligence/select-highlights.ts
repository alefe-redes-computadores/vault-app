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
  a: HealthInsight,
  b: HealthInsight
): number {
  const urgencyDiff =
    urgencyScore(b) -
    urgencyScore(a);

  if (urgencyDiff !== 0) {
    return urgencyDiff;
  }

  const confidenceDiff =
    confidenceScore(b) -
    confidenceScore(a);

  if (confidenceDiff !== 0) {
    return confidenceDiff;
  }

  if (b.amostra !== a.amostra) {
    return b.amostra - a.amostra;
  }

  return a.id.localeCompare(b.id);
}

function extractMedicationName(
  insight: HealthInsight
): string {
  const title =
    insight.titulo;

  const patterns = [
    /^A rotina de (.+) tem chegado mais tarde$/,
    /^Horários de (.+) estão fugindo do planejado$/,
    /^(.+): atrasos se repetiram no período$/,
    /^(.+): houve alguns atrasos de horário$/,
    /^O horário de (.+) variou recentemente$/,
    /^(.+): vale observar os próximos horários$/,
  ];

  for (const pattern of patterns) {
    const match =
      title.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "medicamento";
}

function strongestUrgency(
  insights: HealthInsight[]
): HealthInsight["urgencia"] {
  return [...insights]
    .sort(compareInsights)[0]
    ?.urgencia ?? "baixa";
}

function strongestConfidence(
  insights: HealthInsight[]
): HealthInsight["confianca"] {
  return [...insights]
    .sort(
      (a, b) =>
        confidenceScore(b) -
        confidenceScore(a)
    )[0]?.confianca ?? "baixa";
}

function aggregateDelayPatterns(
  eligible: HealthInsight[]
): HealthInsight[] {
  const delayPatterns =
    eligible.filter(
      (insight) =>
        insight.id.startsWith(
          "atraso-real-"
        )
    );

  if (
    delayPatterns.length <
    2
  ) {
    return eligible;
  }

  const names =
    Array.from(
      new Set(
        delayPatterns.map(
          extractMedicationName
        )
      )
    );

  const sample =
    delayPatterns.reduce(
      (total, insight) =>
        total +
        insight.amostra,
      0
    );

  const evidence =
    delayPatterns.flatMap(
      (insight) => {
        const name =
          extractMedicationName(
            insight
          );

        return (
          insight.evidencias ||
          []
        )
          .slice(
            0,
            3
          )
          .map(
            (item) =>
              `${name}: ${item}`
          );
      }
    );

  const aggregate: HealthInsight = {
    id:
      "padrao-horarios-medicamentos",

    kind:
      "pattern",

    categoria:
      "adesao",

    titulo:
      "Sua rotina tem apresentado atrasos de horário",

    mensagem:
      `O Vault encontrou atrasos recorrentes em ${delayPatterns.length} medicamentos no período analisado. Em vez de repetir o mesmo alerta para cada um, este cartão reúne o padrão e mantém os detalhes individuais nas evidências.${names.length > 0 ? ` Medicamentos envolvidos: ${names.join(", ")}.` : ""}`,

    urgencia:
      strongestUrgency(
        delayPatterns
      ),

    confianca:
      strongestConfidence(
        delayPatterns
      ),

    amostra:
      sample,

    periodoDias:
      Math.max(
        ...delayPatterns.map(
          (item) =>
            item.periodoDias ||
            0
        )
      ),

    entidadeTipo:
      "rotina_medicamentos",

    link:
      "/saude/medicamentos",

    evidencias:
      evidence,
  };

  return [
    aggregate,
    ...eligible.filter(
      (insight) =>
        !insight.id.startsWith(
          "atraso-real-"
        )
    ),
  ].sort(
    compareInsights
  );
}

export function selectHealthHighlights(
  insights: HealthInsight[],
  options: HealthHighlightOptions = {}
) {
  const limit =
    options.limit ??
    3;

  const minimumSample =
    options.minimumSample ??
    3;

  const baseEligible =
    insights
      .filter(
        (insight) =>
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

  const eligible =
    aggregateDelayPatterns(
      baseEligible
    );

  const semanticKeys =
    new Set<string>();

  const entityKeys =
    new Set<string>();

  const unique:
    HealthInsight[] =
    [];

  for (const insight of eligible) {
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

    if (entityKey) {
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
    new Set<string>();

  const categories =
    new Set<string>();

  for (const insight of unique) {
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

  for (const insight of unique) {
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
