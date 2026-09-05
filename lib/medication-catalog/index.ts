// lib/medication-catalog/index.ts

export {
  emptyMedicationCatalogProvider,
  LocalMedicationCatalogProvider,
} from "./local-provider";

export {
  supabaseMedicationCatalogProvider,
  SupabaseMedicationCatalogProvider,
} from "./supabase-provider";

export {
  isMedicationRegulatoryRuleActive,
} from "./regulatory";

export type {
  MedicationCatalogProvider,
} from "./provider";

export type {
  MedicationRegulatoryRule,
} from "./regulatory";

export type {
  MedicationCatalogSearchOptions,
  MedicationCatalogSearchResult,
  MedicationCatalogStatus,
  MedicationCatalogVersion,
} from "./types";
