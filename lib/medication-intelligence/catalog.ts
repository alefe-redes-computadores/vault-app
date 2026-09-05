// lib/medication-intelligence/catalog.ts

import {
  medicationTextSimilarity,
  normalizeMedicationText,
} from "./normalize";

import type {
  MedicationReference,
  MedicationReferenceMatch,
} from "./types";

/**
 * Catálogo local inicial.
 *
 * Mantido intencionalmente vazio.
 *
 * Não vamos embutir regras regulatórias ou apresentações de
 * medicamentos no código sem uma fonte confiável, versionada
 * e atualizável.
 *
 * Futuramente este array poderá receber um pequeno cache
 * controlado ou ser substituído por um provider sincronizado.
 */
export const LOCAL_MEDICATION_CATALOG:
  MedicationReference[] =
    [];

type Candidate = {
  reference:
    MedicationReference;

  matchedBy:
    MedicationReferenceMatch["matchedBy"];

  matchedText: string;

  score: number;
};

function getExactCandidate(
  reference:
    MedicationReference,
  normalizedQuery:
    string
): Candidate | null {
  const canonical =
    normalizeMedicationText(
      reference.canonicalName
    );

  if (
    canonical ===
    normalizedQuery
  ) {
    return {
      reference,
      matchedBy:
        "canonical_name",
      matchedText:
        reference.canonicalName,
      score:
        1,
    };
  }

  for (
    const alias of
      reference.aliases ??
      []
  ) {
    if (
      normalizeMedicationText(
        alias
      ) ===
      normalizedQuery
    ) {
      return {
        reference,
        matchedBy:
          "alias",
        matchedText:
          alias,
        score:
          1,
      };
    }
  }

  if (
    reference.activeIngredient &&
    normalizeMedicationText(
      reference.activeIngredient
    ) ===
      normalizedQuery
  ) {
    return {
      reference,
      matchedBy:
        "active_ingredient",
      matchedText:
        reference.activeIngredient,
      score:
        1,
    };
  }

  return null;
}

export function findMedicationReference(
  name: string,
  catalog:
    readonly MedicationReference[] =
      LOCAL_MEDICATION_CATALOG
): MedicationReferenceMatch | null {
  const normalizedQuery =
    normalizeMedicationText(
      name
    );

  if (
    !normalizedQuery
  ) {
    return null;
  }

  for (
    const reference of
      catalog
  ) {
    const exact =
      getExactCandidate(
        reference,
        normalizedQuery
      );

    if (
      exact
    ) {
      return exact;
    }
  }

  let best:
    Candidate | null =
      null;

  for (
    const reference of
      catalog
  ) {
    const candidates: Array<{
      text: string;
      matchedBy:
        | "canonical_name"
        | "alias"
        | "active_ingredient";
    }> = [
      {
        text:
          reference.canonicalName,

        matchedBy:
          "canonical_name",
      },
    ];

    for (
      const alias of
        reference.aliases ??
        []
    ) {
      candidates.push({
        text:
          alias,

        matchedBy:
          "alias",
      });
    }

    if (
      reference.activeIngredient
    ) {
      candidates.push({
        text:
          reference.activeIngredient,

        matchedBy:
          "active_ingredient",
      });
    }

    for (
      const candidate of
        candidates
    ) {
      const score =
        medicationTextSimilarity(
          normalizedQuery,
          candidate.text
        );

      if (
        !best ||
        score >
          best.score
      ) {
        best = {
          reference,
          matchedBy:
            "similarity",
          matchedText:
            candidate.text,
          score,
        };
      }
    }
  }

  /*
   * Limiar conservador.
   *
   * Nomes curtos precisam de maior similaridade para evitar
   * sugerir medicamentos diferentes como simples erro de digitação.
   */
  const threshold =
    normalizedQuery.length <=
    6
      ? 0.9
      : 0.78;

  if (
    !best ||
    best.score <
      threshold
  ) {
    return null;
  }

  return best;
}
