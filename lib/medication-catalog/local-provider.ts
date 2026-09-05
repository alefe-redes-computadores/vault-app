// lib/medication-catalog/local-provider.ts

import {
  medicationTextSimilarity,
  normalizeMedicationText,
} from "@/lib/medication-intelligence/normalize";

import type {
  MedicationReference,
  MedicationReferenceSource,
} from "@/lib/medication-intelligence/types";

import type {
  MedicationCatalogProvider,
} from "./provider";

import type {
  MedicationCatalogSearchOptions,
  MedicationCatalogSearchResult,
  MedicationCatalogStatus,
  MedicationCatalogVersion,
} from "./types";

export type LocalMedicationCatalogProviderOptions = {
  references?:
    readonly MedicationReference[];

  version?:
    MedicationCatalogVersion | null;
};

export class LocalMedicationCatalogProvider
  implements MedicationCatalogProvider
{
  private readonly references:
    readonly MedicationReference[];

  private readonly version:
    MedicationCatalogVersion | null;

  constructor(
    options:
      LocalMedicationCatalogProviderOptions =
        {}
  ) {
    this.references =
      options.references ??
      [];

    this.version =
      options.version ??
      null;
  }

  async search(
    query: string,
    options:
      MedicationCatalogSearchOptions =
        {}
  ): Promise<MedicationCatalogSearchResult[]> {
    const normalizedQuery =
      normalizeMedicationText(
        query
      );

    if (
      !normalizedQuery
    ) {
      return [];
    }

    const limit =
      Math.max(
        1,
        options.limit ??
          10
      );

    const minimumScore =
      options.minimumScore ??
      (
        normalizedQuery.length <=
        6
          ? 0.9
          : 0.78
      );

    const results:
      MedicationCatalogSearchResult[] =
        [];

    for (
      const reference of
        this.references
    ) {
      const candidates = [
        reference.canonicalName,

        ...(
          reference.aliases ??
          []
        ),

        ...(
          reference.activeIngredients &&
          reference.activeIngredients.length >
            0
            ? reference.activeIngredients
            : reference.activeIngredient
              ? [
                  reference.activeIngredient,
                ]
              : []
        ),
      ];

      let bestScore =
        0;

      let bestText =
        reference.canonicalName;

      for (
        const candidate of
          candidates
      ) {
        const candidateNormalized =
          normalizeMedicationText(
            candidate
          );

        const score =
          candidateNormalized ===
          normalizedQuery
            ? 1
            : medicationTextSimilarity(
                normalizedQuery,
                candidateNormalized
              );

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          bestText =
            candidate;
        }
      }

      if (
        bestScore <
        minimumScore
      ) {
        continue;
      }

      results.push({
        reference,
        score:
          bestScore,
        matchedText:
          bestText,
      });
    }

    return results
      .sort(
        (
          left,
          right
        ) =>
          right.score -
          left.score
      )
      .slice(
        0,
        limit
      );
  }

  async getById(
    id: string
  ): Promise<MedicationReference | null> {
    return (
      this.references.find(
        (
          reference
        ) =>
          reference.id ===
          id
      ) ??
      null
    );
  }

  async getStatus():
    Promise<MedicationCatalogStatus> {
    const sourceMap =
      new Map<
        string,
        MedicationReferenceSource
      >();

    for (
      const reference of
        this.references
    ) {
      for (
        const source of
          reference.sources
      ) {
        sourceMap.set(
          source.id,
          source
        );
      }
    }

    return {
      available:
        this.references.length >
        0,

      version:
        this.version,

      sources:
        Array.from(
          sourceMap.values()
        ),

      referenceCount:
        this.references.length,
    };
  }
}

export const emptyMedicationCatalogProvider =
  new LocalMedicationCatalogProvider();
