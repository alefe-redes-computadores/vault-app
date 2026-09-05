// lib/medication-intelligence/normalize.ts

import type {
  MedicationNormalizedInput,
  MedicationValidationInput,
} from "./types";

export function normalizeMedicationText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "pt-BR"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

export function normalizeMedicationUnit(
  value: string
): string {
  const normalized =
    normalizeMedicationText(
      value
    )
      .replace(
        /\s+/g,
        ""
      );

  switch (
    normalized
  ) {
    case "micrograma":
    case "microgramas":
    case "mcg":
    case "ug":
      return "mcg";

    case "miligrama":
    case "miligramas":
    case "mg":
      return "mg";

    case "grama":
    case "gramas":
    case "g":
      return "g";

    case "mililitro":
    case "mililitros":
    case "ml":
      return "ml";

    default:
      return normalized;
  }
}

/**
 * Extrai apenas concentrações simples como:
 *
 * 25 mg
 * 0,5 mg
 * 20 ml
 * 50 mcg
 *
 * Expressões complexas, como "10 mg/ml" ou "500 mg + 125 mg",
 * permanecem sem interpretação numérica por enquanto.
 *
 * Isso é proposital para não inventarmos semântica farmacêutica.
 */
export function parseSimpleMedicationDosage(
  value?: string
): {
  value?: number;
  unit?: string;
} {
  if (
    !value
  ) {
    return {};
  }

  const trimmed =
    value.trim();

  const match =
    trimmed.match(
      /^([0-9]+(?:[.,][0-9]+)?)\s*(mcg|ug|mg|g|ml)$/i
    );

  if (
    !match
  ) {
    return {};
  }

  const numeric =
    Number(
      match[1].replace(
        ",",
        "."
      )
    );

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return {};
  }

  return {
    value:
      numeric,

    unit:
      normalizeMedicationUnit(
        match[2]
      ),
  };
}

export function normalizeMedicationInput(
  input:
    MedicationValidationInput
): MedicationNormalizedInput {
  const parsedDosage =
    parseSimpleMedicationDosage(
      input.dosagem
    );

  return {
    originalName:
      input.nome,

    normalizedName:
      normalizeMedicationText(
        input.nome
      ),

    originalDosage:
      input.dosagem,

    dosageValue:
      parsedDosage.value,

    dosageUnit:
      parsedDosage.unit,

    tipoReceita:
      input.tipoReceita,

    formato:
      input.formato,
  };
}

/**
 * Distância de Levenshtein usada somente para detectar
 * possíveis erros de digitação.
 */
export function levenshteinDistance(
  left: string,
  right: string
): number {
  const a =
    normalizeMedicationText(
      left
    );

  const b =
    normalizeMedicationText(
      right
    );

  if (
    a ===
    b
  ) {
    return 0;
  }

  if (
    !a
  ) {
    return b.length;
  }

  if (
    !b
  ) {
    return a.length;
  }

  const previous =
    Array.from(
      {
        length:
          b.length +
          1,
      },
      (
        _,
        index
      ) =>
        index
    );

  const current =
    new Array<number>(
      b.length +
      1
    );

  for (
    let i = 1;
    i <= a.length;
    i += 1
  ) {
    current[0] =
      i;

    for (
      let j = 1;
      j <= b.length;
      j += 1
    ) {
      const substitutionCost =
        a[
          i - 1
        ] ===
        b[
          j - 1
        ]
          ? 0
          : 1;

      current[j] =
        Math.min(
          current[
            j - 1
          ] +
            1,

          previous[
            j
          ] +
            1,

          previous[
            j - 1
          ] +
            substitutionCost
        );
    }

    for (
      let j = 0;
      j <= b.length;
      j += 1
    ) {
      previous[j] =
        current[j];
    }
  }

  return previous[
    b.length
  ];
}

export function medicationTextSimilarity(
  left: string,
  right: string
): number {
  const a =
    normalizeMedicationText(
      left
    );

  const b =
    normalizeMedicationText(
      right
    );

  if (
    !a ||
    !b
  ) {
    return 0;
  }

  const maxLength =
    Math.max(
      a.length,
      b.length
    );

  if (
    maxLength ===
    0
  ) {
    return 1;
  }

  return Math.max(
    0,
    1 -
      levenshteinDistance(
        a,
        b
      ) /
        maxLength
  );
}
