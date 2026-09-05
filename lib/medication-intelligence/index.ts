// lib/medication-intelligence/index.ts

export {
  findMedicationReference,
  LOCAL_MEDICATION_CATALOG,
} from "./catalog";

export {
  levenshteinDistance,
  medicationTextSimilarity,
  normalizeMedicationInput,
  normalizeMedicationText,
  normalizeMedicationUnit,
  parseSimpleMedicationDosage,
} from "./normalize";

export {
  validateMedication,
  validateMedicationWithProvider,
} from "./validate";

export type {
  MedicationNormalizedInput,
  MedicationPresentation,
  MedicationReference,
  MedicationReferenceMatch,
  MedicationReferenceSource,
  MedicationValidationConfidence,
  MedicationValidationField,
  MedicationValidationInput,
  MedicationValidationIssue,
  MedicationValidationIssueCode,
  MedicationValidationResult,
  MedicationValidationSeverity,
} from "./types";
