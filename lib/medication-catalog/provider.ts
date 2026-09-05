// lib/medication-catalog/provider.ts

import type {
  MedicationReference,
} from "@/lib/medication-intelligence/types";

import type {
  MedicationCatalogSearchOptions,
  MedicationCatalogSearchResult,
  MedicationCatalogStatus,
} from "./types";

/**
 * Boundary do catálogo de medicamentos.
 *
 * O Medication Intelligence não deve conhecer Supabase,
 * HTTP, Anvisa, IndexedDB ou qualquer outro transporte.
 */
export interface MedicationCatalogProvider {
  /**
   * Procura referências compatíveis com um nome informado.
   */
  search(
    query: string,
    options?: MedicationCatalogSearchOptions
  ): Promise<MedicationCatalogSearchResult[]>;

  /**
   * Obtém uma referência específica quando o ID já é conhecido.
   */
  getById(
    id: string
  ): Promise<MedicationReference | null>;

  /**
   * Retorna informações sobre disponibilidade, versão e fontes.
   */
  getStatus():
    Promise<MedicationCatalogStatus>;
}
