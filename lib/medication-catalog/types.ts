// lib/medication-catalog/types.ts

import type {
  MedicationReference,
  MedicationReferenceSource,
} from "@/lib/medication-intelligence/types";

export type MedicationCatalogVersion = {
  id: string;

  source:
    string;

  version:
    string;

  publishedAt?: string;

  importedAt:
    string;

  active:
    boolean;
};

export type MedicationCatalogSearchOptions = {
  limit?: number;

  /**
   * Limiar opcional utilizado pelo provider.
   * Cada implementação pode interpretar a similaridade
   * conforme sua própria estratégia.
   */
  minimumScore?: number;
};

export type MedicationCatalogSearchResult = {
  reference:
    MedicationReference;

  score:
    number;

  matchedText:
    string;
};

export type MedicationCatalogStatus = {
  available:
    boolean;

  version:
    MedicationCatalogVersion | null;

  sources:
    MedicationReferenceSource[];

  referenceCount?:
    number;
};
